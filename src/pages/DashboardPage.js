import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import ROUTES from "../constants/routes";
import { getAllSpots } from "../services/spotService";

import { 
  Crown, MapPin, ArrowRight, 
  CalendarDays, Camera, Map, Wallet, Navigation 
} from "lucide-react";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

function getPHTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function getTodayPH() {
  const ph = getPHTime();
  return ph.getFullYear() + "-" +
    String(ph.getMonth() + 1).padStart(2, "0") + "-" +
    String(ph.getDate()).padStart(2, "0");
}

function parseFee(feeStr) {
  if (!feeStr) return 0;
  const num = parseInt(String(feeStr).replace(/\D/g, ''));
  return isNaN(num) ? 0 : num;
}

function getGreeting() {
  const hour = getPHTime().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { userName, userId, navigate, itineraries = {}, itineraryDates = [], getItinerary, isPremium, setPremium, showToast } = useApp();
  
  const [recommended, setRecommended]  = useState([]);
  const [reviewCount, setReviewCount]  = useState(0); 
  
  const firstName = userName ? userName.split(" ")[0] : "Traveler";
  const greeting = getGreeting();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get("payment") === "success" && userId) {
      updateDoc(doc(db, "users", userId), { 
        isPremium: true,
        premiumDate: new Date().toISOString()
      }).then(() => {
        setPremium(true);
        showToast("💎 Payment Successful! You are now a Premium member.");
        window.history.replaceState({}, document.title, "/");
      }).catch(err => {
        console.error("Failed to apply premium upgrade:", err);
      });
    } else if (params.get("payment") === "cancelled") {
      showToast("❌ Payment was cancelled.");
      window.history.replaceState({}, document.title, "/");
    }
  }, [userId, setPremium, showToast]);

  useEffect(() => {
    getAllSpots().then((data) => {
      setRecommended(data.slice(0, 3));
      
      let myReviews = 0;
      data.forEach((spot) => {
        if (spot.reviews && Array.isArray(spot.reviews)) {
          myReviews += spot.reviews.filter((r) => r.userId === userId).length;
        } 
        else if (spot.reviews && typeof spot.reviews === 'object') {
          Object.values(spot.reviews).forEach((r) => {
            if (r.userId === userId) myReviews++;
          });
        }
      });
      setReviewCount(myReviews);
    });
  }, [userId]);

  const todayPH = getTodayPH();
  const futureDates = itineraryDates.filter(date => date >= todayPH).sort();
  const upcomingDate = futureDates.length > 0 ? futureDates[0] : null;
  const upcomingTrip = upcomingDate ? getItinerary(upcomingDate) : null;
  const upcomingSpots = upcomingTrip ? upcomingTrip.spots || [] : [];
  const upcomingCount = upcomingSpots.length;

  let totalSpots = 0;
  let totalFee = 0;
  Object.values(itineraries).forEach(trip => {
    if (trip.spots) {
      totalSpots += trip.spots.length;
      totalFee += trip.spots.reduce((sum, spot) => sum + parseFee(spot.fee), 0);
    }
  });

  return (
    <div style={{ paddingBottom: "3rem" }}>
      
      {/* ── Dashboard Header ───────────────────────────────────── */}
      <div style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "1.5rem 2rem",
        transition: "all 0.3s ease"
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          
          <div>
            <h2 style={{ fontSize: "1.8rem", margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
              {greeting}, {firstName}!
            </h2>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.95rem" }}>
              Ready for your next Bulacan adventure?
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button className="btn btn-pri btn-sm" onClick={() => navigate(ROUTES.BROWSE)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Map size={16} /> Explore Spots
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "2rem", maxWidth: 1100, margin: "0 auto" }}>
        
        {/* ── Stats Row ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          
          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "1rem", transition: "all 0.3s ease" }}>
            <div style={{ background: "rgba(46, 204, 113, 0.15)", padding: "12px", borderRadius: "10px", color: "var(--pri)" }}>
              <CalendarDays size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Active Itineraries</div>
              <div className="stat-val" style={{ fontSize: "1.8rem", fontWeight: 800, margin: "4px 0" }}>{itineraryDates.length}</div>
              <div style={{ fontSize: "0.8rem", color: isPremium ? "var(--pri)" : "var(--muted)", fontWeight: isPremium ? 600 : 400, display: "flex", alignItems: "center", gap: "4px" }}>
                {isPremium ? <><Crown size={12}/> Unlimited unlocked</> : "1 trip limit (Free)"}
              </div>
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "1rem", transition: "all 0.3s ease" }}>
            <div style={{ background: "rgba(52, 152, 219, 0.15)", padding: "12px", borderRadius: "10px", color: "#3498db" }}>
              <MapPin size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Spots Saved</div>
              <div className="stat-val" style={{ fontSize: "1.8rem", fontWeight: 800, margin: "4px 0" }}>{totalSpots}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>across all trips</div>
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", display: "flex", alignItems: "flex-start", gap: "1rem", transition: "all 0.3s ease" }}>
            <div style={{ background: "rgba(241, 196, 15, 0.15)", padding: "12px", borderRadius: "10px", color: "#f39c12" }}>
              <Wallet size={24} />
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Trip Cost</div>
              <div className="stat-val" style={{ fontSize: "1.8rem", fontWeight: 800, margin: "4px 0" }}>₱{totalFee}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>entrance fees estimated</div>
            </div>
          </div>

        </div>

        {/* ── Itinerary Preview ────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>My Upcoming Itinerary</h3>
          <button className="btn btn-sec btn-sm" onClick={() => navigate(ROUTES.ITINERARY)} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            View Full <ArrowRight size={14} />
          </button>
        </div>
        
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", marginBottom: "2.5rem", transition: "all 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "1.1rem" }}>
              <Navigation size={18} color="var(--pri)" /> 
              {upcomingTrip ? upcomingTrip.name : "Bulacan Day Trip"} {upcomingDate ? <span style={{ color: "var(--muted)", fontWeight: 400 }}>({upcomingDate})</span> : ""}
            </h4>
            <span style={{ background: "rgba(46, 204, 113, 0.15)", color: "var(--pri)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
              {upcomingCount} stops
            </span>
          </div>

          {upcomingCount === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: "1rem 0" }}>
              No upcoming spots.{" "}
              <span style={{ color: "var(--pri)", cursor: "pointer", fontWeight: 600 }} onClick={() => navigate(ROUTES.BROWSE)}>
                Browse destinations <ArrowRight size={14} style={{ verticalAlign: "middle" }}/>
              </span>
            </p>
          ) : (
            upcomingSpots.slice(0, 4).map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px dashed var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--muted)", width: "60px" }}>{s.time}</div>
                <div style={{ flex: 1, fontWeight: 500, color: "var(--text-main)" }}>{s.name}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{s.fee}</div>
              </div>
            ))
          )}
        </div>

        {/* ── Recommended ──────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>Recommended For You</h3>
          <button className="btn btn-sec btn-sm" onClick={() => navigate(ROUTES.BROWSE)} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            See All <ArrowRight size={14} />
          </button>
        </div>

        <div className="mini-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {recommended.map((s) => (
            <div key={s.id} onClick={() => navigate(ROUTES.SPOT(s.id))} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", cursor: "pointer", transition: "all 0.3s ease" }}>
              {s.imageUrl ? (
                <img
                  src={s.imageUrl}
                  alt={s.name}
                  style={{ width: "100%", height: "140px", objectFit: "cover" }}
                />
              ) : (
                <div style={{ background: s.bg, height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>{s.emoji}</div>
              )}
              <div style={{ padding: "1rem" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "1rem" }}>{s.name}</h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>{s.municipality} • {s.fee}</p>
              </div>
            </div>
          ))}
          <div onClick={() => navigate(ROUTES.BROWSE)} style={{ background: "var(--bg-secondary)", border: "1px dashed var(--border)", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", minHeight: "210px", transition: "all 0.3s ease" }}>
            <div style={{ background: "var(--border)", width: 50, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
              <ArrowRight size={24} color="var(--muted)" />
            </div>
            <h4 style={{ margin: "0 0 4px 0" }}>Browse All Spots</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>15+ destinations</p>
          </div>
        </div>

        {/* ── Quick Links ──────────────────────────────────────── */}
        <div style={{
          marginTop:    "2.5rem",
          padding:      "1.5rem",
          background:   "var(--bg-secondary)",
          borderRadius: 12,
          border:       "1px solid var(--border)",
          display:      "flex",
          gap:          "1rem",
          flexWrap:     "wrap",
          alignItems:   "center",
          transition:   "all 0.3s ease"
        }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", width: "100%", marginBottom: "0.25rem", letterSpacing: "1px" }}>
            QUICK ACTIONS
          </div>
          <button className="btn btn-sec btn-sm" onClick={() => navigate(ROUTES.ITINERARY)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-main)" }}>
            <CalendarDays size={16} /> My Itinerary
          </button>
          <button className="btn btn-sec btn-sm" onClick={() => navigate(ROUTES.FEED)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-main)" }}>
            <Camera size={16} /> Community Feed
          </button>
          <button className="btn btn-sec btn-sm" onClick={() => navigate(ROUTES.BROWSE)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-main)" }}>
            <Map size={16} /> Explore Spots
          </button>
        </div>
      </div>
    </div>
  );
}