import { useEffect, useState } from "react";
import "./assets/css/App.css";
import { useApp } from "./context/AppContext";
import ROUTES from "./constants/routes";
import { useAuth } from "./hooks/useAuth";
import { getUserItineraries } from "./services/spotService";
import { verifyPremiumPayment, waitForPremiumAccess } from "./services/paymentService";

// Components
import Nav from "./components/Nav";
import Toast from "./components/Toast";
import FlashLoader from "./components/FlashLoader";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BrowsePage from "./pages/BrowsePage";
import SpotDetailPage from "./pages/SpotDetailPage";
import ItineraryPage from "./pages/ItineraryPage";
import FeedPage from "./pages/FeedPage";
import AdminPage from "./pages/AdminPage";
import PremiumPage from "./pages/PremiumPage";

export default function App() {
  const { page, toast, showToast, userId, setItineraries, setPremium } = useApp();
  const { initAuthListener, signOutUser } = useAuth();
  
  // Create a loading state to wait for Firebase to restore the session
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // 1. Listen for Firebase Session
  useEffect(() => {
    const unsubscribe = initAuthListener((failure) => {
      setAuthError(failure?.message || "");
      setAuthLoading(false); // Session restored, hide the loading screen!
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Show the result of a PayMongo redirect. Premium access must only be
  // granted by the verified server-side webhook, never by a URL parameter.
  useEffect(() => {
    let cancelled = false;
    const checkPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment");

      if (paymentStatus === "success") {
        showToast("Payment received. Your Premium access is being verified.");
        window.history.replaceState({}, document.title, window.location.pathname);
        if (userId) {
          try {
            let verified = false;
            const orderId = urlParams.get("order");
            if (orderId) {
              try {
                verified = await verifyPremiumPayment(orderId);
              } catch (error) {
                console.error("Payment lookup failed; waiting for webhook:", error);
              }
            }
            if (cancelled) return;
            if (!verified) verified = await waitForPremiumAccess(userId);
            if (cancelled) return;
            if (verified) {
              setPremium(true);
              showToast("Premium access is now active!");
            } else {
              showToast("Payment verification is still processing. Please refresh shortly.");
            }
          } catch (error) {
            if (cancelled) return;
            console.error("Premium verification error:", error);
            showToast("Premium status could not be refreshed. Please try again.");
          }
        }
      } else if (paymentStatus === "cancelled") {
        showToast("Payment cancelled. You have not been charged.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (!authLoading) {
      checkPayment();
    }
    return () => { cancelled = true; };
  }, [authLoading, userId, setPremium, showToast]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setItineraries({});
      return undefined;
    }
    getUserItineraries(userId)
      .then((data) => { if (!cancelled) setItineraries(data); })
      .catch((error) => {
        console.error("Itinerary restoration error:", error);
        if (!cancelled) showToast("Saved trips could not be loaded. Please try again.");
      });
    return () => { cancelled = true; };
  }, [userId, setItineraries, showToast]);

  const spotId = page.startsWith(ROUTES.SPOT_PREFIX)
    ? page.replace(ROUTES.SPOT_PREFIX, "")
    : null;

  // Show your FlashLoader while Firebase reconnects the user
  if (authLoading) return <FlashLoader />;
  if (authError) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h2>We couldn't load your profile</h2>
          <p>{authError}</p>
          <button className="btn" onClick={() => signOutUser().then(() => setAuthError(""))}>Sign out and try again</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav />
      <Toast msg={toast} />
      
      {page === ROUTES.LANDING   && <LandingPage />}
      {page === ROUTES.LOGIN     && <LoginPage />}
      {page === ROUTES.DASHBOARD && <DashboardPage />}
      {page === ROUTES.BROWSE    && <BrowsePage />}
      {page === ROUTES.ITINERARY && <ItineraryPage />}
      {page === ROUTES.FEED      && <FeedPage />}
      {page === ROUTES.ADMIN     && <AdminPage />}
      {page === ROUTES.PREMIUM   && <PremiumPage />}
      {spotId                    && <SpotDetailPage spotId={spotId} />}
    </div>
  );
}
