let loadGoogleMaps;
let subscribeToMapsErrors;
const originalKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  delete window.google;
  delete window.gm_authFailure;
  delete window.biyaheMapsReady;
  document.getElementById("biyahe-google-maps")?.remove();
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY = "test-key";
  ({ loadGoogleMaps, subscribeToMapsErrors } = require("./googleMaps"));
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  delete window.google;
  delete window.gm_authFailure;
  delete window.biyaheMapsReady;
  document.getElementById("biyahe-google-maps")?.remove();
  if (originalKey === undefined) delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  else process.env.REACT_APP_GOOGLE_MAPS_API_KEY = originalKey;
});

test("missing configuration does not request a map", async () => {
  delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  await expect(loadGoogleMaps()).rejects.toThrow("not available yet");
  expect(document.getElementById("biyahe-google-maps")).toBeNull();
});

test("simultaneous maps share one SDK load", async () => {
  const first = loadGoogleMaps();
  const second = loadGoogleMaps();
  expect(second).toBe(first);
  expect(document.querySelectorAll("#biyahe-google-maps")).toHaveLength(1);
  window.google = { maps: { importLibrary: jest.fn() } };
  window.biyaheMapsReady();
  await expect(first).resolves.toBe(window.google.maps);
});

test("network failure allows a clean retry", async () => {
  const result = loadGoogleMaps();
  const rejection = expect(result).rejects.toThrow("Unable to load");
  document.getElementById("biyahe-google-maps").dispatchEvent(new Event("error"));
  await rejection;
  const retry = loadGoogleMaps();
  window.google = { maps: { importLibrary: jest.fn() } };
  window.biyaheMapsReady();
  await expect(retry).resolves.toBe(window.google.maps);
});

test("a hung SDK request times out rather than loading forever", async () => {
  const result = loadGoogleMaps();
  const rejection = expect(result).rejects.toThrow("too long");
  jest.advanceTimersByTime(20000);
  await rejection;
  expect(document.getElementById("biyahe-google-maps")).toBeNull();
});

test("Google authentication failures reach mounted maps even after loading", async () => {
  const listener = jest.fn();
  const unsubscribe = subscribeToMapsErrors(listener);
  const result = loadGoogleMaps();
  window.google = { maps: { importLibrary: jest.fn() } };
  window.biyaheMapsReady();
  await result;
  window.gm_authFailure();
  expect(listener).toHaveBeenCalledWith(expect.any(Error));
  await expect(loadGoogleMaps()).rejects.toThrow("temporarily unavailable");
  unsubscribe();
});
