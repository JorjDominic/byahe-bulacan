import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../hooks/useAuth";
import ROUTES from "../constants/routes";
import ProfileModal from "./ProfileModal";
import { Sun, Moon, Menu, X } from "lucide-react";
import navLogo from "../assets/images/byahebulacan.png";

export default function Nav() {
  const { page, isLoggedIn, isAdmin, navigate, userName, avatarUrl } = useApp();
  const { signOutUser } = useAuth();
  
  const [showProfile, setShowProfile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Dark Mode State - Persistent, but strictly defaults to false if not logged in
  const [isDark, setIsDark] = useState(() => {
    if (!isLoggedIn) return false;
    return localStorage.getItem("biyaheDarkMode") === "true";
  });

  // Force light mode instantly whenever a user logs out or visits as a guest
  useEffect(() => {
    if (!isLoggedIn) {
      setIsDark(false);
    }
  }, [isLoggedIn]);

  // Apply Dark Mode class to body
  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("biyaheDarkMode", "true");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("biyaheDarkMode", "false");
    }
  }, [isDark]);

  if (isAdmin) return null;

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  // Helper function: Navigate and close mobile menu
  const handleNav = (route) => {
    navigate(route);
    setIsMobileOpen(false);
  };

  // Helper function: Toggle dark mode
  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  // Logout with theme reset
  const handleLogout = () => {
    signOutUser();
    setIsDark(false); // Instantly switches UI to light mode
    localStorage.removeItem("biyaheDarkMode"); // Clears the saved preference
    setIsMobileOpen(false);
  };

  return (
    <>
      <style>{`
        /* Global Variables for easy theme control */
        body { background-color: var(--bg-main, #f7f8f5); color: var(--text-main, #2d3127); transition: background-color 0.3s, color 0.3s; }
        
        body.dark-mode {
          --bg-main: #121212;
          --bg-secondary: #1f2937;
          --text-main: #e5e7eb;
          --border: #374151;
          --muted: #9ca3af;
        }

        .nav {
          background-color: var(--bg-secondary, #ffffff) !important;
          border-bottom: 1px solid var(--border, #e2e6de) !important;
          transition: all 0.3s ease;
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 0.75rem 0;
        }
        .nav-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .nav-links { display: flex; align-items: center; gap: 1rem; }
        
        .nav-btn { background: none; border: none; cursor: pointer; color: var(--text-main); font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .nav-btn:hover { background: var(--border); }
        .nav-btn.active { background: var(--pri, #1a5c3c); color: #fff; }
        
        /* Dark Mode Overrides for Active Buttons */
        .dark-mode .nav-btn.active { background-color: #374151 !important; color: #34d399 !important; border: 1px solid #34d399; }
        
        .hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--text-main); }
        
        @media (max-width: 768px) {
          .hamburger { display: block; }
          .nav-links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            flex-direction: column;
            background-color: var(--bg-secondary, #ffffff);
            border-bottom: 1px solid var(--border);
            padding: 1.5rem;
            gap: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          }
          .nav-links.mobile-open { display: flex; }
          .nav-links > button, .nav-links > div { width: 100%; justify-content: center; }
        }
      `}</style>

      <nav className="nav">
        <div className="nav-inner">
          {/* Logo */}
          <div
            className="logo"
            onClick={() => handleNav(isLoggedIn ? ROUTES.DASHBOARD : ROUTES.LANDING)}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "0.6rem" }}
          >
            <img src={navLogo} alt="BiyaheBulacan" style={{ height: "52px", width: "auto", display: "block" }} />
            <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--pri, #1a5c3c)", letterSpacing: "-0.01em" }}>
              BiyaheBulacan
            </span>
          </div>

          {/* Hamburger Icon */}
          <button className="hamburger" onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Links */}
          <div className={`nav-links ${isMobileOpen ? "mobile-open" : ""}`}>
            {isLoggedIn ? (
              <>
                <button className={`nav-btn ${page === ROUTES.DASHBOARD ? "active" : ""}`} onClick={() => handleNav(ROUTES.DASHBOARD)}>Home</button>
                <button className={`nav-btn ${page === ROUTES.BROWSE    ? "active" : ""}`} onClick={() => handleNav(ROUTES.BROWSE)}>Explore</button>
                <button className={`nav-btn ${page === ROUTES.ITINERARY ? "active" : ""}`} onClick={() => handleNav(ROUTES.ITINERARY)}>My Itinerary</button>
                <button className={`nav-btn ${page === ROUTES.FEED      ? "active" : ""}`} onClick={() => handleNav(ROUTES.FEED)}>Community</button>

                {/* Dark mode toggle ONLY visible when logged in */}
                <button onClick={toggleDarkMode} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-main)", padding: "8px" }}>
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div
                  onClick={() => { setShowProfile(true); setIsMobileOpen(false); }}
                  style={{ cursor: "pointer", width: 36, height: 36, borderRadius: "50%", background: "var(--pri)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="User" style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}}/> : initials}
                </div>
                
                <button className="btn btn-sm" onClick={handleLogout} style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)" }}>Log Out</button>
              </>
            ) : (
              <>
                <button className={`nav-btn ${page === ROUTES.LANDING ? "active" : ""}`} onClick={() => handleNav(ROUTES.LANDING)}>Home</button>
                <button className={`nav-btn ${page === ROUTES.BROWSE  ? "active" : ""}`} onClick={() => handleNav(ROUTES.BROWSE)}>Explore</button>
                <button className={`nav-btn ${page === ROUTES.FEED    ? "active" : ""}`} onClick={() => handleNav(ROUTES.FEED)}>Community</button>
                
                {/* No Dark mode toggle here for guests */}
                
                <button className="btn btn-sec btn-sm" onClick={() => handleNav(ROUTES.LOGIN)}>Log In</button>
                <button className="btn btn-pri btn-sm" onClick={() => handleNav(ROUTES.LOGIN)}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}