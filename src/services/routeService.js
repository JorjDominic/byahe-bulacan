import { loadGoogleMaps } from "./googleMaps";
import { getCoordinates } from "../utils/coordinates";

export async function computeRoute({ origin, destination, travelMode }) {
  const start = typeof origin === "string" ? origin.trim() : getCoordinates(origin);
  const end = getCoordinates(destination);
  if (!start) throw new Error("Choose your current location or enter a starting address.");
  if (!end) throw new Error("This destination does not have an exact location yet.");
  if (!["DRIVING", "WALKING", "TRANSIT"].includes(travelMode)) throw new Error("Choose a supported travel mode.");
  let timeout;
  try {
    const request = (async () => {
      const maps = await loadGoogleMaps();
      const { Route } = await maps.importLibrary("routes");
      const result = await Route.computeRoutes({
        origin: start, destination: end, travelMode,
        fields: ["path", "distanceMeters", "durationMillis", "localizedValues", "legs", "warnings"],
        ...(travelMode === "DRIVING" ? { routingPreference: "TRAFFIC_UNAWARE" } : {}),
      });
      if (!result.routes?.length) throw new Error(travelMode === "TRANSIT"
        ? "No transit route was found. Check the local commuting guides below."
        : "No route was found. Try a more specific starting address or another travel mode.");
      return result.routes[0];
    })();
    return await Promise.race([request, new Promise((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("The route request timed out. Please try again.")), 25000);
    })]);
  } catch (error) {
    // Keep actionable app messages; do not expose provider diagnostics or keys.
    if (/^(Choose |This destination|No (transit )?route|The route request|Maps are|The map |Unable to load)/.test(error.message)) throw error;
    throw new Error("Directions are temporarily unavailable. Check your connection and try again.");
  } finally { clearTimeout(timeout); }
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "Distance unavailable";
  return meters < 1000 ? Math.round(meters) + " m" : (meters / 1000).toFixed(1) + " km";
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "Time unavailable";
  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  return minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " hr " + (minutes % 60) + " min";
}
