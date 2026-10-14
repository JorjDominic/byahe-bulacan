import { getCoordinates, getLocationFields } from "./coordinates";

test.each([
  [{ lat: "14.856", lng: "120.811" }, { lat: 14.856, lng: 120.811 }],
  [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }],
  [{ lat: -90, lng: 180 }, { lat: -90, lng: 180 }],
  [{ lat: "", lng: "" }, null],
  [{ lat: null, lng: null }, null],
  [{ lat: 14.8 }, null],
  [{ lat: "14.8junk", lng: 120.8 }, null],
  [{ lat: 91, lng: 120 }, null],
  [{ lat: 14, lng: -181 }, null],
  [{ lat: Infinity, lng: 120 }, null],
  [{ lat: false, lng: [] }, null],
])("validates coordinates %j", (input, expected) => {
  expect(getCoordinates(input)).toEqual(expected);
});

test("unknown locations are not assigned default coordinates", () => {
  expect(getLocationFields({ lat: "", lng: "" })).toMatchObject({ lat: null, lng: null, locationVerified: false });
});

test("normalizes location metadata and preserves explicit confirmation", () => {
  expect(getLocationFields({ lat: "0", lng: "120.8", locationVerified: true, locationType: "entrance", locationLabel: " Main gate " })).toEqual({ lat: 0, lng: 120.8, locationVerified: true, locationType: "entrance", locationLabel: "Main gate" });
  expect(getLocationFields({ lat: 14, lng: 120, locationVerified: "true" }).locationVerified).toBe(false);
});

test.each([{ lat: "14.8", lng: "" }, { lat: "oops", lng: 120 }, { lat: 91, lng: 120 }, { locationVerified: true }])("rejects invalid or falsely confirmed locations %j", (input) => {
  expect(() => getLocationFields(input)).toThrow();
});
