import { useEffect, useState } from "react";
import "./assets/css/App.css";
import { useApp } from "./context/AppContext";
import ROUTES from "./constants/routes";
import { useAuth } from "./hooks/useAuth";

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
  const { page, toast, showToast } = useApp();
  const { initAuthListener } = useAuth();
  
  // Create a loading state to wait for Firebase to restore the session
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Listen for Firebase Session
  useEffect(() => {
    const unsubscribe = initAuthListener(() => {
      setAuthLoading(false); // Session restored, hide the loading screen!
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Show the result of a PayMongo redirect. Premium access must only be
  // granted by the verified server-side webhook, never by a URL parameter.
  useEffect(() => {
    const checkPayment = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment");

      if (paymentStatus === "success") {
        showToast("Payment received. Your Premium access is being verified.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === "cancelled") {
        showToast("Payment cancelled. You have not been charged.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (!authLoading) {
      checkPayment();
    }
  }, [authLoading, showToast]);

  const spotId = page.startsWith(ROUTES.SPOT_PREFIX)
    ? page.replace(ROUTES.SPOT_PREFIX, "")
    : null;

  // Show your FlashLoader while Firebase reconnects the user
  if (authLoading) return <FlashLoader />;

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
