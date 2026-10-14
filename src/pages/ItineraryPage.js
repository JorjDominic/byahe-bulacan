import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import ROUTES from "../constants/routes";
import TravelPlanner from "../components/TravelPlanner";
import { getCoordinates } from "../utils/coordinates";
import { saveItinerary, addPost, addReview } from "../services/spotService";

// 1. Import all necessary SVG Icons from lucide-react!
import { 
  Calendar, Trash2, Edit2, MapPin, Map, Clock, Wallet, 
  Navigation, Star, Camera, FileText, CheckCircle, 
  Sparkles, ClipboardList, Lightbulb, CalendarPlus, 
  Image as ImageIcon, Send, X, Save
} from "lucide-react";

// ─── PH Time helpers ──────────────────────────────────────
function getPHTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function getTodayPH() {
  const ph = getPHTime();
  return ph.getFullYear() + "-" +
    String(ph.getMonth() + 1).padStart(2, "0") + "-" +
    String(ph.getDate()).padStart(2, "0");
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [time, period] = timeStr.split(" ");
  const [h, m]         = time.split(":");
  let hour24           = parseInt(h);
  if (period === "PM" && hour24 !== 12) hour24 += 12;
  if (period === "AM" && hour24 === 12) hour24  = 0;
  return hour24 * 60 + parseInt(m);
}

function minutesToTime(minutes) {
  const h      = Math.floor(minutes / 60);
  const m      = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return hour12 + ":" + String(m).padStart(2, "0") + " " + period;
}

const ALL_TIMES = [
  "7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM",
  "5:00 PM","6:00 PM",
];

function getAvailableTimes(tripDate, existingStops, currentStopId = null, minGapHrs = 3) {
  const ph         = getPHTime();
  const todayPH    = getTodayPH();
  const isToday    = tripDate === todayPH;
  const curMins    = ph.getHours() * 60 + ph.getMinutes();
  const minGapMins = minGapHrs * 60;
  
  const takenMins  = existingStops
    .filter((s) => s.id !== currentStopId)
    .map((s) => timeToMinutes(s.time));

  return ALL_TIMES.filter((t) => {
    const mins = timeToMinutes(t);
    if (isToday && mins <= curMins) return false;
    for (const taken of takenMins) {
      if (Math.abs(mins - taken) < minGapMins) return false;
    }
    return true;
  });
}

function getNextSuggestedTime(existingStops, tripDate, minGapHrs = 3) {
  const todayPH = getTodayPH();
  if (existingStops.length === 0) {
    if (tripDate === todayPH) {
      const ph       = getPHTime();
      const nextHour = ph.getHours() + 1;
      if (nextHour >= 7 && nextHour <= 18) return minutesToTime(nextHour * 60);
    }
    return "9:00 AM";
  }
  const lastTime  = Math.max(...existingStops.map((s) => timeToMinutes(s.time)));
  const suggested = lastTime + minGapHrs * 60;
  if (suggested > 18 * 60) return null;
  return minutesToTime(suggested);
}

function getTripStatus(tripDate, manualDone) {
  if (manualDone) return "done";
  if (!tripDate)  return "planning";
  const todayPH = getTodayPH();
  if (tripDate === todayPH) return "today";
  if (tripDate  <  todayPH) return "done";
  return "planning";
}

const TRIP_CHECKLIST = [
  { id: "route", label: "Route checked in the trip map", helper: "Confirm travel time and pin location before leaving." },
  { id: "budget", label: "Budget and entrance fees prepared", helper: "Bring extra cash for food, parking, and pasalubong." },
  { id: "weather", label: "Weather and outfit checked", helper: "Prepare umbrella, water, and comfortable clothes." },
  { id: "contacts", label: "Emergency contacts saved", helper: "Save local emergency numbers and share your itinerary." },
];

