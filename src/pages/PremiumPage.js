import { useState } from "react";
import { useApp } from "../context/AppContext";
import ROUTES from "../constants/routes";
import { startPremiumCheckout } from "../services/paymentService";

export default function PremiumPage() {
  const { navigate, userId, isPremium } = useApp();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!userId) {
      navigate(ROUTES.LOGIN);
      return;
    }
    
    setLoading(true);
    try {
      window.location.href = await startPremiumCheckout();
    } catch (error) {
      console.error(error);
      alert("Error connecting to payment gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "4rem 1rem", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✨</div>
      <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem", color: "var(--text)" }}>
        Upgrade to BiyaheBulacan Premium
      </h1>
      
      <p style={{ color: "var(--muted)", fontSize: "1.1rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
        Unlock the full potential of your Interactive Travel Directory with User Reviews and Itinerary Planning. Build the ultimate Bulacan adventure without limits.
      </p>

      <div style={{ background: "var(--bg-secondary)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--border)", textAlign: "left", marginBottom: "2rem" }}>
        <h3 style={{ marginTop: 0, marginBottom: "1.5rem", color: "var(--text)" }}>Premium Benefits:</h3>
        
        <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "var(--text)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <li style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span>♾️</span>
            <div>
              <strong>Unlimited Stops</strong>
              <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>Add as many tourist spots as you want to a single day.</div>
            </div>
          </li>
          <li style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span>📅</span>
            <div>
              <strong>Multi-Day Itineraries</strong>
              <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>Plan weekend getaways and week-long vacations.</div>
            </div>
          </li>
          <li style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span>⭐</span>
            <div>
              <strong>Lifetime Access</strong>
              <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>Pay once, enjoy premium features forever.</div>
            </div>
          </li>
        </ul>
      </div>

      {isPremium ? (
        <div style={{ padding: "1rem", background: "rgba(76, 175, 80, 0.15)", color: "#4CAF50", borderRadius: "8px", fontWeight: "bold" }}>
          🎉 You are already a Premium Member!
        </div>
      ) : (
        <button 
          className="btn btn-pri" 
          onClick={handleUpgrade} 
          disabled={loading}
          style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", borderRadius: "8px" }}
        >
          {loading ? "Connecting to PayMongo..." : "Upgrade Now for ₱299"}
        </button>
      )}
      
      <button 
        className="btn btn-sec" 
        onClick={() => navigate(ROUTES.BROWSE)}
        style={{ marginTop: "1rem", width: "100%", background: "transparent", border: "none" }}
      >
        Maybe Later
      </button>
    </div>
  );
}
