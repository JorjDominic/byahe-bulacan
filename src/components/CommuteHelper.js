import { useEffect, useId, useState } from "react";
import { useApp } from "../context/AppContext";
import DestinationMap from "./DestinationMap";
import { getCommuteGuides, reportCommuteGuide } from "../services/commuteService";
import { getCoordinates } from "../utils/coordinates";
import { guideNeedsReview, TRANSPORT_MODES } from "../utils/commuting";

export default function CommuteHelper({ destination, onUseOrigin }) {
  const id = useId();
  const { userId, showToast } = useApp();
  const [guides, setGuides] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState("");
  const [reporting, setReporting] = useState(false);
  const [showPins, setShowPins] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setGuides([]); setSelectedId("");
    getCommuteGuides(destination.id).then((result) => {
      if (cancelled) return;
      setGuides(result); setSelectedId(result[0]?.id || "");
    }).catch(() => { if (!cancelled) setError("Local guides could not be loaded. Please try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destination.id, attempt]);
  const guide = guides.find((entry) => entry.id === selectedId);
  const submitReport = async (event) => {
    event.preventDefault(); setReporting(true); setError("");
    try {
      await reportCommuteGuide(guide.id, userId, report);
      setReport(""); setShowReport(false); showToast("Thanks. An administrator will review your report.");
    } catch (failure) { setError(failure.message); }
    finally { setReporting(false); }
  };
  const stepPins = (guide?.steps || []).map((step, index) => ({ ...step, id: "step-" + index, name: "Step " + (index + 1) + ": " + (step.boardAt || step.landmark || TRANSPORT_MODES[step.mode]), locationVerified: true }));

  return <section className="commute-helper" aria-label="Local commuting guides">
    <h4>Local commuting guides</h4>
    <p className="location-note">Choose the starting hub you can reach. These guides describe a specific journey from that hub, rather than from your current location.</p>
    {loading && <p role="status" className="location-note">Loading verified guides…</p>}
    {error && <div role="alert" className="travel-planner__error">{error} {!guides.length && <button className="btn btn-sec btn-sm" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}</div>}
    {!loading && !error && !guides.length && <p className="location-note">No verified local commuting guide has been published for {destination.name} yet. Try Google transit directions above or confirm transport with the destination.</p>}
    {!!guides.length && <div className="travel-planner__field">
      <label htmlFor={id + "-hub"}>Starting hub</label>
      <select id={id + "-hub"} value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setShowReport(false); setReport(""); setShowPins(false); setError(""); }}>
        {guides.map((entry) => <option key={entry.id} value={entry.id}>{entry.originLabel}</option>)}
      </select>
    </div>}
    {guide && <article className="commute-guide">
      <h5>{guide.originLabel} → {destination.name}</h5>
      <p className="commute-guide__meta">Admin verified · Last checked: {guide.lastVerifiedDate}</p>
      <p className="commute-guide__meta">Source: {guide.source}</p>
      {guideNeedsReview(guide.lastVerifiedDate) && <p className="location-note location-note--unverified">This guide was last checked over 90 days ago or has an unknown verification date. Confirm services before traveling.</p>}
      <p className="location-note">{guide.fareMin == null ? "Fare estimate unavailable" : "Estimated total fare: ₱" + guide.fareMin + "–₱" + guide.fareMax}{guide.durationEstimate && " · " + guide.durationEstimate}. Fares and services can change.</p>
      <button className="btn btn-sec btn-sm" onClick={() => onUseOrigin(guide.originLabel)}>Use this hub as route starting point</button>
      <ol className="travel-steps">{guide.steps.map((step, index) => <li key={index}>
        <strong>{TRANSPORT_MODES[step.mode] || "Travel"}</strong>
        <p>{step.instruction}</p>
        {step.mode !== "walk" && <div className="travel-steps__details">
          <p><strong>Look for:</strong> {step.signboard}</p>
          <p><strong>Board at:</strong> {step.boardAt}</p>
          <p><strong>Get off at:</strong> {step.alightAt}</p>
        </div>}
        {step.landmark && <p><strong>Landmark:</strong> {step.landmark}</p>}
      </li>)}</ol>
      <p><strong>Reach the entrance:</strong> {guide.arrivalInstructions}</p>
      {stepPins.some((step) => getCoordinates(step)) && <div style={{ marginTop: "1rem" }}>
        <button className="btn btn-sec btn-sm" onClick={() => setShowPins((value) => !value)}>{showPins ? "Hide boarding / landmark pins" : "Show boarding / landmark pins"}</button>
        {showPins && <DestinationMap locations={[...stepPins, destination]} title="Commuting guide locations" />}
      </div>}
      <div style={{ marginTop: "1rem" }}>
        {userId ? <button className="btn btn-sec btn-sm" onClick={() => setShowReport((value) => !value)}>Report outdated instructions</button> : <p className="location-note">Log in to report outdated instructions.</p>}
      </div>
      {showReport && <form onSubmit={submitReport}>
        <div className="travel-planner__field"><label htmlFor={id + "-report"}>What needs updating?</label><textarea id={id + "-report"} minLength={10} maxLength={1000} required value={report} onChange={(event) => setReport(event.target.value)} /></div>
        <button className="btn btn-pri btn-sm" disabled={reporting}>{reporting ? "Sending…" : "Send report"}</button>
      </form>}
    </article>}
  </section>;
}
