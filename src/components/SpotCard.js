import Stars from "./Stars";
import { MapPin, Tag } from "lucide-react";

export default function SpotCard({ spot, onClick }) {
  return (
    <div 
      className="spot-card" 
      onClick={onClick}
      style={{
        background: "var(--bg-secondary, #ffffff)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
      }}
    >
      {/* ── Image or emoji fallback ───────────────────────── */}
      <div style={{ background: spot.bg || "var(--border)", position: "relative", overflow: "hidden", height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {spot.imageUrl ? (
          <img
            src={spot.imageUrl}
            alt={spot.name}
            style={{
              width:      "100%",
              height:     "100%",
              objectFit:  "cover",
              display:    "block",
            }}
          />
        ) : (
          <span style={{ fontSize: "4rem" }}>{spot.emoji}</span>
        )}
        {spot.badge && (
          <span style={{ 
            position: "absolute", top: 12, right: 12, 
            background: "#f59e0b", color: "#fff", 
            padding: "4px 10px", fontSize: "0.75rem", 
            fontWeight: 700, borderRadius: 20,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}>
            {spot.badge}
          </span>
        )}
      </div>

      {/* ── Spot info ─────────────────────────────────────── */}
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: "var(--text-main)" }}>{spot.name}</h4>
        
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          <MapPin size={14} /> {spot.municipality}, Bulacan
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.75rem" }}>
          <Stars rating={spot.rating || 0} />
          <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>({spot.reviews || 0})</span>
        </div>
        
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginTop: "auto" }}>
          {spot.fee === "Free" ? "Free entrance" : spot.fee + " entrance fee"}
        </div>
        
        <div style={{ marginTop: "0.75rem" }}>
          <div style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "6px",
            fontSize:     "0.75rem",
            padding:      "4px 10px",
            borderRadius: 20,
            background:   "var(--bg-main)",
            border:       "1px solid var(--border)",
            color:        "var(--muted)",
            fontWeight:   600,
          }}>
            <Tag size={12} /> {spot.category}
          </div>
        </div>
      </div>
    </div>
  );
}