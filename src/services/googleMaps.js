let loadingPromise;
let authenticationError = null;
const errorListeners = new Set();
const SCRIPT_ID = "biyahe-google-maps";

export function subscribeToMapsErrors(listener) {
  errorListeners.add(listener);
  if (authenticationError) listener(authenticationError);
  return () => errorListeners.delete(listener);
}

export function loadGoogleMaps() {
  if (authenticationError) return Promise.reject(authenticationError);
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loadingPromise) return loadingPromise;

  const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return Promise.reject(new Error("Maps are not available yet. Please try again later."));

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    let completed = false;
    const fail = (error) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      delete window.biyaheMapsReady;
      script.remove();
      loadingPromise = undefined;
      reject(error);
    };
    const timeout = setTimeout(() => fail(new Error("The map took too long to load. Check your connection and try again.")), 20000);
    window.biyaheMapsReady = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      delete window.biyaheMapsReady;
      resolve(window.google.maps);
    };
    window.gm_authFailure = () => {
      authenticationError = new Error("The map is temporarily unavailable. Please try again later.");
      fail(authenticationError);
      errorListeners.forEach((listener) => listener(authenticationError));
    };
    script.onerror = () => fail(new Error("Unable to load the map. Check your connection and try again."));
    const params = new URLSearchParams({ key, v: "quarterly", loading: "async", callback: "biyaheMapsReady", language: "en", region: "PH" });
    script.src = "https://maps.googleapis.com/maps/api/js?" + params.toString();
    document.head.appendChild(script);
  });
  return loadingPromise;
}
