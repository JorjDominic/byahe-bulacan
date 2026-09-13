// src/hooks/useItinerary.js
// Returns itinerary data for a SPECIFIC date.
// Pass a date string "2026-04-21" to get that day's trip.

import { useApp } from "../context/AppContext";

export function useItinerary(date) {
  const {
    itineraries,
    itineraryDates,
    addToItinerary,
    removeFromItinerary,
    updateStopTime,
    updateItineraryMeta,
    deleteItinerary,
    getItinerary,
  } = useApp();

  // Get specific date's itinerary or empty default
  const itin       = date ? getItinerary(date) : { name: "", spots: [], status: "planning", minGap: 3 };
  const spots      = itin.spots      ?? [];
  const name       = itin.name       ?? "Bulacan Trip";
  const status     = itin.status     ?? "planning";
  const minGap     = itin.minGap     ?? 3;
  const totalFee   = spots.reduce((sum, s) => sum + (s.feeNum ?? 0), 0);
  const count      = spots.length;

  // ─── Check if spot is already in ANY itinerary ────────
  const isInAnyItinerary = (spotId) => {
    return Object.values(itineraries).some((itin) =>
      itin.spots?.some((s) => s.id === spotId)
    );
  };

  // ─── Check if spot is in THIS date's itinerary ────────
  const isInItinerary = (spotId) => {
    return spots.some((s) => s.id === spotId);
  };

  // ─── Check time conflict for this date ────────────────
  const hasTimeConflict = (newTime, excludeSpotId = null, gapHrs = minGap) => {
    const newMins    = timeToMinutes(newTime);
    const gapMins    = gapHrs * 60;
    const otherSpots = spots.filter((s) => s.id !== excludeSpotId);

    for (const s of otherSpots) {
      if (Math.abs(newMins - timeToMinutes(s.time)) < gapMins) {
        return { conflict: true, conflictWith: s };
      }
    }
    return { conflict: false };
  };

  // ─── Get next suggested time ──────────────────────────
  const getNextSuggestedTime = (gapHrs = minGap) => {
    if (spots.length === 0) return "9:00 AM";
    const lastMins  = Math.max(...spots.map((s) => timeToMinutes(s.time)));
    const suggested = lastMins + gapHrs * 60;
    if (suggested > 18 * 60) return null;
    return minutesToTime(suggested);
  };

  // ─── Get available times for this date ────────────────
  const getAvailableTimes = (excludeSpotId = null, gapHrs = minGap) => {
    const ALL_TIMES = [
      "7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
      "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM",
      "5:00 PM","6:00 PM",
    ];

    const todayPH    = getTodayPH();
    const isToday    = date === todayPH;
    const ph         = getPHTime();
    const curMins    = ph.getHours() * 60 + ph.getMinutes();
    const gapMins    = gapHrs * 60;
    const takenMins  = spots
      .filter((s) => s.id !== excludeSpotId)
      .map((s) => timeToMinutes(s.time));

    return ALL_TIMES.filter((t) => {
      const mins = timeToMinutes(t);
      if (isToday && mins <= curMins) return false;
      for (const taken of takenMins) {
        if (Math.abs(mins - taken) < gapMins) return false;
      }
      return true;
    });
  };

  // ─── All itinerary dates summary ─────────────────────
  const allTrips = itineraryDates.map((d) => {
    const t = getItinerary(d);
    return {
      date:     d,
      name:     t.name,
      count:    t.spots?.length ?? 0,
      totalFee: t.spots?.reduce((sum, s) => sum + (s.feeNum ?? 0), 0) ?? 0,
      status:   getTripStatus(d, t.status === "done"),
    };
  });

  return {
    // Current date's data
    spots,
    name,
    status,
    minGap,
    totalFee,
    count,

    // Checks
    isInItinerary,
    isInAnyItinerary,
    hasTimeConflict,

    // Time helpers
    getAvailableTimes,
    getNextSuggestedTime,

    // Actions
    addToItinerary:      (spot)           => addToItinerary(date, spot),
    removeFromItinerary: (spotId)         => removeFromItinerary(date, spotId),
    updateStopTime:      (spotId, time)   => updateStopTime(date, spotId, time),
    updateMeta:          (meta)           => updateItineraryMeta(date, meta),
    deleteItinerary:     ()               => deleteItinerary(date),

    // All trips
    allTrips,
  };
}

// ─── Time helpers ─────────────────────────────────────────
export function getPHTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

export function getTodayPH() {
  const ph = getPHTime();
  return ph.getFullYear() + "-" +
    String(ph.getMonth() + 1).padStart(2, "0") + "-" +
    String(ph.getDate()).padStart(2, "0");
}

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(" ");
  const [h, m]         = time.split(":");
  let hour24           = parseInt(h);
  if (period === "PM" && hour24 !== 12) hour24 += 12;
  if (period === "AM" && hour24 === 12) hour24  = 0;
  return hour24 * 60 + parseInt(m || "0");
}

export function minutesToTime(minutes) {
  if (minutes > 18 * 60) return null;
  const h      = Math.floor(minutes / 60);
  const m      = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return hour12 + ":" + String(m).padStart(2, "0") + " " + period;
}

export function getTripStatus(date, manualDone = false) {
  if (manualDone) return "done";
  if (!date)      return "planning";
  const todayPH = getTodayPH();
  if (date === todayPH) return "today";
  if (date  <  todayPH) return "done";
  return "planning";
}