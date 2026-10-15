import { useEffect, useRef, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { hasGoogleMapsKey, loadGoogleMaps, subscribeToMapsErrors } from "../services/googleMaps";
import { getCoordinates, LOCATION_TYPES } from "../utils/coordinates";
import "./DestinationMap.css";

const BULACAN_CENTER = { lat: 14.85, lng: 120.82 };

export default function DestinationMap({
  locations = [], selectedId = null, onSelect, editable = false, onLocationChange,
  title = "Location map", route = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const sdkRef = useRef(null);
  const pickRef = useRef(onLocationChange);
  const selectRef = useRef(onSelect);
  const boundsRef = useRef(null);
  const routeBoundsRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  pickRef.current = onLocationChange;
  selectRef.current = onSelect;

  // Serialize just the map data so unrelated form updates don't recreate markers.
  const mapData = JSON.stringify(locations.map((location, index) => ({
    id: String(location.id ?? index), name: location.name || "Destination",
    position: getCoordinates(location), index: index + 1,
    locationType: LOCATION_TYPES[location.locationType] || LOCATION_TYPES.destination,
    locationLabel: location.locationLabel || "", verified: location.locationVerified === true,
  })));
  const hasPins = JSON.parse(mapData).some((location) => location.position);
  const shouldLoad = editable || hasPins;

  useEffect(() => {
    setError("");
    setReady(false);
    if (!shouldLoad) return;
    let cancelled = false;
    let clickListener;
    const container = containerRef.current;
    const unsubscribe = subscribeToMapsErrors((failure) => {
      if (!cancelled) { setError(failure.message); setReady(false); }
    });
    loadGoogleMaps().then(async (maps) => {
      const [mapLibrary, markerLibrary] = await Promise.all([
        maps.importLibrary("maps"), maps.importLibrary("marker"),
      ]);
      if (cancelled) return;
      const map = new mapLibrary.Map(container, {
        center: BULACAN_CENTER, zoom: 10,
        mapId: process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        clickableIcons: false, gestureHandling: "cooperative",
      });
      sdkRef.current = { maps, AdvancedMarkerElement: markerLibrary.AdvancedMarkerElement };
      mapRef.current = map;
      if (editable) {
        clickListener = map.addListener("click", (event) => {
          if (event.latLng) pickRef.current?.(event.latLng.toJSON());
        });
      }
      setReady(true);
    }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => {
      cancelled = true;
      unsubscribe();
      clickListener?.remove();
      mapRef.current = null;
      sdkRef.current = null;
      container?.replaceChildren();
    };
  }, [shouldLoad, editable, attempt]);

  useEffect(() => {
    if (!ready || !mapRef.current || !sdkRef.current) return;
    const { maps, AdvancedMarkerElement } = sdkRef.current;
    const map = mapRef.current;
    const pins = JSON.parse(mapData).filter((location) => location.position);
    const bounds = new maps.LatLngBounds();
    const listeners = [];
    const markers = [];
    const infoWindow = new maps.InfoWindow();
    pins.forEach((location) => {
      bounds.extend(location.position);
      const glyph = document.createElement("div");
      glyph.className = "destination-map__pin" + (location.id === String(selectedId) ? " destination-map__pin--selected" : "");
      glyph.textContent = editable || pins.length === 1 ? "●" : String(location.index);
      const marker = new AdvancedMarkerElement({
        map, position: location.position, title: location.name,
        content: glyph, gmpDraggable: editable,
      });
      markers.push(marker);
      if (editable) {
        listeners.push(marker.addListener("dragend", () => {
          const position = marker.position;
          const lat = typeof position.lat === "function" ? position.lat() : position.lat;
          const lng = typeof position.lng === "function" ? position.lng() : position.lng;
          pickRef.current?.({ lat, lng });
        }));
      } else {
        const openInfo = () => {
          const content = document.createElement("div");
          content.className = "destination-map__info";
          const heading = document.createElement("strong");
          heading.textContent = location.name;
          const description = document.createElement("p");
          description.textContent = location.locationType + (location.locationLabel ? ": " + location.locationLabel : "");
          const status = document.createElement("p");
          status.textContent = location.verified ? "Pin verified by an administrator" : "Pin not yet verified";
          content.append(heading, description, status);
          infoWindow.setContent(content);
          infoWindow.open({ map, anchor: marker });
        };
        listeners.push(marker.addListener("click", () => {
          openInfo();
          selectRef.current?.(location.id);
        }));
        if (location.id === String(selectedId)) openInfo();
      }
    });
    boundsRef.current = pins.length ? bounds : null;
    const selected = pins.find((location) => location.id === String(selectedId));
    if (selected || pins.length === 1) {
      map.setCenter((selected || pins[0]).position);
      map.setZoom(16);
    } else if (pins.length > 1) {
      map.fitBounds(bounds, 48);
    }
    return () => {
      infoWindow.close();
      listeners.forEach((listener) => listener.remove());
      markers.forEach((marker) => { marker.map = null; });
      boundsRef.current = null;
    };
  }, [ready, mapData, selectedId, editable]);

  useEffect(() => {
    if (!ready || !route || !mapRef.current || !sdkRef.current || editable) return;
    const { maps, AdvancedMarkerElement } = sdkRef.current;
    const map = mapRef.current;
    const polylines = route.createPolylines();
    polylines.forEach((polyline) => polyline.setMap(map));
    const path = route.path || [];
    const bounds = new maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    if (path.length) map.fitBounds(bounds, 48);
    routeBoundsRef.current = path.length ? bounds : null;
    const startMarker = path.length ? new AdvancedMarkerElement({ map, position: path[0], title: "Starting point" }) : null;
    return () => {
      polylines.forEach((polyline) => polyline.setMap(null));
      if (startMarker) startMarker.map = null;
      routeBoundsRef.current = null;
    };
  }, [ready, route, editable, mapData, selectedId]);

  const recenter = () => {
    if (!mapRef.current) return;
    if (routeBoundsRef.current) { mapRef.current.fitBounds(routeBoundsRef.current, 48); return; }
    const pins = JSON.parse(mapData).filter((location) => location.position);
    if (pins.length === 1) {
      mapRef.current.setCenter(pins[0].position);
      mapRef.current.setZoom(16);
    } else if (boundsRef.current) mapRef.current.fitBounds(boundsRef.current, 48);
    else { mapRef.current.setCenter(BULACAN_CENTER); mapRef.current.setZoom(10); }
  };

  return (
    <div className="destination-map">
      <div className="destination-map__toolbar">
        <span><MapPin size={16} aria-hidden="true" /> {title}</span>
        {ready && !error && <button type="button" className="btn btn-sec btn-sm" onClick={recenter}>{editable ? "Recenter" : route ? "Show route" : "Show all pins"}</button>}
      </div>
      <div className="destination-map__frame">
        <div ref={containerRef} className="destination-map__canvas" role="region" aria-label={title} hidden={!shouldLoad || !!error} />
        {(!shouldLoad || error || !ready) && (
          <div className="destination-map__status" role={error ? "alert" : "status"}>
            <MapPin size={30} aria-hidden="true" />
            <p>{!shouldLoad ? "The exact location has not been added yet." : error || "Loading map…"}</p>
            {error && hasGoogleMapsKey() && <button type="button" className="btn btn-sec btn-sm" onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={14} aria-hidden="true" /> Try again</button>}
          </div>
        )}
      </div>
      {editable && <p className="destination-map__hint">Click the map or drag the pin to the visitor entrance, parking area, or drop-off point. You can also enter coordinates below.</p>}
    </div>
  );
}
