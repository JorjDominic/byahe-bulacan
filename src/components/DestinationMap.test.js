import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DestinationMap from "./DestinationMap";
import { loadGoogleMaps, subscribeToMapsErrors } from "../services/googleMaps";

jest.mock("../services/googleMaps", () => ({ loadGoogleMaps: jest.fn(), subscribeToMapsErrors: jest.fn() }));

let maps;
let markers;
let map;
let info;
let mapHandlers;
let removeListener;
const destination = { id: "church", name: "Test Church", lat: 14.856, lng: 120.811 };

beforeEach(() => {
  jest.clearAllMocks();
  markers = [];
  mapHandlers = {};
  removeListener = jest.fn();
  map = {
    setCenter: jest.fn(), setZoom: jest.fn(), fitBounds: jest.fn(),
    addListener: jest.fn((name, callback) => { mapHandlers[name] = callback; return { remove: removeListener }; }),
  };
  info = { setContent: jest.fn(), open: jest.fn(), close: jest.fn() };
  const MapConstructor = jest.fn(() => map);
  const AdvancedMarkerElement = jest.fn(function(options) {
    Object.assign(this, options);
    this.handlers = {};
    this.addListener = jest.fn((name, callback) => { this.handlers[name] = callback; return { remove: removeListener }; });
    markers.push(this);
  });
  maps = {
    importLibrary: jest.fn(async (library) => library === "maps" ? { Map: MapConstructor } : { AdvancedMarkerElement }),
    LatLngBounds: jest.fn(function() { this.extend = jest.fn(); }),
    InfoWindow: jest.fn(() => info),
  };
  loadGoogleMaps.mockResolvedValue(maps);
  subscribeToMapsErrors.mockReturnValue(jest.fn());
});

test("unknown coordinates show an empty state and never load Google", () => {
  render(<DestinationMap locations={[{ name: "Unknown spot", lat: "", lng: null }]} />);
  expect(screen.getByText(/exact location has not been added/i)).toBeInTheDocument();
  expect(loadGoogleMaps).not.toHaveBeenCalled();
});

test("shows valid destination pins, focuses selected stops, and keeps content safe", async () => {
  const dangerousName = "<script>bad()</script>";
  const locations = [destination, { id: "park", name: dangerousName, lat: 15, lng: 121 }, { id: "unknown", name: "Unknown" }];
  const onSelect = jest.fn();
  const { rerender } = render(<DestinationMap locations={locations} onSelect={onSelect} />);
  await waitFor(() => expect(markers).toHaveLength(2));
  expect(map.fitBounds).toHaveBeenCalled();
  act(() => markers[1].handlers.click());
  expect(onSelect).toHaveBeenCalledWith("park");
  const content = info.setContent.mock.calls[0][0];
  expect(content.textContent).toContain(dangerousName);
  expect(content.querySelector("script")).toBeNull();
  rerender(<DestinationMap locations={locations} selectedId="park" onSelect={onSelect} />);
  await waitFor(() => expect(map.setCenter).toHaveBeenCalledWith({ lat: 15, lng: 121 }));
  expect(info.open).toHaveBeenCalledTimes(2);
});

test("admin can choose a pin by map click and drag, with listeners cleaned on unmount", async () => {
  const onLocationChange = jest.fn();
  const { unmount } = render(<DestinationMap editable locations={[destination]} onLocationChange={onLocationChange} />);
  await waitFor(() => expect(markers).toHaveLength(1));
  act(() => mapHandlers.click({ latLng: { toJSON: () => ({ lat: 14.9, lng: 120.9 }) } }));
  expect(onLocationChange).toHaveBeenCalledWith({ lat: 14.9, lng: 120.9 });
  expect(markers[0].gmpDraggable).toBe(true);
  markers[0].position = { lat: 15, lng: 121 };
  act(() => markers[0].handlers.dragend());
  expect(onLocationChange).toHaveBeenCalledWith({ lat: 15, lng: 121 });
  unmount();
  expect(markers[0].map).toBeNull();
  expect(removeListener).toHaveBeenCalledTimes(2);
});

test("loading failure is displayed without breaking the destination page", async () => {
  loadGoogleMaps.mockRejectedValueOnce(new Error("Unable to load the map."));
  render(<DestinationMap locations={[destination]} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load the map.");
});

test("late authentication failures replace the map with an error", async () => {
  render(<DestinationMap locations={[destination]} />);
  await waitFor(() => expect(markers).toHaveLength(1));
  act(() => subscribeToMapsErrors.mock.calls[0][0](new Error("Map temporarily unavailable.")));
  expect(screen.getByRole("alert")).toHaveTextContent("Map temporarily unavailable.");
  expect(markers[0].map).toBeNull();
});

test("recenter restores the destination after panning", async () => {
  render(<DestinationMap locations={[destination]} />);
  await waitFor(() => expect(markers).toHaveLength(1));
  map.setCenter.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Show all pins" }));
  expect(map.setCenter).toHaveBeenCalledWith({ lat: 14.856, lng: 120.811 });
});

test("routes draw in the embedded map and their overlays are removed when cleared", async () => {
  const polyline = { setMap: jest.fn() };
  const route = { path: [{ lat: 14.8, lng: 120.8 }, { lat: 14.856, lng: 120.811 }], createPolylines: () => [polyline] };
  const { rerender } = render(<DestinationMap locations={[destination]} route={route} />);
  await waitFor(() => expect(polyline.setMap).toHaveBeenCalledWith(map));
  expect(screen.getByRole("button", { name: "Show route" })).toBeInTheDocument();
  expect(markers).toHaveLength(2);
  rerender(<DestinationMap locations={[destination]} route={null} />);
  await waitFor(() => expect(polyline.setMap).toHaveBeenCalledWith(null));
  expect(markers[1].map).toBeNull();
});
