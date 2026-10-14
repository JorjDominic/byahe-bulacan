function coordinateNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getCoordinates(location) {
  const lat = coordinateNumber(location?.lat);
  const lng = coordinateNumber(location?.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function getLocationFields(data) {
  const blank = (value) => value == null || (typeof value === "string" && !value.trim());
  const position = getCoordinates(data);
  if (!position && !(blank(data.lat) && blank(data.lng))) {
    throw new Error("Enter a valid latitude (-90 to 90) and longitude (-180 to 180), or clear both fields.");
  }
  if (!position && data.locationVerified) {
    throw new Error("Choose a location before confirming the pin.");
  }
  const types = ["entrance", "parking", "dropoff", "destination"];
  return {
    lat: position?.lat ?? null,
    lng: position?.lng ?? null,
    locationType: types.includes(data.locationType) ? data.locationType : "destination",
    locationLabel: typeof data.locationLabel === "string" ? data.locationLabel.trim() : "",
    locationVerified: !!position && data.locationVerified === true,
  };
}

export const LOCATION_TYPES = {
  entrance: "Visitor entrance",
  parking: "Parking area",
  dropoff: "Drop-off point",
  destination: "Destination location",
};
