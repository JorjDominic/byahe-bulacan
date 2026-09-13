// src/constants/routes.js
// All page route names in one place.
// Never type "landing", "browse" etc. as raw strings again.

const ROUTES = {
  LANDING: "landing",
  LOGIN: "login",
  DASHBOARD: "dashboard",
  BROWSE: "browse",
  FEED: "feed",
  ITINERARY: "itinerary",
  ADMIN: "admin",
  PREMIUM: "/premium",
  SPOT: (id) => `spot-${id}`,       // dynamic: ROUTES.SPOT("biak")
  SPOT_PREFIX: "spot-",             // for parsing: page.startsWith(ROUTES.SPOT_PREFIX)
};

export default ROUTES;