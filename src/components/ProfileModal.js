import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ProfileModal({ onClose }) {
  const { userName, userId, avatarUrl: currentAvatar, setAvatar, showToast, isPremium } = useApp();
  
  const firstName    = userName ? userName.split(" ")[0] : "Traveler";
  const [nickname,   setNickname]   = useState(firstName);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");
  
  const [activeTab,  setActiveTab]  = useState("profile");
  const [uploading,  setUploading]  = useState(false);
  const [newAvatar,  setNewAvatar]  = useState("");
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || "");
  const fileRef                     = useRef(null);

  const initials     = userName     ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()     : "?";
  const avatarColors = ["#1a5c3c","#b8760a","#533ab7","#c0392b","#2980b9","#16a085","#8e44ad","#d35400"];
  const avatarBg     = avatarColors[userId?.charCodeAt(0) % avatarColors.length] || "#1a5c3c";

  const handleImagePick = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setError("");
    try {
      const CLOUD  = process.env.REACT_APP_CLOUDINARY_CLOUD;
      const PRESET = process.env.REACT_APP_CLOUDINARY_PRESET;
      const fd     = new FormData();
      fd.append("file",          file);
      fd.append("upload_preset", PRESET);
      const res  = await fetch(
        "https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload",
        { method: "POST", body: fd }
      );
      const data = await res.json();
      setNewAvatar(data.secure_url);
      showToast("📸 Photo uploaded!");
    } catch (err) {
      setError("Failed to upload photo.");
      setPreviewUrl(currentAvatar || "");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl("");
    setNewAvatar("remove");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError("Nickname is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updates = { nickname: nickname.trim() };
      if (newAvatar === "remove") {
        updates.avatarUrl = "";
        setAvatar("");
      } else if (newAvatar) {
        updates.avatarUrl = newAvatar;
        setAvatar(newAvatar);
      }
      await updateDoc(doc(db, "users", userId), updates);
      setSuccess("✅ Profile updated!");
      showToast("✅ Profile updated!");
      setNewAvatar("");
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Failed to update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── VERCEL API PAYMONGO UPGRADE LOGIC ───
  const handleUpgrade = async () => {
    setSaving(true);
    setError("");
    showToast("🔌 Connecting to secure payment gateway...");
    
    try {
      // Call your FREE Vercel backend
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          userName: userName || "Traveler",
          userEmail: "user@example.com"
        })
      });

      const data = await response.json();

      if (data?.data?.attributes?.checkout_url) {
        // Send the user to the real PayMongo payment page
        window.location.href = data.data.attributes.checkout_url;
      } else {
        throw new Error("No checkout URL returned.");
      }

    } catch (err) {
      console.error("Upgrade error:", err);
      setError("Failed to connect to payment gateway.");
      setSaving(false);
    }
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--bg)", borderRadius: 16, padding: "1.5rem", maxWidth: 400, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0 }}>My Profile</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--muted)" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {["profile", "password", "subscription"].map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setError(""); setSuccess(""); }}
              style={{
                flex: 1, padding: "0.5rem", borderRadius: 8,
                border:     "1.5px solid var(--border)",
                background: activeTab === t ? "var(--pri)" : "transparent",
                color:      activeTab === t ? "#fff" : "var(--muted)",
                cursor:     "pointer", fontFamily: "var(--font-body)",
                fontSize:   "0.75rem", fontWeight: 600, textTransform: "capitalize"
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {error   && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}
        {success && (
          <div style={{ background: "#e8f5ee", color: "#1a5c3c", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.875rem" }}>
            {success}
          </div>
        )}

        {/* ── Profile Tab ─────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Profile"
                    style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)" }}
                  />
                ) : (
                  <div style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: avatarBg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "2rem", fontWeight: 700, color: "#fff",
                    border: "3px solid var(--border)",
                  }}>
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--pri)", border: "2px solid #fff",
                    cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                  title="Upload profile picture"
                >
                  {uploading ? (
                    <div style={{ width: 10, height: 10, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} />
                  ) : (
                    <span style={{color: '#fff', fontSize: '0.8rem'}}>📷</span>
                  )}
                </button>
              </div>
              {uploading && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Uploading...</div>}
              {displayAvatar && !uploading && (
                <button
                  onClick={handleRemovePhoto}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#c0392b", fontFamily: "var(--font-body)" }}
                >
                  Remove photo
                </button>
              )}
              {!displayAvatar && !uploading && (
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Click camera to upload photo</div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleImagePick(e.target.files[0])}
              />
              <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: "0.5rem" }}>
                {userName} {isPremium && <span title="Premium Member">💎</span>}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>BiyaheBulacan Explorer</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.3rem", color: "var(--muted)" }}>
                NICKNAME <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Gab"
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "var(--font-body)", fontSize: "0.875rem", background: "var(--bg)", boxSizing: "border-box" }}
              />
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                {`Dashboard greeting: "Good morning, ${nickname.trim() || firstName}! 👋"`}
              </div>
            </div>

            <button className="btn btn-pri" style={{ width: "100%" }} onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </>
        )}

        {/* ── Password Tab ────────────────────────────────────────────────── */}
        {activeTab === "password" && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔐</div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Password Change</div>
            <div style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Password change feature is coming soon!
            </div>
            <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "1rem", border: "1px solid var(--border)", fontSize: "0.82rem", color: "var(--muted)", textAlign: "left" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Coming soon:</div>
              <div style={{ marginBottom: "0.25rem" }}>• Change current password</div>
              <div style={{ marginBottom: "0.25rem" }}>• Requires current password to confirm</div>
              <div>• Password strength validation</div>
            </div>
          </div>
        )}

        {/* ── Subscription Tab ────────────────────────────────────────────── */}
        {activeTab === "subscription" && (
          <div style={{ textAlign: "center", padding: "1rem" }}>
             {isPremium ? (
               <>
                 <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💎</div>
                 <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--pri)", marginBottom: "0.5rem" }}>Premium Active</div>
                 <p style={{ fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                   You have unlocked unlimited itineraries and multi-day planning capabilities. Happy traveling!
                 </p>
               </>
             ) : (
               <>
                 <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
                 <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--dark)", marginBottom: "0.5rem" }}>Free Tier</div>
                 <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                   You are currently limited to <strong>1 active itinerary</strong> with a maximum of <strong>3 spots</strong> per day.
                 </p>
                 
                 <div style={{ background: "var(--acc-light)", borderRadius: 10, padding: "1rem", border: "1px solid var(--acc)", textAlign: "left", marginBottom: "1.5rem" }}>
                   <div style={{ fontWeight: 700, color: "#b8760a", marginBottom: "0.5rem" }}>Premium Perks:</div>
                   <div style={{ fontSize: "0.8rem", color: "var(--dark)", marginBottom: "0.25rem" }}>✅ Unlimited spots per trip</div>
                   <div style={{ fontSize: "0.8rem", color: "var(--dark)", marginBottom: "0.25rem" }}>✅ Unlimited saved itineraries</div>
                   <div style={{ fontSize: "0.8rem", color: "var(--dark)" }}>✅ Multi-day trip planning</div>
                 </div>

                 <button className="btn btn-pri" style={{ width: "100%", background: "var(--acc)", border: "none" }} onClick={handleUpgrade} disabled={saving}>
                   {saving ? "Processing..." : "💎 Upgrade with PayMongo"}
                 </button>
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
