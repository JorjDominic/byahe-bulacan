import { useEffect, useState } from "react";
import "./assets/css/App.css";
import { useApp } from "./context/AppContext";
import ROUTES from "./constants/routes";
import { useAuth } from "./hooks/useAuth";
import { db } from "./services/firebase";
import { doc, updateDoc } from "firebase/firestore";

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
  const { page, toast, userId, setPremium, showToast } = useApp();
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

  // 2. Catch PayMongo Redirects & Upgrade the User
  useEffect(() => {
    const checkPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment");

      // If payment is successful AND the user session is loaded
      if (paymentStatus === "success" && userId) {
        try {
          // A. Upgrade in Firestore Database
          await updateDoc(doc(db, "users", userId), { isPremium: true });
          
          // B. Upgrade in React's local memory
          setPremium(true);
          
          // C. Show success message
          showToast("🎉 Payment successful! You are now a Premium member!");
          
          // D. Clean the URL so it doesn't upgrade them again if they refresh
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error("Error upgrading user:", error);
          showToast("Payment recorded, but failed to upgrade account. Contact admin.");
        }
      } else if (paymentStatus === "cancelled") {
        showToast("Payment cancelled. You have not been charged.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    if (!authLoading) {
      checkPayment();
    }
  }, [authLoading, userId, setPremium, showToast]);

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