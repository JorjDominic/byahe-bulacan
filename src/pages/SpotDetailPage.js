import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { getTodayPH, getPHTime, timeToMinutes, minutesToTime, getTripStatus } from "../hooks/useItinerary";
import ROUTES from "../constants/routes";
import Stars from "../components/Stars";
import { getSpotById, getNearbySpots, getReviewsForSpot, addReview } from "../services/spotService";

// SVG Icons
import { 
  ArrowLeft, MapPin, Wallet, Gift, Clock, Map, Droplets, Wind, Lock, Star, Send 
} from "lucide-react";

const ALL_TIMES = [
  "7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM",
  "12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM",
  "5:00 PM","6:00 PM",
];

export default function SpotDetailPage({ spotId }) {
  const { navigate, userId, userName, addToItinerary, itineraries, itineraryDates, isPremium } = useApp();
  
  const todayPH            = getTodayPH();
  const [tripDate,         setTripDate]         = useState(todayPH);
  const [arrivalTime,      setArrivalTime]       = useState("9:00 AM");
  const [timeError,        setTimeError]         = useState("");
  const [suggestedTime,    setSuggestedTime]     = useState("");
  const [availableTimes,   setAvailableTimes]    = useState(ALL_TIMES);
  const [spot,             setSpot]              = useState(null);
  const [nearbySpots,      setNearbySpots]       = useState([]);
  const [reviews,          setReviews]           = useState([]);
  const [userStars,        setUserStars]         = useState(0);
  const [reviewText,       setReviewText]        = useState("");
  const [loading,          setLoading]           = useState(true);
  const [submitting,       setSubmitting]        = useState(false);
  const [weather,          setWeather]           = useState(null);
  const [weatherLoading,   setWeatherLoading]    = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSpotById(spotId),
      getNearbySpots(spotId),
      getReviewsForSpot(spotId),
    ]).then(([spotData, nearby, reviewData]) => {
      setSpot(spotData);
      setNearbySpots(nearby);
      setReviews(reviewData ?? []);
      setLoading(false);
      if (spotData?.lat && spotData?.lng) fetchWeather(spotData.lat, spotData.lng);
    });
  }, [spotId]);

  useEffect(() => {
    const date       = tripDate;
    const ph         = getPHTime();
    const curMins    = ph.getHours() * 60 + ph.getMinutes();
    const isToday    = date === getTodayPH();
    const itin       = itineraries[date] || { spots: [], minGap: 3 };
    const gapMins    = (itin.minGap ?? 3) * 60;
    const takenMins  = (itin.spots ?? []).map((s) => timeToMinutes(s.time));

    const avail = ALL_TIMES.filter((t) => {
      const mins = timeToMinutes(t);
      if (isToday && mins <= curMins) return false;
      for (const taken of takenMins) {
        if (Math.abs(mins - taken) < gapMins) return false;
      }
      return true;
    });

    setAvailableTimes(avail);

    if (avail.length > 0) {
      setArrivalTime(avail[0]);
      setTimeError("");
    } else {
      setTimeError("No available times for this date. All slots are taken or passed.");
    }

    if (takenMins.length > 0) {
      const lastMins  = Math.max(...takenMins);
      const suggested = lastMins + (itin.minGap ?? 3) * 60;
      const sugStr    = minutesToTime(suggested);
      if (sugStr && avail.includes(sugStr)) {
        setSuggestedTime(sugStr);
        setArrivalTime(sugStr);
      } else if (avail.length > 0) {
        setSuggestedTime(avail[0]);
        setArrivalTime(avail[0]);
      }
    }
  }, [tripDate, itineraries]);

  const handleTimeChange = (time) => {
    setArrivalTime(time);
    setTimeError("");
    const itin    = itineraries[tripDate] || { spots: [], minGap: 3 };
    const gapMins = (itin.minGap ?? 3) * 60;
    const newMins = timeToMinutes(time);

    for (const s of (itin.spots ?? [])) {
      const diff = Math.abs(newMins - timeToMinutes(s.time));
      if (diff < gapMins) {
        setTimeError(
          "⚠️ Too close to " + s.name + " at " + s.time +
          ". Minimum gap is " + (itin.minGap ?? 3) + " hrs. " +
          "Try " + (suggestedTime || availableTimes[0] || "a later time") + " instead."
        );
        return;
      }
    }
  };

  const handleAddToItinerary = () => {
    if (!spot || !userId || timeError || availableTimes.length === 0) return;
    addToItinerary(tripDate, { ...spot, time: arrivalTime, tripDate });
    navigate(ROUTES.ITINERARY);
  };

  const itin = itineraries[tripDate] || { spots: [] };
  const alreadyAdded = (itin.spots ?? []).some((s) => s.id === spot?.id);
  const tripStatus = getTripStatus(tripDate);
  const currentStopsCount = (itin.spots ?? []).length;
  const isFreeMaxStopsReached = !isPremium && currentStopsCount >= 3;
  const isFreeMaxTripsReached = !isPremium && itineraryDates.length >= 1 && !itineraryDates.includes(tripDate);
  const isBlockedByPaywall = isFreeMaxStopsReached || isFreeMaxTripsReached;

  const fetchWeather = async (lat, lng) => {
    const key = process.env.REACT_APP_WEATHER_KEY;
    if (!key) return;
    setWeatherLoading(true);
    try {
      const res  = await fetch(
        "https://api.openweathermap.org/data/2.5/weather?lat=" + lat +
        "&lon=" + lng + "&appid=" + key + "&units=metric"
      );
      const data = await res.json();
      if (data.main) {
        setWeather({
          temp:     Math.round(data.main.temp),
          feels:    Math.round(data.main.feels_like),
          desc:     data.weather[0].description,
          humidity: data.main.humidity,
          wind:     data.wind.speed,
          icon:     data.weather[0].main,
        });
      }
    } catch (err) {
      console.error("Weather error:", err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const getWeatherEmoji = (icon) => {
    const map = { Clear:"☀️", Clouds:"☁️", Rain:"🌧️", Drizzle:"🌦️", Thunderstorm:"⛈️", Snow:"❄️", Mist:"🌫️", Fog:"🌫️", Haze:"🌁" };
    return map[icon] || "⛅";
  };

  const formatTime = (item) => {
    if (item.createdAt?.toDate) {
      const diff  = Date.now() - item.createdAt.toDate().getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      if (mins  <  1) return "Just now";
      if (mins  < 60) return mins  + "m ago";
      if (hours < 24) return hours + "h ago";
      return Math.floor(diff / 86400000) + "d ago";
    }
    return item.time || "Just now";
  };

  const handleSubmitReview = async () => {
    if (userStars === 0 || !reviewText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newReview = await addReview(spot.id, userId, userName || "Anonymous", userStars, reviewText.trim());
      setReviews((prev) => [newReview, ...prev]);
      setReviewText("");
      setUserStars(0);
    } catch (err) {
      alert("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMaps = () => {
    const q = spot.lat && spot.lng
      ? spot.lat + "," + spot.lng
      : encodeURIComponent(spot.name + " " + spot.municipality + " Bulacan");
    window.open("https://www.google.com/maps/search/?api=1&query=" + q, "_blank");
  };

  if (loading) return (
    <div className="container" style={{ padding: "4rem", textAlign: "center", color: "var(--muted)" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗺️</div>
      <p style={{ fontSize: "1.2rem", fontWeight: 600 }}>Loading spot details...</p>
    </div>
  );

  if (!spot) return (
    <div className="container" style={{ padding: "4rem", textAlign: "center", color: "var(--muted)" }}>Spot not found.</div>
  );

  return (
    <div style={{ paddingBottom: "3rem", background: "var(--bg-main)", minHeight: "100vh" }}>
      
      {/* OVERRIDE CSS PARA PATAYIN ANG HARDCODED WHITE BACKGROUND NG LUMANG CLASSES */}
      <style>{`
        .detail-hero, .detail-body, .detail-inner {
          background-color: transparent !important;
        }
      `}</style>

      <div className="detail-hero">
        <div className="container">
          <button 
            onClick={() => navigate(ROUTES.BROWSE)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, padding: "1rem 0" }}
          >
            <ArrowLeft size={18} /> Back to Explore
          </button>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
            {/* ── Left: Image & Info ─────────────────────────────────────────────── */}
            <div>
              <div style={{ height: "300px", borderRadius: "16px", overflow: "hidden", background: spot.bg || "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                {spot.imageUrl ? (
                  <img src={spot.imageUrl} alt={spot.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "6rem" }}>{spot.emoji}</span>
                )}
              </div>
              
              <h2 style={{ fontSize: "2rem", margin: "0 0 0.5rem 0", color: "var(--text-main)", lineHeight: 1.2 }}>{spot.name}</h2>
              
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                  {spot.category}
                </span>
                {spot.badge && (
                  <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
                    {spot.badge}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
                <Stars rating={spot.rating || 0} size="lg" />
                <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 600 }}>
                  {spot.rating > 0 ? spot.rating : "No ratings yet"} {" (" + (spot.reviews ?? 0) + " reviews)"}
                </span>
              </div>

              {/* FIXED INFO GRID */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem", textTransform: "uppercase" }}><MapPin size={14}/> Municipality</div>
                  <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem" }}>{spot.municipality}, Bulacan</div>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem", textTransform: "uppercase" }}><Wallet size={14}/> Entrance Fee</div>
                  <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem" }}>{spot.fee === "Free" ? "Free entrance" : spot.fee + " per person"}</div>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem", textTransform: "uppercase" }}><Gift size={14}/> Pasalubong</div>
                  <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem" }}>{spot.pasalubong || "—"}</div>
                </div>
                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.25rem", textTransform: "uppercase" }}><Clock size={14}/> Best Visit Hours</div>
                  <div style={{ color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem" }}>{spot.hours || "—"}</div>
                </div>
              </div>

              <div style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.6, marginBottom: "1.5rem" }}>{spot.desc}</div>

              {/* Weather */}
              {(weather || weatherLoading) && (
                <div style={{ padding: "1.25rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.75rem", letterSpacing: "0.5px" }}>
                    {"CURRENT WEATHER IN " + spot.municipality.toUpperCase() + ", BULACAN"}
                  </div>
                  {weatherLoading ? (
                    <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Fetching weather...</p>
                  ) : weather && (
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ fontSize: "3rem" }}>{getWeatherEmoji(weather.icon)}</div>
                      <div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)" }}>{weather.temp + "°C"}</div>
                        <div style={{ fontSize: "0.9rem", color: "var(--muted)", textTransform: "capitalize" }}>{weather.desc + " • Feels like " + weather.feels + "°C"}</div>
                      </div>
                      <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><Droplets size={14} color="#3b82f6"/> {weather.humidity + "% Humidity"}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><Wind size={14} color="#9ca3af"/> {weather.wind + " m/s Wind"}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: Planner Sidebar ────────────────────────────────────────────── */}
            <div>
              {/* FIXED SIDEBAR BACKGROUND */}
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", position: "sticky", top: "100px" }}>
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.2rem", color: "var(--text-main)" }}>Plan Your Visit</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
                  Choose a date and arrival time for this spot.
                </p>

                {userId ? (
                  <>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>Trip date</label>
                    <input
                      type="date"
                      value={tripDate}
                      min={todayPH}
                      onChange={(e) => {
                        setTripDate(e.target.value);
                        setTimeError("");
                      }}
                      style={{
                        width: "100%", padding: "12px", border: "1px solid var(--border)",
                        borderRadius: "8px", fontSize: "0.95rem", background: "var(--bg-main)",
                        color: "var(--text-main)", marginBottom: "1rem", boxSizing: "border-box", outline: "none"
                      }}
                    />

                    {/* Limit Warnings */}
                    {isFreeMaxTripsReached && (
                      <div style={{ padding: "0.75rem", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", fontSize: "0.85rem", color: "#d97706", marginBottom: "1rem", lineHeight: 1.5 }}>
                        <strong><Lock size={14} style={{ verticalAlign: "middle" }}/> Free Tier Limit Reached</strong><br/>
                        You already have an active itinerary on {itineraryDates[0]}. Upgrade to Premium to plan multi-day trips!
                      </div>
                    )}

                    {isFreeMaxStopsReached && !isFreeMaxTripsReached && (
                       <div style={{ padding: "0.75rem", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", fontSize: "0.85rem", color: "#d97706", marginBottom: "1rem", lineHeight: 1.5 }}>
                       <strong><Lock size={14} style={{ verticalAlign: "middle" }}/> Free Tier Limit Reached</strong><br/>
                       You have reached the maximum of 3 stops for this day. Upgrade to Premium for unlimited stops!
                     </div>
                    )}

                    {(itin.spots ?? []).length > 0 && (
                      <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.5rem" }}>
                          ALREADY PLANNED ON THIS DATE:
                        </div>
                        {(itin.spots ?? []).map((s) => (
                          <div key={s.id} style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Clock size={12} color="var(--pri)"/> {s.time} - {s.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {suggestedTime && availableTimes.includes(suggestedTime) && !isBlockedByPaywall && (
                      <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Star size={14} color="#f59e0b" fill="#f59e0b" /> Suggested: <strong>{suggestedTime}</strong>
                        <button
                          onClick={() => { setArrivalTime(suggestedTime); setTimeError(""); }}
                          style={{ marginLeft: "auto", background: "rgba(26, 115, 232, 0.1)", border: "none", borderRadius: "4px", padding: "4px 8px", color: "#3b82f6", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}
                        >
                          Use this
                        </button>
                      </div>
                    )}

                    {!isBlockedByPaywall && (
                      <>
                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)", marginBottom: "0.5rem" }}>Select arrival time</label>
                        {availableTimes.length === 0 ? (
                          <div style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", fontSize: "0.85rem", color: "#ef4444", marginBottom: "1rem" }}>
                            No available times for this date. Try another date.
                          </div>
                        ) : (
                          <select
                            value={arrivalTime}
                            onChange={(e) => handleTimeChange(e.target.value)}
                            style={{
                              width: "100%", padding: "12px", border: "1px solid var(--border)",
                              borderRadius: "8px", fontSize: "0.95rem", background: "var(--bg-main)",
                              color: "var(--text-main)", marginBottom: "1rem", outline: "none"
                            }}
                          >
                            {availableTimes.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        )}
                      </>
                    )}

                    {timeError && !isBlockedByPaywall && (
                      <div style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", fontSize: "0.85rem", color: "#ef4444", marginBottom: "1rem", lineHeight: 1.5 }}>
                        {timeError}
                      </div>
                    )}

                    <button
                      className="btn btn-pri"
                      onClick={() => isBlockedByPaywall ? navigate(ROUTES.PREMIUM) : handleAddToItinerary()}
                      disabled={alreadyAdded || (!!timeError && !isBlockedByPaywall) || (availableTimes.length === 0 && !isBlockedByPaywall)}
                      style={{ width: "100%", padding: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                    >
                      {alreadyAdded 
                        ? "✓ Already in itinerary" 
                        : isBlockedByPaywall 
                        ? "⭐ Upgrade to Unlock"
                        : "+ Add to Itinerary"
                      }
                    </button>

                    {spot.feeNum > 0 && !isBlockedByPaywall && (
                      <div style={{ textAlign: "center", marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                        {"Entrance: ₱" + spot.feeNum + " will be added to your trip total"}
                      </div>
                    )}

                    {tripStatus === "done" && (
                      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--muted)", textAlign: "center" }}>
                        This date has already passed.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem 1.5rem", background: "var(--bg-main)", borderRadius: "12px", border: "1px dashed var(--border)" }}>
                    <Lock size={32} color="var(--muted)" style={{ marginBottom: "0.5rem" }} />
                    <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem", color: "var(--text-main)" }}>Login required</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                      Log in or create a free account to add spots to your itinerary.
                    </div>
                    <button className="btn btn-pri" onClick={() => navigate(ROUTES.LOGIN)} style={{ width: "100%" }}>Log In</button>
                  </div>
                )}
              </div>

              {/* Location */}
              {spot.lat && spot.lng && (
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.5rem", marginTop: "1rem" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}><Map size={18} color="var(--pri)"/> Location Map</h4>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "0.25rem", fontWeight: 600 }}>{spot.municipality + ", Bulacan"}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>{"GPS: " + spot.lat + ", " + spot.lng}</div>
                  <button className="btn btn-sec" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={handleOpenMaps}>
                    ↗ Open in Google Maps
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reviews + Nearby ─────────────────────────────────────── */}
      <div className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          
          <div>
            <h3 style={{ fontSize: "1.4rem", margin: "0 0 1.5rem 0", color: "var(--text-main)" }}>Traveler Reviews</h3>
            {userId ? (
              <div style={{ background: "var(--bg-secondary)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-main)" }}>Share your experience</div>
                <div style={{ display: "flex", gap: "4px", marginBottom: "1rem" }}>
                  {[1,2,3,4,5].map((n) => (
                    <span key={n} onClick={() => setUserStars(n)} style={{ cursor: "pointer" }}>
                      <Star size={24} fill={n <= userStars ? "#f59e0b" : "transparent"} color={n <= userStars ? "#f59e0b" : "var(--border)"} />
                    </span>
                  ))}
                </div>
                <textarea
                  placeholder="What did you love about this place? Share tips for future visitors..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  disabled={submitting}
                  style={{ width: "100%", padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.9rem", background: "var(--bg-main)", color: "var(--text-main)", minHeight: "100px", resize: "vertical", boxSizing: "border-box", outline: "none" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button className="btn btn-pri" onClick={handleSubmitReview} disabled={submitting || userStars === 0 || !reviewText.trim()} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Send size={16} /> {submitting ? "Posting..." : "Post Review"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "1.5rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "1.5rem", fontSize: "0.9rem", color: "var(--muted)", textAlign: "center" }}>
                <span style={{ color: "var(--pri)", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate(ROUTES.LOGIN)}>Log in</span>{" to write a review."}
              </div>
            )}

            {reviews.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>No reviews yet. Be the first to review!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ padding: "1.25rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "var(--text-main)" }}>{r.user}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{formatTime(r)}</span>
                    </div>
                    <div style={{ display: "flex", gap: "2px", marginBottom: "0.75rem" }}>
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} size={14} fill={n <= r.stars ? "#f59e0b" : "transparent"} color={n <= r.stars ? "#f59e0b" : "var(--border)"} />
                      ))}
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: 1.5 }}>{r.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)", padding: "1.5rem" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem", color: "var(--text-main)" }}>Nearby Spots</h4>
              {nearbySpots.length === 0 ? (
                <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>No nearby spots found.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {nearbySpots.map((s) => (
                    <div key={s.id} onClick={() => navigate(ROUTES.SPOT(s.id))} style={{ display: "flex", alignItems: "center", gap: "1rem", cursor: "pointer", padding: "0.5rem", borderRadius: "8px", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-main)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} style={{ width: 48, height: 48, borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 48, height: 48, borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>{s.emoji}</span>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-main)" }}>{s.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{s.municipality + " • " + s.fee}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
