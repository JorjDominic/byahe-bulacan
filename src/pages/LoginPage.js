import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";
import ROUTES from "../constants/routes";
import bulacanSeal from "../assets/images/byahebulacan.png";
import { CheckCircle2, CalendarDays, Star, Camera } from "lucide-react";

// 1. Firebase imports para sa Forgot Password
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";

// ─── Password strength checker ────────────────────────────
function getPasswordStrength(password) {
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks };
}

// ─── Password strength bar ────────────────────────────────
function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const { score, checks } = getPasswordStrength(password);
  const labels = ["", "Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#27ae60"];
  const widths = ["0%", "20%", "40%", "60%", "80%", "100%"];
  return (
    <div style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
      <div style={{ width: "100%", height: 6, background: "#e0e0e0", borderRadius: 4, overflow: "hidden", marginBottom: "0.4rem" }}>
        <div style={{
          width: widths[score], height: "100%",
          background: colors[score], borderRadius: 4,
          transition: "width 0.3s ease, background 0.3s ease",
        }} />
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: colors[score], marginBottom: "0.4rem" }}>
        {labels[score]}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
        {[
          { key: "length",    label: "8+ characters" },
          { key: "uppercase", label: "Uppercase"      },
          { key: "lowercase", label: "Lowercase"      },
          { key: "number",    label: "Number"         },
          { key: "special",   label: "Special (!@#)"  },
        ].map(({ key, label }) => (
          <span key={key} style={{
            fontSize: "0.7rem", padding: "2px 8px", borderRadius: 20,
            background: checks[key] ? "#e8f5ee" : "#f5f5f5",
            color:      checks[key] ? "#1a5c3c" : "#999",
            fontWeight: checks[key] ? 600 : 400,
            transition: "all 0.2s ease",
          }}>
            {checks[key] ? "✓" : "○"} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Password input with show/hide eye ───────────────────
function PasswordInput({ placeholder, value, onChange, onKeyDown, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        style={{ paddingRight: "2.5rem", width: "100%", boxSizing: "border-box" }}
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        style={{
          position: "absolute", right: "0.75rem", top: "50%",
          transform: "translateY(-50%)", background: "none",
          border: "none", cursor: "pointer", padding: 0,
          color: "var(--muted)", display: "flex", alignItems: "center",
        }}
        tabIndex={-1}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { navigate }                                 = useApp();
  const { signIn, signUp, error, setError, loading } = useAuth();

  const [tab,          setTab]          = useState("login");
  const [email,        setEmail]        = useState("");
  const [pass,         setPass]         = useState("");
  const [suFirstName,  setSuFirstName]  = useState("");
  const [suMiddleName, setSuMiddleName] = useState("");
  const [suLastName,   setSuLastName]   = useState("");
  const [suEmail,      setSuEmail]      = useState("");
  const [suPass,       setSuPass]       = useState("");
  const [suPass2,      setSuPass2]      = useState("");
  
  // State para sa Forgot Password message
  const [resetMessage, setResetMessage] = useState("");

  const handleLogin = async () => {
    await signIn(email, pass);
  };

  const handleSignUp = async () => {
    setError("");
    if (!suFirstName.trim()) { setError("First name is required."); return; }
    if (!suLastName.trim())  { setError("Last name is required.");  return; }
    const { score } = getPasswordStrength(suPass);
    if (score < 3) {
      setError("Password is too weak. Please meet at least 3 requirements.");
      return;
    }
    const fullName = [suFirstName.trim(), suMiddleName.trim(), suLastName.trim()]
      .filter(Boolean).join(" ");
    await signUp(fullName, suEmail, suPass, suPass2);
  };

  // Function para mag-send ng Forgot Password email
  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");
    
    if (!email.trim()) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset link sent! Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Make sure the email is registered.");
    }
  };

  // Na-update para ma-clear din ang resetMessage kapag lumipat ng tab
  const switchTab = (t) => { 
    setTab(t); 
    setError(""); 
    setResetMessage(""); 
  };

  return (
    <div className="auth-wrap">

      {/* ── Left Panel ───────────────────────────────────── */}
      <div className="auth-left" style={{ position: "relative", overflow: "hidden" }}>

        {/* Background pattern */}
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* BiyaheBulacan Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
            <div style={{
              position: "relative",
              display:  "inline-block",
              background: "#fff",
              padding: "12px",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
            }}>
              <img
                src={bulacanSeal}
                alt="BiyaheBulacan Official Logo"
                style={{
                  width:        260, 
                  height:       "auto",
                  borderRadius: "8px",
                  display:      "block",
                }}
              />
              <div style={{
                position:      "absolute",
                inset:         -8,
                borderRadius:  "22px",
                border:        "2px solid rgba(255,255,255,0.2)",
                pointerEvents: "none",
              }} />
            </div>
          </div>

          <div style={{
            textAlign:     "center",
            fontSize:      "0.75rem",
            letterSpacing: "0.15em",
            color:         "rgba(255,255,255,0.75)",
            fontWeight:    600,
            marginBottom:  "0.75rem",
            textTransform: "uppercase",
          }}>
            Province of Bulacan, Philippines
          </div>

          <h2 style={{ textAlign: "center", marginBottom: "0.75rem", fontSize: "2rem" }}>
            Discover Bulacan,<br />One Spot at a Time
          </h2>
          <p style={{ textAlign: "center", marginBottom: "2rem", opacity: 0.9, fontSize: "1.05rem" }}>
            Plan your perfect itinerary, share your adventures, and connect with fellow travelers.
          </p>

          {/* Mga Bagong SVG Icons para sa Perks */}
          <ul className="auth-perks" style={{ listStyle: "none", padding: 0, margin: "0 auto", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
              <CheckCircle2 size={22} color="#2ecc71" style={{ flexShrink: 0 }} /> 
              <span>Free account, no credit card needed</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
              <CalendarDays size={22} color="#f39c12" style={{ flexShrink: 0 }} /> 
              <span>Build unlimited itineraries</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
              <Star size={22} color="#f1c40f" style={{ flexShrink: 0 }} /> 
              <span>Write reviews for places you visit</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
              <Camera size={22} color="#e74c3c" style={{ flexShrink: 0 }} /> 
              <span>Share stories on community feed</span>
            </li>
          </ul>

          {/* Stats row */}
          <div style={{
            display:       "flex",
            gap:           "0.75rem",
            marginTop:     "2.5rem",
            padding:       "1.25rem",
            background:    "rgba(255,255,255,0.1)",
            borderRadius:  12,
            border:        "1px solid rgba(255,255,255,0.15)",
          }}>
            {[
              { val: "15+",   lbl: "Tourist Spots" },
              { val: "24",    lbl: "Municipalities" },
              { val: "Free",  lbl: "To Join"        },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#fff" }}>{val}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ──────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-form">

          {/* Small Logo Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "2rem" }}>
            <img
              src={bulacanSeal}
              alt="Bulacan"
              style={{ width: 60, height: "auto", borderRadius: "4px", objectFit: "contain" }}
            />
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)" }}>BiyaheBulacan</span>
          </div>

          <h3>{tab === "login" ? "Welcome back" : "Create your account"}</h3>
          <p className="auth-sub">
            {tab === "login"
              ? "Sign in to continue planning your Bulacan adventure."
              : "Start exploring Bulacan's best destinations."}
          </p>

          <div className="auth-tabs">
            <button
              className={"auth-tab " + (tab === "login"  ? "active" : "")}
              onClick={() => switchTab("login")}
            >Log In</button>
            <button
              className={"auth-tab " + (tab === "signup" ? "active" : "")}
              onClick={() => switchTab("signup")}
            >Sign Up</button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {/* ── Login Form ──────────────────────────────── */}
          {tab === "login" ? (
            <>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  disabled={loading}
                />
              </div>
              
              {/* Forgot Password Link & Success Message */}
              <div style={{ textAlign: "right", marginBottom: "1rem" }}>
                <span 
                  className="link-text" 
                  onClick={handleForgotPassword}
                  style={{ cursor: "pointer", color: "var(--pri)", fontWeight: 600 }}
                >
                  Forgot password?
                </span>
              </div>

              {resetMessage && (
                <div style={{ 
                  color: "#27ae60", 
                  fontSize: "0.85rem", 
                  marginBottom: "1rem", 
                  textAlign: "center", 
                  fontWeight: 600,
                  background: "#e8f5ee",
                  padding: "8px",
                  borderRadius: "6px"
                }}>
                  ✓ {resetMessage}
                </div>
              )}

              <button
                className="form-submit"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Log In"}
              </button>
            </>
          ) : (

            /* ── Sign Up Form ────────────────────────────── */
            <>
              {/* First + Last name */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>First name <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Juan"
                    value={suFirstName}
                    onChange={(e) => setSuFirstName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Last name <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="dela Cruz"
                    value={suLastName}
                    onChange={(e) => setSuLastName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Middle name */}
              <div className="form-group">
                <label>
                  Middle name{" "}
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Santos"
                  value={suMiddleName}
                  onChange={(e) => setSuMiddleName(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email address <span style={{ color: "red" }}>*</span></label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={suEmail}
                  onChange={(e) => setSuEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password <span style={{ color: "red" }}>*</span></label>
                <PasswordInput
                  placeholder="Create a strong password"
                  value={suPass}
                  onChange={(e) => setSuPass(e.target.value)}
                  disabled={loading}
                />
                <PasswordStrengthBar password={suPass} />
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label>Confirm password <span style={{ color: "red" }}>*</span></label>
                <PasswordInput
                  placeholder="Repeat password"
                  value={suPass2}
                  onChange={(e) => setSuPass2(e.target.value)}
                  disabled={loading}
                />
                {suPass2 && (
                  <div style={{
                    fontSize: "0.75rem", marginTop: "0.3rem",
                    color:    suPass === suPass2 ? "#2ecc71" : "#e74c3c",
                    fontWeight: 600,
                  }}>
                    {suPass === suPass2 ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </div>
                )}
              </div>

              <button
                className="form-submit"
                onClick={handleSignUp}
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </>
          )}

          <p className="auth-back">
            <span className="link-text" onClick={() => navigate(ROUTES.LANDING)}>
              ← Back to homepage
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}