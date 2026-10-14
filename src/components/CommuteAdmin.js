import { useCallback, useEffect, useId, useState } from "react";
import DestinationMap from "./DestinationMap";
import { deleteCommuteGuide, getAllCommuteGuides, getCommuteReports, resolveCommuteReport, saveCommuteGuide } from "../services/commuteService";
import { emptyCommuteStep, normalizeCommuteGuide, TRANSPORT_MODES } from "../utils/commuting";
import { getTodayPH } from "../hooks/useItinerary";
import "./TravelPlanner.css";

const emptyGuide = () => ({ spotId: "", originLabel: "", source: "", lastVerifiedDate: "", verified: false, steps: [emptyCommuteStep()], arrivalInstructions: "", fareMin: "", fareMax: "", durationEstimate: "" });

export default function CommuteAdmin({ spots }) {
  const id = useId();
  const [guides, setGuides] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(emptyGuide);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pinStepIndex, setPinStepIndex] = useState(null);
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [guideData, reportData] = await Promise.all([getAllCommuteGuides(), getCommuteReports()]);
      setGuides(guideData); setReports(reportData);
    } catch { setError("Commuting data could not be loaded. Check your admin access and deployed Firestore rules, then retry."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value, verified: false }));
  const changeStep = (index, name, value) => setForm((current) => ({ ...current, verified: false, steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [name]: value } : step) }));
  const save = async (publish) => {
    setError(""); setSuccess("");
    try { normalizeCommuteGuide(form, publish); } catch (failure) { setError(failure.message); return; }
    if (!spots.some((spot) => spot.id === form.spotId)) { setError("Choose an existing destination."); return; }
    setSaving(true);
    try {
      const result = await saveCommuteGuide(form, publish);
      setGuides((current) => [...current.filter((guide) => guide.id !== result.id), result]);
      setForm(emptyGuide()); setPinStepIndex(null);
      setSuccess(publish ? "Verified commuting guide published." : "Draft saved. It is not visible to travelers.");
    } catch { setError("Guide could not be saved. Check your connection and admin access."); }
    finally { setSaving(false); }
  };
  const remove = async (guide) => {
    if (!window.confirm("Delete this commuting guide?")) return;
    setSaving(true); setError("");
    try { await deleteCommuteGuide(guide.id); setGuides((current) => current.filter((entry) => entry.id !== guide.id)); if (form.id === guide.id) setForm(emptyGuide()); }
    catch { setError("Guide could not be deleted."); }
    finally { setSaving(false); }
  };
  const resolve = async (reportId) => {
    setSaving(true); setError("");
    try { await resolveCommuteReport(reportId); setReports((current) => current.filter((report) => report.id !== reportId)); }
    catch { setError("Report could not be resolved."); }
    finally { setSaving(false); }
  };
  const field = (name, label, type = "text") => <div className="travel-planner__field">
    <label htmlFor={id + "-" + name}>{label}</label>
    <input id={id + "-" + name} type={type} value={form[name] ?? ""} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} max={type === "date" ? getTodayPH() : undefined} onChange={(event) => change(name, event.target.value)} />
  </div>;

  return <div className="travel-planner commute-admin">
    <div className="commute-admin__header"><h2>Commuting guides</h2><button className="btn btn-sec btn-sm" disabled={loading || saving} onClick={reload}>Refresh</button></div>
    <p className="location-note">Publish checked local journeys from named starting hubs. Drafts remain private to administrators.</p>
    {error && <p role="alert" className="travel-planner__error">{error}</p>}
    {success && <p role="status" className="location-note">{success}</p>}
    <div className="travel-planner__body">
      <h4>{form.id ? "Edit commuting guide" : "Add commuting guide"}</h4>
      <fieldset disabled={saving} style={{ border: 0, minWidth: 0 }}>
        <div className="travel-planner__field"><label htmlFor={id + "-spot"}>Destination</label>
          <select id={id + "-spot"} value={form.spotId} onChange={(event) => change("spotId", event.target.value)}><option value="">Choose a destination</option>{spots.map((spot) => <option key={spot.id} value={spot.id}>{spot.name}</option>)}</select>
        </div>
        {field("originLabel", "Starting hub / terminal (include municipality)")}
        {form.steps.map((step, index) => <div key={index} className="commute-admin__step">
          <div className="commute-admin__header"><strong>Step {index + 1}</strong><div className="travel-planner__actions">
            <button type="button" className="btn btn-sec btn-sm" disabled={index === 0} onClick={() => {
              const steps = [...form.steps]; [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; change("steps", steps); setPinStepIndex(null);
            }}>Move up</button>
            <button type="button" className="btn btn-sec btn-sm" onClick={() => { change("steps", form.steps.filter((entry, stepIndex) => stepIndex !== index)); setPinStepIndex(null); }}>Remove</button>
          </div></div>
          <div className="travel-planner__field"><label htmlFor={id + "-mode-" + index}>Transportation</label><select id={id + "-mode-" + index} value={step.mode} onChange={(event) => changeStep(index, "mode", event.target.value)}>{Object.entries(TRANSPORT_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {["instruction", ...(step.mode === "walk" ? [] : ["signboard", "boardAt", "alightAt"]), "landmark"].map((name) => <div key={name} className="travel-planner__field">
            <label htmlFor={id + "-" + name + "-" + index}>{{ instruction: "Step-by-step instruction", signboard: "Vehicle / route name or signboard", boardAt: "Where to board", alightAt: "Where to get off", landmark: "Recognizable landmark (optional)" }[name]}</label>
            <input id={id + "-" + name + "-" + index} value={step[name]} onChange={(event) => changeStep(index, name, event.target.value)} />
          </div>)}
          <div className="location-fields">{["lat", "lng"].map((name) => <div className="travel-planner__field" key={name}><label htmlFor={id + "-" + name + "-" + index}>{name === "lat" ? "Landmark / boarding latitude" : "Landmark / boarding longitude"} (optional)</label><input id={id + "-" + name + "-" + index} type="number" step="any" value={step[name] ?? ""} onChange={(event) => changeStep(index, name, event.target.value)} /></div>)}</div>
          <button type="button" className="btn btn-sec btn-sm" onClick={() => setPinStepIndex(pinStepIndex === index ? null : index)}>{pinStepIndex === index ? "Hide pin picker" : "Choose boarding / landmark pin"}</button>
          {pinStepIndex === index && <DestinationMap editable locations={[{ ...step, id: "step-pin", name: "Step " + (index + 1) }]} onLocationChange={({ lat, lng }) => {
            setForm((current) => ({ ...current, verified: false, steps: current.steps.map((entry, stepIndex) => stepIndex === index ? { ...entry, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) } : entry) }));
          }} title="Choose this step's location" />}
        </div>)}
        <button className="btn btn-sec btn-sm" disabled={form.steps.length >= 20} onClick={() => change("steps", [...form.steps, emptyCommuteStep()])}>Add step / transfer</button>
        {field("arrivalInstructions", "Final walking / entrance instructions")}
        <div className="location-fields">{field("fareMin", "Minimum estimated total fare (PHP)", "number")}{field("fareMax", "Maximum estimated total fare (PHP)", "number")}</div>
        {field("durationEstimate", "Estimated travel time (optional)")}
        {field("source", "Verification source (operator, tourism office, reference, or checked journey)")}
        {field("lastVerifiedDate", "Last verified date", "date")}
        <label className="location-confirm"><input type="checkbox" checked={form.verified} onChange={(event) => setForm((current) => ({ ...current, verified: event.target.checked }))} /><span>I have checked the transport, boarding and alighting points, and final arrival instructions.</span></label>
        <div className="travel-planner__actions"><button className="btn btn-sec" onClick={() => save(false)}>Save draft / unpublish</button><button className="btn btn-pri" onClick={() => save(true)}>Publish verified guide</button><button className="btn btn-sec" onClick={() => { setForm(emptyGuide()); setPinStepIndex(null); }}>Clear</button></div>
      </fieldset>
    </div>
    <div className="travel-planner__body"><h4>Saved guides</h4>
      {loading ? <p role="status">Loading…</p> : !guides.length ? <p className="location-note">No guides yet.</p> : guides.map((guide) => <div className="commute-guide" key={guide.id}>
        <strong>{guide.originLabel} → {spots.find((spot) => spot.id === guide.spotId)?.name || "Removed destination"}</strong><p className="location-note">{guide.status === "published" ? "Published" : "Draft"} · Last checked: {guide.lastVerifiedDate || "Not checked"}</p>
        <div className="travel-planner__actions"><button className="btn btn-sec btn-sm" disabled={saving} onClick={() => { setForm({ ...emptyGuide(), ...guide, verified: false }); setPinStepIndex(null); setError(""); setSuccess(""); }}>Edit / review</button><button className="btn btn-sec btn-sm" disabled={saving} onClick={() => remove(guide)}>Delete</button></div>
      </div>)}
    </div>
    <div className="travel-planner__body"><h4>Reports awaiting review ({reports.length})</h4>
      {!loading && !reports.length && <p className="location-note">No open reports.</p>}
      {reports.map((report) => <div className="commute-guide" key={report.id}><strong>{guides.find((guide) => guide.id === report.guideId)?.originLabel || "Removed guide"}</strong><p className="location-note">{report.text}</p><div className="travel-planner__actions">
        {guides.some((guide) => guide.id === report.guideId) && <button className="btn btn-sec btn-sm" disabled={saving} onClick={() => { setForm({ ...emptyGuide(), ...guides.find((guide) => guide.id === report.guideId), verified: false }); setPinStepIndex(null); }}>Review guide</button>}
        <button className="btn btn-sec btn-sm" disabled={saving} onClick={() => resolve(report.id)}>Mark reviewed</button>
      </div></div>)}
    </div>
  </div>;
}
