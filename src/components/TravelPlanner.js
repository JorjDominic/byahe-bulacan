import { useEffect, useId, useRef, useState } from "react";
import { Navigation, MapPin, Car, Footprints, Bus } from "lucide-react";
import DestinationMap from "./DestinationMap";
import CommuteHelper from "./CommuteHelper";
import { computeRoute, formatDistance, formatDuration } from "../services/routeService";
import { getCoordinates } from "../utils/coordinates";
import "./TravelPlanner.css";

export default function TravelPlanner({ locations, selectedId, onSelect }) {
  const id = useId();
  const [localSelectedId, setLocalSelectedId] = useState(null);
  const destinationId = selectedId ?? localSelectedId;
  const destination = locations.find((location) => String(location.id) === String(destinationId)) || locations[0];
  const [address, setAddress] = useState("");
  const [origin, setOrigin] = useState(null);
  const [originName, setOriginName] = useState("your current location");
  const [mode, setMode] = useState("DRIVING");
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const geoRequestId = useRef(0);
  const destinationKey = JSON.stringify([destination?.id, destination?.lat, destination?.lng]);
  const originKey = typeof origin === "string" ? origin : JSON.stringify(origin);

  useEffect(() => {
    requestId.current += 1;
    setRoute(null); setError(""); setLoading(false);
  }, [destinationKey, originKey, mode]);
  useEffect(() => () => { requestId.current += 1; geoRequestId.current += 1; }, []);

  const changeDestination = (value) => { setLocalSelectedId(value); onSelect?.(value); };
  const useLocation = () => {
    if (!navigator.geolocation) { setError("Location is unavailable in this browser. Enter a starting address instead."); return; }
    const current = ++geoRequestId.current;
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition((position) => {
      if (current !== geoRequestId.current) return;
      setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
      setOriginName("your current location"); setAddress(""); setLocating(false);
    }, (failure) => {
      if (current !== geoRequestId.current) return;
      setLocating(false);
      setError(failure.code === 1 ? "Location access was denied. Enter a starting address instead." : "Unable to get your location. Enter a starting address or try again.");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  const findRoute = async (event) => {
    event.preventDefault();
    const current = ++requestId.current;
    setLoading(true); setError(""); setRoute(null);
    try {
      const result = await computeRoute({ origin, destination, travelMode: mode });
      if (current === requestId.current) setRoute(result);
    } catch (failure) { if (current === requestId.current) setError(failure.message); }
    finally { if (current === requestId.current) setLoading(false); }
  };
  const steps = route?.legs?.flatMap((leg) => leg.steps || []) || [];
  const previousStop = locations[locations.findIndex((location) => location.id === destination?.id) - 1];

  return <div className="travel-planner">
    <DestinationMap locations={locations} selectedId={destinationId} onSelect={changeDestination} route={route} title={locations.length > 1 ? "Trip destinations and route" : (destination?.name || "Destination") + " map"} />
    <div className="travel-planner__body">
      <h4><Navigation size={18} aria-hidden="true" /> How to get there</h4>
      <form onSubmit={findRoute}>
        {locations.length > 1 && <div className="travel-planner__field">
          <label htmlFor={id + "-destination"}>Destination</label>
          <select id={id + "-destination"} value={destination?.id || ""} onChange={(event) => changeDestination(event.target.value)}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}{!getCoordinates(location) && " — location unavailable"}</option>)}
          </select>
        </div>}
        <div className="travel-planner__modes" aria-label="Travel mode">
          {[{ value: "DRIVING", label: "Drive", Icon: Car }, { value: "WALKING", label: "Walk", Icon: Footprints }, { value: "TRANSIT", label: "Commute", Icon: Bus }].map(({ value, label, Icon }) => <button key={value} type="button" className="btn btn-sec btn-sm" aria-pressed={mode === value} onClick={() => setMode(value)}><Icon size={16} aria-hidden="true" /> {label}</button>)}
        </div>
        <div className="travel-planner__field">
          <label htmlFor={id + "-origin"}>Starting address or landmark</label>
          <input id={id + "-origin"} value={address} maxLength={300} placeholder="Include the town or city, e.g. Malolos City Hall, Bulacan" onChange={(event) => {
            geoRequestId.current += 1; setLocating(false);
            setAddress(event.target.value); setOrigin(event.target.value);
          }} />
        </div>
        <div className="travel-planner__actions">
          <button className="btn btn-sec btn-sm" type="button" disabled={locating} onClick={useLocation}><MapPin size={15} aria-hidden="true" /> {locating ? "Finding location…" : "Use my location"}</button>
          {previousStop && getCoordinates(previousStop) && <button className="btn btn-sec btn-sm" type="button" onClick={() => {
            geoRequestId.current += 1; setLocating(false); setAddress(""); setOrigin(getCoordinates(previousStop)); setOriginName(previousStop.name);
          }}>Start from previous stop</button>}
          <button className="btn btn-pri btn-sm" type="submit" disabled={loading || locating || !getCoordinates(destination)}>{loading ? "Finding route…" : mode === "TRANSIT" ? "Find transit route" : "Show route"}</button>
        </div>
        {origin && typeof origin !== "string" && <p className="location-note">Starting from {originName}. It is used for this request and is not saved to your profile.</p>}
        {!getCoordinates(destination) && <p className="location-note">An exact destination pin is needed to calculate a route.</p>}
      </form>
      {error && <p role="alert" className="travel-planner__error">{error}</p>}
      {route && <section className="travel-planner__result" aria-label="Route directions" aria-live="polite">
        <p className="travel-planner__summary">{route.localizedValues?.distance || formatDistance(route.distanceMeters)} · {route.localizedValues?.duration || formatDuration(route.durationMillis)}</p>
        <p className="location-note">{mode === "TRANSIT" ? "Google transit directions for current departures. Local jeepney coverage may be incomplete." : "Estimated travel time. Road and traffic conditions may change."}</p>
        {(route.warnings || []).map((warning, index) => <p className="location-note location-note--unverified" key={index}>{warning}</p>)}
        {steps.length ? <ol className="travel-steps">{steps.map((step, index) => <li key={index}>
          <p>{step.instructions || "Continue along the highlighted route."}</p>
          {step.transitDetails && <div className="travel-steps__details">
            {step.transitDetails.transitLine?.vehicle?.name && <p><strong>Transport:</strong> {step.transitDetails.transitLine.vehicle.name}</p>}
            <p><strong>Take:</strong> {step.transitDetails.transitLine?.name || step.transitDetails.transitLine?.shortName || "Public transport"}{step.transitDetails.headsign && " toward " + step.transitDetails.headsign}</p>
            {step.transitDetails.departureStop?.name && <p><strong>Board:</strong> {step.transitDetails.departureStop.name}</p>}
            {step.transitDetails.arrivalStop?.name && <p><strong>Get off:</strong> {step.transitDetails.arrivalStop.name}</p>}
          </div>}
          <small>{step.localizedValues?.distance || formatDistance(step.distanceMeters)}</small>
        </li>)}</ol> : <p className="location-note">Step-by-step instructions are unavailable for this route.</p>}
      </section>}
      {mode === "TRANSIT" && destination && <CommuteHelper key={destination.id} destination={destination} onUseOrigin={(value) => { setAddress(value); setOrigin(value); }} />}
    </div>
  </div>;
}
