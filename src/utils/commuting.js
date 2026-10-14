import { getCoordinates } from "./coordinates";
import { getTodayPH } from "../hooks/useItinerary";

export const TRANSPORT_MODES = { jeepney: "Jeepney", bus: "Bus", tricycle: "Tricycle", van: "Van / UV Express", train: "Train", walk: "Walk", other: "Other transport" };
export const emptyCommuteStep = () => ({ mode: "jeepney", instruction: "", signboard: "", boardAt: "", alightAt: "", landmark: "", lat: "", lng: "" });

export function normalizeCommuteGuide(input, publish = false) {
  const text = (value) => typeof value === "string" ? value.trim() : "";
  const spotId = text(input.spotId);
  const originLabel = text(input.originLabel);
  if (!spotId || !originLabel) throw new Error("Choose a destination and enter a starting hub.");
  const steps = (Array.isArray(input.steps) ? input.steps : []).map((step) => {
    const position = getCoordinates(step);
    const filled = (value) => value != null && String(value).trim() !== "";
    if (!position && (filled(step.lat) || filled(step.lng))) throw new Error("Step pins need valid latitude and longitude, or both fields blank.");
    return {
      mode: TRANSPORT_MODES[step.mode] ? step.mode : "other",
      instruction: text(step.instruction), signboard: text(step.signboard),
      boardAt: text(step.boardAt), alightAt: text(step.alightAt), landmark: text(step.landmark),
      lat: position?.lat ?? null, lng: position?.lng ?? null,
    };
  });
  if (steps.length > 20) throw new Error("A guide can have at most 20 steps.");
  const amount = (value) => {
    if (value == null || String(value).trim() === "") return null;
    const result = Number(value);
    if (!Number.isFinite(result) || result < 0) throw new Error("Fare estimates must be non-negative numbers.");
    return result;
  };
  const fareMin = amount(input.fareMin);
  const fareMax = amount(input.fareMax);
  if ((fareMin === null) !== (fareMax === null) || (fareMin !== null && fareMax < fareMin)) throw new Error("Enter both fare estimates with the maximum at least the minimum, or leave both blank.");
  const source = text(input.source);
  const lastVerifiedDate = text(input.lastVerifiedDate);
  const arrivalInstructions = text(input.arrivalInstructions);
  if (publish) {
    if (input.verified !== true || !source || !arrivalInstructions || !steps.length) throw new Error("Publishing requires verified steps, final arrival instructions, and a source.");
    const parsedDate = new Date(lastVerifiedDate + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastVerifiedDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== lastVerifiedDate || lastVerifiedDate > getTodayPH()) throw new Error("Enter a valid verification date that is not in the future.");
    if (steps.some((step) => !step.instruction || (step.mode !== "walk" && (!step.signboard || !step.boardAt || !step.alightAt)))) throw new Error("Every step needs instructions. Transport steps also need a vehicle/route signboard, boarding point, and alighting point.");
  }
  return { spotId, originLabel, steps, arrivalInstructions, fareMin, fareMax,
    durationEstimate: text(input.durationEstimate), source, lastVerifiedDate,
    status: publish ? "published" : "draft", verified: publish,
  };
}

export function guideNeedsReview(date) {
  const verified = new Date(date + "T00:00:00Z").getTime();
  const today = new Date(getTodayPH() + "T00:00:00Z").getTime();
  return !Number.isFinite(verified) || today - verified > 90 * 86400000;
}