function buildReadinessNotes(count, totalFee, municipalities) {
  const notes = [];
  if (count === 0) {
    notes.push("Add at least one destination before finalizing your trip.");
  } else if (count >= 4) {
    notes.push("This is a packed itinerary. Consider increasing the time gap between stops.");
  } else {
    notes.push("Your stop count looks manageable for a Bulacan day trip.");
  }

  if (totalFee === 0) {
    notes.push("Most listed entrance fees are free, but still bring extra cash for food and transport.");
  } else {
    notes.push("Prepare at least ₱" + (totalFee + 300) + " to cover estimated entrance fees and basic allowance.");
  }

  if (municipalities.length > 1) {
    notes.push("You are visiting multiple municipalities: " + municipalities.join(", ") + ". Check route order before leaving.");
  }

  return notes;
}

// Fixed for dark mode (using rgba for backgrounds)
function StatusBadge({ status }) {
  const config = {
    planning: { bg: "rgba(26, 115, 232, 0.15)", color: "#3b82f6", icon: <ClipboardList size={14}/>, label: "Planning"   },
    today:    { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", icon: <Sparkles size={14}/>,      label: "Today!"     },
    done:     { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", icon: <CheckCircle size={14}/>,   label: "Completed"  },
  };
  const c = config[status] || config.planning;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
      {c.icon} {c.label}
    </span>
  );
}

function parseFee(feeStr) {
  if (!feeStr) return 0;
  const num = parseInt(String(feeStr).replace(/\D/g, ''));
  return isNaN(num) ? 0 : num;
}

// ─── Main Component ───────────────────────────────────────
export default function ItineraryPage() {
  const {
    navigate, userId, userName, showToast,
    getItinerary, updateItineraryMeta, removeFromItinerary, updateStopTime, deleteItinerary
  } = useApp();

  const todayPH        = getTodayPH();
  const [tripDate,     setTripDate]     = useState(todayPH);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [selectedMapSpotId, setSelectedMapSpotId] = useState(null);
  const mapPanelRef = useRef(null);
  const [editingStopId,setEditingStopId]= useState(null);
  const [manualDone,   setManualDone]   = useState(false);
  const [showReview,   setShowReview]   = useState(false);
  const [showPostFeed, setShowPostFeed] = useState(false);

  const currentItinerary = getItinerary(tripDate);
  const spots            = currentItinerary.spots || [];
  const tripName         = currentItinerary.name || "Bulacan Trip";
  const minGap           = currentItinerary.minGap || 3;
  const count            = spots.length;
  const totalFee         = spots.reduce((sum, spot) => sum + parseFee(spot.fee), 0);
  const checklist        = currentItinerary.checklist || {};
  const checkedCount     = TRIP_CHECKLIST.filter((item) => checklist[item.id]).length;
  const readinessPercent = Math.round((checkedCount / TRIP_CHECKLIST.length) * 100);
  const municipalities   = [...new Set(spots.map((s) => s.municipality).filter(Boolean))];
  const readinessNotes   = buildReadinessNotes(count, totalFee, municipalities);

  const tripStatus    = getTripStatus(tripDate, manualDone);
  const suggestedTime = getNextSuggestedTime(spots, tripDate, minGap);

  useEffect(() => {
    updateItineraryMeta(tripDate, { status: tripStatus });
  }, [tripStatus, tripDate, updateItineraryMeta]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
  }, []);

  const handleSave = async () => {
    if (count === 0) return;
    if (!userId) { navigate(ROUTES.LOGIN); return; }
    setSaving(true);
    setError("");
    try {
      await saveItinerary(userId, tripName, spots);
      setSaved(true);
      showToast("✅ Itinerary saved!");
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCalendar = () => {
    if (count === 0) { alert("Add spots first!"); return; }
    spots.forEach((spot, index) => {
      const [time, period] = (spot.time || "9:00 AM").split(" ");
      const [h, m]         = time.split(":");
      let hour24           = parseInt(h);
      if (period === "PM" && hour24 !== 12) hour24 += 12;
      if (period === "AM" && hour24 === 12) hour24  = 0;
      const startDate = new Date(tripDate + "T" + String(hour24).padStart(2, "0") + ":" + m + ":00");
      const endDate   = new Date(startDate.getTime() + minGap * 3600000);
      const fmt       = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const params    = new URLSearchParams({
        action:   "TEMPLATE",
        text:     spot.name + " — " + tripName,
        dates:    fmt(startDate) + "/" + fmt(endDate),
        details:  "Fee: " + spot.fee + "\nPasalubong: " + (spot.pasalubong || "—") + "\nHours: " + (spot.hours || "—") + "\n\nPlanned via BiyaheBulacan",
        location: spot.name + ", " + spot.municipality + ", Bulacan, Philippines",
      });
      setTimeout(() => window.open("https://calendar.google.com/calendar/render?" + params.toString(), "_blank"), index * 800);
    });
  };

  const handleViewMap = (spot) => {
    setSelectedMapSpotId(spot.id);
    mapPanelRef.current?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    mapPanelRef.current?.focus({ preventScroll: true });
  };

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const handleEditTime = (stopId, newTime) => {
    const availTimes = getAvailableTimes(tripDate, spots, stopId, minGap);
    
    if (!availTimes.includes(newTime) && newTime !== "") {
        const suggested = getNextSuggestedTime(spots, tripDate, minGap);
        showToast(`❌ Conflict! Time is taken. Suggested: ${suggested}`);
        return;
    }

    updateStopTime(tripDate, stopId, newTime); 
    setEditingStopId(null);
    showToast("✅ Arrival time updated!");
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete entire itinerary for ${tripDate}? This cannot be undone.`)) return;
    deleteItinerary(tripDate); 
    setManualDone(false);
  };

  const toggleChecklistItem = (itemId) => {
    updateItineraryMeta(tripDate, {
      checklist: {
        ...checklist,
        [itemId]: !checklist[itemId],
      },
    });
  };

  const handleCopyTripSummary = async () => {
    if (count === 0) {
      showToast("Add spots first before copying your trip summary.");
      return;
    }

    const summary = [
      "BiyaheBulacan Trip Plan",
      "Trip: " + tripName,
      "Date: " + tripDate,
      "Stops: " + count,
      "Estimated Entrance Fees: ₱" + totalFee,
      "Readiness: " + readinessPercent + "%",
      "",
      ...sortedItinerary.map((spot, index) => (index + 1) + ". " + spot.time + " - " + spot.name + " (" + spot.municipality + ")"),
      "",
      "Preparation Notes:",
      ...readinessNotes.map((note) => "- " + note),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      showToast("✅ Trip summary copied!");
    } catch (err) {
      showToast("Trip summary ready, but clipboard is blocked by the browser.");
    }
  };

  const sortedItinerary = [...spots].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "3rem" }}>
      {/* ── Header ───────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "2rem 0",
        transition: "all 0.3s ease"
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: "var(--font-head)", fontSize: "1.6rem", margin: 0, color: "var(--text-main)" }}>My Bulacan Itinerary</h2>
              <StatusBadge status={tripStatus} />
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginTop: "0.2rem", marginBottom: 0 }}>
              Plan your perfect Bulacan adventure
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {tripStatus !== "done" && (
              <button className="btn btn-sec btn-sm" onClick={() => navigate(ROUTES.BROWSE)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={16} /> Add More Spots
              </button>
            )}
            {tripStatus === "today" && (
              <button
                className="btn btn-sm"
                style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}
                onClick={() => setManualDone(true)}
              >
                <CheckCircle size={16} /> Mark as Done
              </button>
            )}
            {tripStatus === "done" && (
              <>
                <button className="btn btn-sec btn-sm" onClick={() => setShowReview(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Star size={16} /> Review Trip
                </button>
                <button className="btn btn-pri btn-sm" onClick={() => setShowPostFeed(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Camera size={16} /> Post to Feed
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        {count > 0 && <section ref={mapPanelRef} tabIndex={-1} className="itinerary-map-panel" aria-label="Trip destinations map">
          <h3>Your destinations on the map</h3>
          <TravelPlanner locations={sortedItinerary} selectedId={selectedMapSpotId} onSelect={setSelectedMapSpotId} />
          <div className="itinerary-map-list">
            {sortedItinerary.map((stop, index) => <button type="button" key={stop.id} className="btn btn-sec btn-sm" aria-pressed={selectedMapSpotId === stop.id} onClick={() => setSelectedMapSpotId(stop.id)} disabled={!getCoordinates(stop)}>{index + 1}. {stop.name}{!getCoordinates(stop) && " — location unavailable"}</button>)}
          </div>
          {sortedItinerary.some((stop) => !getCoordinates(stop)) && <p className="location-note">Some destinations do not have an exact location yet and are not shown on the map.</p>}
          {sortedItinerary.some((stop) => getCoordinates(stop) && stop.locationVerified !== true) && <p className="location-note location-note--unverified">Some pins have not been verified. Confirm visitor entrances before your trip.</p>}
        </section>}
        <div className="itin-builder">

          {/* ── Left ─────────────────────────────────────── */}
          <div>
            {/* Trip meta */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 150 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>TRIP NAME</label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => updateItineraryMeta(tripDate, { name: e.target.value })}
                    disabled={tripStatus === "done"}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem", background: "var(--bg-main)", color: "var(--text-main)", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>TRIP DATE</label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem", background: "var(--bg-main)", color: "var(--text-main)", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.4rem" }}>MIN GAP</label>
                  <select
                    value={minGap}
                    onChange={(e) => updateItineraryMeta(tripDate, { minGap: Number(e.target.value) })}
                    disabled={tripStatus === "done"}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.95rem", background: "var(--bg-main)", color: "var(--text-main)", boxSizing: "border-box" }}
                  >
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} hr{n > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
              </div>
              {tripDate && (
                <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
                  <Calendar size={16} color="var(--muted)"/> {new Date(tripDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  {tripDate === todayPH && (
                    <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "2px 8px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 }}>Today</span>
                  )}
                </div>
              )}
              {tripStatus !== "done" && count > 0 && suggestedTime && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "var(--pri)", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Lightbulb size={16} /> Next available slot for this day: <strong>{suggestedTime}</strong> ({minGap}hr gap)
                </div>
              )}
            </div>

            {/* Stops */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)" }}>
                <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "1.1rem" }}>
                  <Calendar size={20} color="var(--pri)" /> {tripName}
                </h4>
                <span style={{ background: "rgba(46, 204, 113, 0.15)", color: "var(--pri)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {count} stops
                </span>
              </div>

              {count === 0 ? (
                <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--muted)" }}>
                  <Map size={48} color="var(--muted)" style={{ marginBottom: "1rem", opacity: 0.5 }} />
                  <p style={{ marginBottom: "1.5rem" }}>No spots scheduled for {tripDate} yet.</p>
                  {tripStatus !== "done" && (
                    <button className="btn btn-pri btn-sm" onClick={() => navigate(ROUTES.BROWSE)} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <MapPin size={16} /> Browse Destinations
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: "0 1.25rem" }}>
                  {sortedItinerary.map((s, index) => {
                    const ph      = getPHTime();
                    const curMins = ph.getHours() * 60 + ph.getMinutes();
                    const isPast  = tripDate === todayPH && timeToMinutes(s.time) <= curMins;
                    const isEdit  = editingStopId === s.id;
                    const avail   = getAvailableTimes(tripDate, spots, s.id, minGap);

                    return (
                      <div
                        key={s.id}
                        style={{
                          display:      "flex",
                          alignItems:   "flex-start",
                          gap:          "1rem",
                          padding:      "1.25rem 0",
                          borderBottom: index < sortedItinerary.length - 1 ? "1px dashed var(--border)" : "none",
                          opacity:      isPast && tripStatus !== "done" ? 0.6 : 1,
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: isPast ? "var(--border)" : "var(--pri)",
                          color: isPast ? "var(--muted)" : "#fff", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "0.85rem",
                          fontWeight: 700, flexShrink: 0, marginTop: 4,
                        }}>
                          {isPast ? <CheckCircle size={16} /> : index + 1}
                        </div>

                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 56, height: 56, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>
                            {s.emoji}
                          </div>
                        )}

                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.25rem", color: "var(--text-main)" }}>{s.name}</div>
                          
                          {isEdit ? (
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                              <select
                                defaultValue={s.time}
                                onChange={(e) => handleEditTime(s.id, e.target.value)}
                                style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.85rem", background: "var(--bg-main)", color: "var(--text-main)" }}
                              >
                                {avail.length === 0
                                  ? <option value="">No available times</option>
                                  : avail.map((t) => <option key={t} value={t}>{t}</option>)
                                }
                              </select>
                              <button onClick={() => setEditingStopId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 500 }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                              <Clock size={14} /> {s.time}
                              {tripStatus !== "done" && (
                                <button onClick={() => setEditingStopId(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--pri)", fontSize: "0.8rem", padding: 0, display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                                  <Edit2 size={12} /> Edit
                                </button>
                              )}
                            </div>
                          )}
                          
                          <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.25rem" }}>
                            <MapPin size={14} /> {s.municipality} 
                            <Wallet size={14} style={{ marginLeft: "4px" }} /> {s.fee}
                          </div>
                          
                          {userLocation && getCoordinates(s) && (
                            <div style={{ fontSize: "0.8rem", color: "#10b981", display: "flex", alignItems: "center", gap: "4px", marginBottom: "0.25rem" }}>
                              <Navigation size={12} /> {getDistance(userLocation.lat, userLocation.lng, s.lat, s.lng)} km from you
                            </div>
                          )}
                          
                          <button onClick={() => handleViewMap(s)} disabled={!getCoordinates(s)} style={{ background: "none", border: "none", cursor: getCoordinates(s) ? "pointer" : "default", opacity: getCoordinates(s) ? 1 : 0.6, fontSize: "0.8rem", color: "#3b82f6", padding: 0, display: "flex", alignItems: "center", gap: "4px", fontWeight: 500, marginTop: "0.5rem" }}>
                            <Map size={14} /> {getCoordinates(s) ? "View Map" : "Location unavailable"}
                          </button>
                        </div>

                        {tripStatus !== "done" && (
                          <button onClick={() => removeFromItinerary(tripDate, s.id)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", cursor: "pointer", transition: "all 0.2s" }}>
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {count > 0 && tripStatus !== "done" && (
              <button
                onClick={handleDelete}
                style={{ marginTop: "1rem", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", borderRadius: 8, padding: "0.75rem", fontSize: "0.9rem", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontWeight: 600, transition: "all 0.2s" }}
              >
                <Trash2 size={16} /> Delete Itinerary for {tripDate}
              </button>
            )}
          </div>

          {/* ── Right: Summary ────────────────────────────── */}
          <div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", margin: "0 0 1rem 0", color: "var(--text-main)" }}>Trip Summary</h3>

              {error && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "0.75rem", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>
                  {error}
                </div>
              )}

              {count === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No spots added yet for this date.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {sortedItinerary.map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}><Clock size={12} color="var(--muted)"/> {s.time} · {s.name}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>{s.fee}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid var(--border)", fontWeight: 700, fontSize: "1.1rem" }}>
                <span>Total ({count} stops)</span>
                <span style={{ color: "var(--pri)" }}>₱{totalFee}</span>
              </div>

              <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", color: "#d97706", padding: "0.75rem", borderRadius: 8, fontSize: "0.8rem", display: "flex", gap: "8px", marginTop: "1.25rem", lineHeight: 1.4 }}>
                <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Entrance fees only. Bring extra for food, transport, and pasalubong!</span>
              </div>

              {tripStatus !== "done" ? (
                <>
                  <button
                    className="btn btn-pri"
                    style={{ width: "100%", marginTop: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onClick={handleSave}
                    disabled={saving || count === 0}
                  >
                    {saving ? "Saving..." : saved ? <><CheckCircle size={16}/> Saved!</> : <><Save size={16}/> Save Itinerary</>}
                  </button>
                  <button
                    className="btn btn-sec"
                    style={{ width: "100%", marginTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    onClick={handleExportCalendar}
                    disabled={count === 0}
                  >
                    <CalendarPlus size={16} /> Export to Google Calendar
                  </button>
                </>
              ) : (
                <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button className="btn btn-sec" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={() => setShowReview(true)}>
                    <Star size={16} /> Review Trip
                  </button>
                  <button className="btn btn-pri" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={() => setShowPostFeed(true)}>
                    <Camera size={16} /> Post to Feed
                  </button>
                </div>
              )}
            </div>

            {/* Trip readiness */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.5rem", marginTop: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>Trip Readiness</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>Smart pre-trip checklist</p>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: readinessPercent === 100 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", color: readinessPercent === 100 ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>
                  {readinessPercent}%
                </div>
              </div>

              <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden", marginBottom: "1.25rem" }}>
                <div style={{ width: readinessPercent + "%", height: "100%", background: readinessPercent === 100 ? "#10b981" : "#f59e0b", transition: "width 0.3s" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {TRIP_CHECKLIST.map((item) => (
                  <label key={item.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: tripStatus === "done" ? "default" : "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!checklist[item.id]}
                      onChange={() => toggleChecklistItem(item.id)}
                      disabled={tripStatus === "done"}
                      style={{ marginTop: 4, width: 16, height: 16, accentColor: "var(--pri)" }}
                    />
                    <span>
                      <span style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>{item.label}</span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.4, marginTop: 2 }}>{item.helper}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: 10, background: "var(--bg-main)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--muted)", marginBottom: "0.5rem", letterSpacing: "0.5px" }}>SMART REMINDERS</div>
                {readinessNotes.map((note, i) => (
                  <div key={i} style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.5, marginBottom: "0.4rem", display: "flex", gap: "6px" }}>
                    <span style={{ color: "var(--pri)" }}>•</span> {note}
                  </div>
                ))}
              </div>

              <button
                className="btn btn-sec"
                style={{ width: "100%", marginTop: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={handleCopyTripSummary}
                disabled={count === 0}
              >
                <ClipboardList size={16} /> Copy Trip Summary
              </button>
            </div>
            
            {/* Minimal Trip Info Box */}
            <div style={{ background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)", padding: "1.5rem", marginTop: "1.5rem" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "var(--text-main)" }}>Trip Info Details</h4>
              {[
                ["Traveler",    userName || "Guest"],
                ["Total Stops", String(count)],
                ["Est. Fees",   "₱" + totalFee],
                ["Min Gap",     minGap + " hr" + (minGap > 1 ? "s" : "")],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{k}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>{v}</span>
                </div>
              ))}
              {count > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Area covered</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, textAlign: "right", maxWidth: 160, color: "var(--text-main)" }}>
                    {[...new Set(spots.map((s) => s.municipality))].join(", ")}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {showReview && (
        <ReviewModal
          itinerary={spots}
          tripName={tripName}
          userId={userId}
          userName={userName}
          onClose={() => setShowReview(false)}
          showToast={showToast}
        />
      )}
      {showPostFeed && (
        <PostTripModal
          itinerary={spots}
          tripName={tripName}
          tripDate={tripDate}
          totalFee={totalFee}
          userId={userId}
          userName={userName}
          onClose={() => setShowPostFeed(false)}
          navigate={navigate}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────
function ReviewModal({ itinerary, tripName, userId, userName, onClose, showToast }) {
  const [activeTab,    setActiveTab]    = useState("overall");
  const [overallStars, setOverallStars] = useState(0);
  const [overallText,  setOverallText]  = useState("");
  const [spotReviews,  setSpotReviews]  = useState(() =>
    Object.fromEntries(itinerary.map((s) => [s.id, { stars: 0, text: "" }]))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitOverall = async () => {
    if (overallStars === 0 || !overallText.trim()) return;
    setSubmitting(true);
    try {
      if (itinerary[0]) {
        await addReview(itinerary[0].id, userId, userName, overallStars, "Trip review for " + tripName + ": " + overallText.trim());
      }
      showToast("✅ Trip review posted!");
      onClose();
    } catch (err) {
      alert("Failed to post review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPerSpot = async () => {
    setSubmitting(true);
    try {
      for (const spot of itinerary) {
        const r = spotReviews[spot.id];
        if (r?.stars > 0 && r?.text?.trim()) {
          await addReview(spot.id, userId, userName, r.stars, r.text.trim());
        }
      }
      showToast("✅ Reviews posted!");
      onClose();
    } catch (err) {
      alert("Failed to post reviews.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--bg-secondary)", borderRadius: 16, padding: "1.5rem", maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}><Star size={20} color="#f59e0b" /> Review Your Trip</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {["overall", "per-spot"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                flex: 1, padding: "10px", borderRadius: 8,
                border: "1px solid", borderColor: activeTab === t ? "var(--pri)" : "var(--border)",
                background: activeTab === t ? "var(--pri)" : "transparent",
                color: activeTab === t ? "#fff" : "var(--muted)",
                cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s"
              }}
            >
              {t === "overall" ? <><FileText size={16}/> Overall Trip</> : <><MapPin size={16}/> Per Spot</>}
            </button>
          ))}
        </div>

        {activeTab === "overall" ? (
          <>
            <label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
              Rate your overall trip to {tripName}
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              {[1,2,3,4,5].map((n) => (
                <span key={n} onClick={() => setOverallStars(n)} style={{ cursor: "pointer" }}>
                  <Star size={32} fill={n <= overallStars ? "#f59e0b" : "transparent"} color={n <= overallStars ? "#f59e0b" : "var(--muted)"} />
                </span>
              ))}
            </div>
            <textarea
              placeholder={"How was your trip to " + tripName + "? Share your experience..."}
              value={overallText}
              onChange={(e) => setOverallText(e.target.value)}
              style={{ width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.9rem", background: "var(--bg-main)", color: "var(--text-main)", minHeight: 120, resize: "vertical", boxSizing: "border-box", marginBottom: "1rem", outline: "none" }}
            />
            <button
              className="btn btn-pri"
              style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleSubmitOverall}
              disabled={submitting || overallStars === 0 || !overallText.trim()}
            >
              <Send size={16} /> {submitting ? "Posting..." : "Post Trip Review"}
            </button>
          </>
        ) : (
          <>
            {itinerary.map((spot) => (
              <div key={spot.id} style={{ marginBottom: "1rem", padding: "1rem", background: "var(--bg-main)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  {spot.imageUrl ? (
                    <img src={spot.imageUrl} alt={spot.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: spot.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{spot.emoji}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{spot.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{spot.municipality}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
                  {[1,2,3,4,5].map((n) => (
                    <span key={n} onClick={() => setSpotReviews((prev) => ({ ...prev, [spot.id]: { ...prev[spot.id], stars: n } }))} style={{ cursor: "pointer" }}>
                      <Star size={24} fill={n <= (spotReviews[spot.id]?.stars || 0) ? "#f59e0b" : "transparent"} color={n <= (spotReviews[spot.id]?.stars || 0) ? "#f59e0b" : "var(--border)"} />
                    </span>
                  ))}
                </div>
                <textarea
                  placeholder={"How was " + spot.name + "?"}
                  value={spotReviews[spot.id]?.text || ""}
                  onChange={(e) => setSpotReviews((prev) => ({ ...prev, [spot.id]: { ...prev[spot.id], text: e.target.value } }))}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.85rem", background: "var(--bg-secondary)", color: "var(--text-main)", minHeight: 80, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                />
              </div>
            ))}
            <button
              className="btn btn-pri"
              style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "0.5rem" }}
              onClick={handleSubmitPerSpot}
              disabled={submitting}
            >
              <Send size={16} /> {submitting ? "Posting..." : "Post All Reviews"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Post Trip Modal ──────────────────────────────────────
function PostTripModal({ itinerary, tripName, tripDate, totalFee, userId, userName, onClose, navigate, showToast }) {
  const [postText,   setPostText]   = useState(
    "Just finished my Bulacan trip — " + tripName + "! Visited " +
    itinerary.length + " amazing spots. Total entrance fees: ₱" + totalFee +
    ". Highly recommend! 🗺️\n\nSpots visited: " +
    itinerary.map((s) => s.name).join(", ")
  );
  const [tag,        setTag]        = useState("Bulacan");
  const [imageUrl,   setImageUrl]   = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [posting,    setPosting]    = useState(false);
  const fileRef                     = useRef(null);

  const initials     = userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "JD";
  const avatarColors = ["#1a5c3c","#b8760a","#533ab7","#c0392b","#2980b9"];
  const avatarBg     = avatarColors[userId?.charCodeAt(0) % avatarColors.length] || "#1a5c3c";

  const handleImagePick = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      // FIX: Tinanggal yung glitch na text, binalik sa tamang pangalan
      const CLOUD  = process.env.REACT_APP_CLOUDINARY_CLOUD; 
      const PRESET = process.env.REACT_APP_CLOUDINARY_PRESET;
      const fd     = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", PRESET);
      const res  = await fetch("https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload", { method: "POST", body: fd });
      const data = await res.json();
      setImageUrl(data.secure_url);
    } catch (err) {
      alert("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    try {
      await addPost(userId, userName || "Traveler", initials, avatarBg, postText.trim(), tag, imageUrl);
      showToast("✅ Trip posted to community feed!");
      onClose();
      navigate(ROUTES.FEED);
    } catch (err) {
      console.error("Post error:", err);
      alert("Failed to post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const MUNICIPALITIES = [
    "Bulacan","Malolos","San Miguel","Balagtas","Angat",
    "Bocaue","Calumpit","Baliuag","Obando","Guiguinto",
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--bg-secondary)", borderRadius: 16, padding: "1.5rem", maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}><Camera size={20} color="var(--pri)" /> Post Trip to Community</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}><X size={20} /></button>
        </div>

        {/* Spots visited tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          {itinerary.slice(0, 5).map((s) => (
            <span key={s.id} style={{ background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
              {s.emoji} {s.name}
            </span>
          ))}
          {itinerary.length > 5 && (
            <span style={{ background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", fontSize: "0.8rem", color: "var(--muted)" }}>
              +{itinerary.length - 5} more
            </span>
          )}
        </div>

        {/* Text */}
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          style={{ width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.9rem", background: "var(--bg-main)", color: "var(--text-main)", minHeight: 140, resize: "vertical", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
        />

        {/* Image preview */}
        {previewUrl && (
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <img src={previewUrl} alt="preview" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
            <button
              onClick={() => { setPreviewUrl(""); setImageUrl(""); }}
              style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            ><X size={16} /></button>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", alignItems: "center" }}>
          <button
            className="btn btn-sec"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, padding: "10px", justifyContent: "center" }}
          >
            <ImageIcon size={16} /> {uploading ? "Uploading..." : "Add Photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleImagePick(e.target.files[0])}
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            style={{ flex: 1, padding: "10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.9rem", background: "var(--bg-main)", color: "var(--text-main)", outline: "none" }}
          >
            {MUNICIPALITIES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        <button
          className="btn btn-pri"
          style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          onClick={handlePost}
          disabled={!postText.trim() || posting || uploading}
        >
          <Send size={16} /> {posting ? "Posting..." : "Post to Community Feed"}
        </button>
      </div>
    </div>
  );
}
