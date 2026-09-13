import { createContext, useContext, useReducer, useCallback } from "react";
import ROUTES from "../constants/routes";

const initialState = {
  page:         ROUTES.LANDING,
  isLoggedIn:   false,
  isAdmin:      false,
  isPremium:    false, // Added premium state
  userName:     "",
  userId:       "",
  avatarUrl:    "",
  itineraries:  {},
  toast:        "",
};

function appReducer(state, action) {
  switch (action.type) {
    case "NAVIGATE":
      return { ...state, page: action.payload };
    case "LOGIN":
      return {
        ...state,
        isLoggedIn: true,
        userName:   action.payload.name,
        userId:     action.payload.uid,
        isAdmin:    action.payload.role === "admin",
        isPremium:  action.payload.isPremium || false, // Set premium on login
        avatarUrl:  action.payload.avatarUrl || state.avatarUrl || "",
        page:       action.payload.role === "admin" ? ROUTES.ADMIN : ROUTES.DASHBOARD,
      };
    case "LOGOUT":
      return { ...initialState, page: ROUTES.LANDING };
    case "SET_AVATAR":
      return { ...state, avatarUrl: action.payload };
    case "SET_PREMIUM": // Added case for mock upgrading
      return { ...state, isPremium: action.payload };
    case "ADD_TO_ITINERARY": {
      const { date, spot } = action.payload;
      const existing       = state.itineraries[date] || { name: "Bulacan Trip", spots: [], status: "planning", minGap: 3 };
      if (existing.spots.some((s) => s.id === spot.id)) return state;
      return {
        ...state,
        itineraries: {
          ...state.itineraries,
          [date]: { ...existing, spots: [...existing.spots, spot] },
        },
      };
    }
    case "REMOVE_FROM_ITINERARY": {
      const { date, spotId } = action.payload;
      const existing         = state.itineraries[date];
      if (!existing) return state;
      return {
        ...state,
        itineraries: {
          ...state.itineraries,
          [date]: { ...existing, spots: existing.spots.filter((s) => s.id !== spotId) },
        },
      };
    }
    case "UPDATE_STOP_TIME": {
      const { date, spotId, time } = action.payload;
      const existing               = state.itineraries[date];
      if (!existing) return state;
      return {
        ...state,
        itineraries: {
          ...state.itineraries,
          [date]: {
            ...existing,
            spots: existing.spots.map((s) => s.id === spotId ? { ...s, time } : s),
          },
        },
      };
    }
    case "UPDATE_ITINERARY_META": {
      const { date, ...meta } = action.payload;
      const existing          = state.itineraries[date] || { name: "Bulacan Trip", spots: [], status: "planning", minGap: 3 };
      return {
        ...state,
        itineraries: {
          ...state.itineraries,
          [date]: { ...existing, ...meta },
        },
      };
    }
    case "DELETE_ITINERARY": {
      const next = { ...state.itineraries };
      delete next[action.payload];
      return { ...state, itineraries: next };
    }
    case "SET_ITINERARIES":
      return { ...state, itineraries: action.payload };
    case "SET_TOAST":
      return { ...state, toast: action.payload };
    case "CLEAR_TOAST":
      return { ...state, toast: "" };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const navigate = useCallback((page) =>
    dispatch({ type: "NAVIGATE", payload: page }), []);

  const showToast = useCallback((msg) => {
    dispatch({ type: "SET_TOAST", payload: msg });
    setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }, []);

  // Added isPremium parameter
  const login = useCallback((role, name, uid, avatarUrl = "", isPremium = false) => {
    dispatch({ type: "LOGIN", payload: { role, name, uid, avatarUrl, isPremium } });
    showToast("Welcome" + (role === "admin" ? "" : " back") + ", " + name + "!");
  }, [showToast]);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    showToast("You have been logged out.");
  }, [showToast]);

  const setAvatar = useCallback((url) =>
    dispatch({ type: "SET_AVATAR", payload: url }), []);

  // Added setPremium callback
  const setPremium = useCallback((status) => {
    dispatch({ type: "SET_PREMIUM", payload: status });
  }, []);

  const addToItinerary = useCallback((date, spot) => {
    dispatch({ type: "ADD_TO_ITINERARY", payload: { date, spot } });
    showToast("📍 " + spot.name + " added to your itinerary!");
  }, [showToast]);

  const removeFromItinerary = useCallback((date, spotId) => {
    dispatch({ type: "REMOVE_FROM_ITINERARY", payload: { date, spotId } });
    showToast("Spot removed from itinerary.");
  }, [showToast]);

  const updateStopTime = useCallback((date, spotId, time) => {
    dispatch({ type: "UPDATE_STOP_TIME", payload: { date, spotId, time } });
  }, []);

  const updateItineraryMeta = useCallback((date, meta) => {
    dispatch({ type: "UPDATE_ITINERARY_META", payload: { date, ...meta } });
  }, []);

  const deleteItinerary = useCallback((date) => {
    dispatch({ type: "DELETE_ITINERARY", payload: date });
    showToast("Itinerary deleted.");
  }, [showToast]);

  const setItineraries = useCallback((data) => {
    dispatch({ type: "SET_ITINERARIES", payload: data });
  }, []);

  const getItinerary = useCallback((date) => {
    return state.itineraries[date] || { name: "Bulacan Trip", spots: [], status: "planning", minGap: 3 };
  }, [state.itineraries]);

  const itineraryDates = Object.keys(state.itineraries).sort();

  const value = {
    ...state,
    navigate,
    login,
    logout,
    setAvatar,
    setPremium, // Added
    addToItinerary,
    removeFromItinerary,
    updateStopTime,
    updateItineraryMeta,
    deleteItinerary,
    setItineraries,
    getItinerary,
    itineraryDates,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}