import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppProvider, useApp } from "./context/AppContext";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./services/firebase";

function Bootstrap({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const { login } = useApp();

  useEffect(() => {
    // Listen for auth state once on mount
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const { role, name } = snap.data();
            login(role, name);
          } else {
            login("user", "Traveler");
          }
        } catch (err) {
          console.error("Auth restore error:", err);
        }
      }
      // Whether logged in or not, app is ready to render
      setAuthReady(true);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authReady) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "sans-serif",
        color: "#666",
        fontSize: "1rem",
      }}>
        🗺️ Loading BiyaheBulacan...
      </div>
    );
  }

  return children;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AppProvider>
      <Bootstrap>
        <App />
      </Bootstrap>
    </AppProvider>
  </React.StrictMode>
);