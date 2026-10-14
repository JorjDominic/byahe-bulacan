import { computeRoute } from "./routeService";
import { loadGoogleMaps } from "./googleMaps";
jest.mock("./googleMaps", () => ({ loadGoogleMaps: jest.fn() }));
let compute;
const destination = { lat: 14.856, lng: 120.811 };
beforeEach(() => {
  compute = jest.fn(async () => ({ routes: [{ path: [], legs: [] }] }));
  loadGoogleMaps.mockResolvedValue({ importLibrary: jest.fn(async () => ({ Route: { computeRoutes: compute } })) });
});

test.each(["DRIVING", "WALKING", "TRANSIT"])("requests %s routes using coordinates and the needed fields", async (travelMode) => {
  await computeRoute({ origin: { lat: 0, lng: 120 }, destination, travelMode });
  expect(compute).toHaveBeenCalledWith(expect.objectContaining({ origin: { lat: 0, lng: 120 }, destination, travelMode, fields: expect.arrayContaining(["path", "legs", "warnings"]) }));
  if (travelMode !== "DRIVING") expect(compute.mock.calls[0][0]).not.toHaveProperty("routingPreference");
});
test("accepts a manual origin address without requesting separate geocoding", async () => {
  await computeRoute({ origin: "  Test terminal, Bulacan  ", destination, travelMode: "WALKING" });
  expect(compute.mock.calls[0][0].origin).toBe("Test terminal, Bulacan");
});
test("missing origins and invalid destinations are rejected before contacting Google", async () => {
  await expect(computeRoute({ origin: " ", destination, travelMode: "DRIVING" })).rejects.toThrow("starting address");
  await expect(computeRoute({ origin: "Test hub", destination: { lat: null, lng: null }, travelMode: "DRIVING" })).rejects.toThrow("exact location");
  expect(loadGoogleMaps).not.toHaveBeenCalled();
});
test("transit with no results directs the user to local guides", async () => {
  compute.mockResolvedValue({ routes: [] });
  await expect(computeRoute({ origin: "Test hub", destination, travelMode: "TRANSIT" })).rejects.toThrow("local commuting guides");
});
test("provider diagnostics are not exposed in the UI", async () => {
  compute.mockRejectedValue(new Error("API_KEY_INVALID secret-provider-detail"));
  await expect(computeRoute({ origin: "Test hub", destination, travelMode: "DRIVING" })).rejects.toThrow("temporarily unavailable");
});

test("a stuck route request terminates with a timeout", async () => {
  jest.useFakeTimers();
  try {
    compute.mockReturnValue(new Promise(() => {}));
    const result = computeRoute({ origin: "Test hub", destination, travelMode: "DRIVING" });
    const rejection = expect(result).rejects.toThrow("timed out");
    jest.advanceTimersByTime(25000);
    await rejection;
  } finally { jest.useRealTimers(); }
});
