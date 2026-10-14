import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TravelPlanner from "./TravelPlanner";
import { computeRoute } from "../services/routeService";
jest.mock("./DestinationMap", () => () => <div>Embedded map</div>);
jest.mock("./CommuteHelper", () => () => <div>Local commuting guides</div>);
jest.mock("../services/routeService", () => ({ computeRoute: jest.fn(), formatDistance: () => "2 km", formatDuration: () => "10 min" }));
const locations = [{ id: "test", name: "Test spot", lat: 14.85, lng: 120.81 }, { id: "second", name: "Second spot", lat: 15, lng: 121 }];
const route = { distanceMeters: 2000, durationMillis: 600000, legs: [{ steps: [{ instructions: "Turn left at the landmark.", distanceMeters: 100 }] }], warnings: ["Confirm the entrance location."] };

test("manual addresses produce an in-system route summary, instructions and warnings", async () => {
  computeRoute.mockResolvedValue(route);
  render(<TravelPlanner locations={locations} />);
  fireEvent.change(screen.getByLabelText("Starting address or landmark"), { target: { value: "Test hub, Bulacan" } });
  fireEvent.click(screen.getByRole("button", { name: "Show route" }));
  expect(await screen.findByText("Turn left at the landmark.")).toBeInTheDocument();
  expect(screen.getByText("Confirm the entrance location.")).toBeInTheDocument();
  expect(computeRoute).toHaveBeenCalledWith({ origin: "Test hub, Bulacan", destination: locations[0], travelMode: "DRIVING" });
});
test("changing destinations discards a late route response", async () => {
  let resolve;
  computeRoute.mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<TravelPlanner locations={locations} />);
  fireEvent.change(screen.getByLabelText("Starting address or landmark"), { target: { value: "Test hub" } });
  fireEvent.click(screen.getByRole("button", { name: "Show route" }));
  fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "second" } });
  await act(async () => { resolve(route); });
  expect(screen.queryByText("Turn left at the landmark.")).not.toBeInTheDocument();
});
test("location denial offers a manual starting-point alternative", async () => {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: jest.fn((success, failure) => failure({ code: 1 })) } });
  render(<TravelPlanner locations={locations} />);
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Enter a starting address instead");
});
test("commute mode keeps local guides available when transit fails", async () => {
  computeRoute.mockRejectedValue(new Error("No transit route was found."));
  render(<TravelPlanner locations={locations} />);
  fireEvent.click(screen.getByRole("button", { name: "Commute" }));
  fireEvent.change(screen.getByLabelText("Starting address or landmark"), { target: { value: "Test hub" } });
  fireEvent.click(screen.getByRole("button", { name: "Find transit route" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No transit route"));
  expect(screen.getByText("Local commuting guides")).toBeInTheDocument();
});
test("previous itinerary stop can be used as a route origin", async () => {
  computeRoute.mockResolvedValue(route);
  render(<TravelPlanner locations={locations} selectedId="second" />);
  fireEvent.click(screen.getByRole("button", { name: "Start from previous stop" }));
  fireEvent.click(screen.getByRole("button", { name: "Show route" }));
  await waitFor(() => expect(computeRoute).toHaveBeenCalledWith({ origin: { lat: 14.85, lng: 120.81 }, destination: locations[1], travelMode: "DRIVING" }));
});
