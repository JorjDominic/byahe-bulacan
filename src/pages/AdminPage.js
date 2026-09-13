import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useApp } from "../context/AppContext";
import {
  getAllSpots,
  addSpot,
  updateSpot,
  deleteSpot,
  getAllUsers,
  getAllReviews // <-- In-import natin ito para sa tamang bilang ng reviews
} from "../services/spotService";

// Import Lucide Icons
import { 
  Landmark, Users, Star, Edit2, Trash2, 
  CheckCircle, Plus, RefreshCw, Eye, Ban, Camera, MapPin, 
  Map, Save, Send, X, UploadCloud, AlertTriangle
} from "lucide-react";

const MUNICIPALITIES = [
  "Malolos","San Miguel","Balagtas","Plaridel","Angat","Bocaue",
  "Meycauayan","Calumpit","Baliuag","Guiguinto","Bulakan","Bustos",
  "Hagonoy","Marilao","Norzagaray","Obando","Pandi","Paombong",
  "Pulilan","San Ildefonso","San Jose del Monte","San Rafael",
  "Santa Maria","Dona Remedios Trinidad",
];

const CATEGORIES = [
  "Historical Site","Heritage Site","Ecological Site",
  "Religious Site","Local Enterprise","Other",
];

const BG_OPTIONS = [
  { label: "Green",  value: "#e8f5ee" },
  { label: "Amber",  value: "#fef3dc" },
  { label: "Blue",   value: "#e8f0fe" },
  { label: "Pink",   value: "#fce8f3" },
  { label: "Teal",   value: "#e8f9f0" },
  { label: "Purple", value: "#f5eefe" },
  { label: "Red",    value: "#fce8e8" },
  { label: "Gray",   value: "#f0f0f0" },
];

const EMPTY_FORM = {
  name: "", municipality: "", category: "", fee: "",
  pasalubong: "", hours: "", desc: "", badge: "",
  emoji: "📍", bg: "#e8f5ee", lat: "", lng: "",
  imageUrl: "", mapsLink: "",
};

export default function AdminPage() {
  const { signOutUser }  = useAuth();
  const { userName }     = useApp();

  const [adminTab,    setAdminTab]    = useState("overview");
  const [spots,       setSpots]       = useState([]);
  const [usersList,   setUsersList]   = useState([]);
  const [reviewsList, setReviewsList] = useState([]); // <-- Bagong state para sa tamang bilang ng reviews
  const [loading,     setLoading]     = useState(true);
  const [editingSpot, setEditingSpot] = useState(null);

  useEffect(() => { loadData(); }, []);

  // Fetch Spots, Users, at Reviews from Firebase
  const loadData = async () => {
    setLoading(true);
    try {
      const [spotsData, usersData, reviewsData] = await Promise.all([
        getAllSpots(),
        getAllUsers(),
        getAllReviews() // <-- Kukunin natin lahat ng nasa "reviews" collection
      ]);
      setSpots(spotsData || []);
      setUsersList(usersData || []);
      setReviewsList(reviewsData || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotAdded   = (newSpot)     => setSpots((prev) => [newSpot, ...prev]);
  const handleSpotUpdated = (updatedSpot) => {
    setSpots((prev) => prev.map((s) => s.id === updatedSpot.id ? updatedSpot : s));
    setEditingSpot(null);
  };

  const handleDeleteSpot = async (id) => {
    if (!window.confirm("Are you sure you want to delete this spot?")) return;
    try {
      await deleteSpot(id);
      setSpots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert("Failed to delete spot. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)" }}>
      
      {/* ── Admin CSS ──────────────────────── */}
      <style>{`
        .admin-nav { background-color: var(--bg-secondary) !important; border-bottom: 1px solid var(--border) !important; position: sticky; top: 0; z-index: 1000; padding: 0.75rem 0; }
        .admin-nav-inner { display: flex; align-items: center; padding: 0 2rem; max-width: 1400px; margin: 0 auto; gap: 1.5rem; }
        .admin-brand { color: var(--text-main); font-weight: 800; font-size: 1.1rem; display: flex; align-items: center; gap: 0.75rem; white-space: nowrap; }
        .admin-nav-link { background: none; border: none; color: var(--muted); font-weight: 600; font-size: 0.9rem; cursor: pointer; padding: 0.5rem 0; position: relative; transition: 0.2s; white-space: nowrap; }
        .admin-nav-link:hover { color: var(--text-main); }
        .admin-nav-link.active { color: var(--pri); }
        .admin-nav-link.active::after { content: ''; position: absolute; bottom: -0.75rem; left: 0; width: 100%; height: 3px; background: var(--pri); border-radius: 3px 3px 0 0; }
        .admin-body { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        .admin-page-title h2 { color: var(--text-main); margin: 0 0 0.25rem 0; font-size: 1.6rem; }
        .admin-page-title p { color: var(--muted); margin: 0; font-size: 0.9rem; }
        .admin-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
        .admin-stat { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
        .admin-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .admin-stat-lbl { font-size: 0.85rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
        .admin-stat-val { font-size: 1.8rem; color: var(--text-main); font-weight: 800; line-height: 1; }
        .admin-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 1.5rem; }
        .admin-table-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .admin-table-head { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid var(--border); }
        .admin-table-head h3 { margin: 0; color: var(--text-main); font-size: 1.1rem; display: flex; align-items: center; gap: 8px; }
        .admin-table { width: 100%; border-collapse: collapse; text-align: left; }
        .admin-table th { padding: 1rem 1.25rem; font-size: 0.8rem; text-transform: uppercase; color: var(--muted); background: var(--bg-main); border-bottom: 1px solid var(--border); }
        .admin-table td { padding: 1rem 1.25rem; font-size: 0.9rem; color: var(--text-main); border-bottom: 1px solid var(--border); vertical-align: middle; }
        .admin-table tbody tr:last-child td { border-bottom: none; }
        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .status-active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
        .action-icon { cursor: pointer; color: var(--muted); transition: 0.2s; padding: 4px; border-radius: 4px; }
        .action-icon:hover { background: var(--bg-main); color: var(--text-main); }
        .form-field input, .form-field select, .form-field textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 0.9rem; background: var(--bg-main); color: var(--text-main); outline: none; box-sizing: border-box; }
        .form-field label { font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.5rem; }
      `}</style>

      {/* ── Admin Nav ──────────────────────────────────────── */}
      <div className="admin-nav">
        <div className="admin-nav-inner">
          <div className="admin-brand">
            Admin Center
          </div>
          {["overview", "spots", "users"].map((t) => (
            <button
              key={t}
              className={"admin-nav-link " + (adminTab === t ? "active" : "")}
              onClick={() => setAdminTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={14} /> {userName}
            </span>
            <button className="btn btn-sec btn-sm" onClick={signOutUser} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>Log Out</button>
          </div>
        </div>
      </div>

      <div className="admin-body">

        {/* ── OVERVIEW ───────────────────────────────────────── */}
        {adminTab === "overview" && (
          <>
            <div className="admin-page-title">
              <h2>Dashboard Overview</h2>
              <p>System metrics and recent activities</p>
            </div>
            
            <div className="admin-stats">
              {[
                { icon: <Landmark size={24} color="#10b981"/>, bg: "rgba(16, 185, 129, 0.15)", label: "Official Spots",   val: loading ? "..." : String(spots.length) },
                { icon: <Users size={24} color="#f59e0b"/>,    bg: "rgba(245, 158, 11, 0.15)", label: "Registered Users", val: loading ? "..." : String(usersList.length) },
                { icon: <Star size={24} color="#3b82f6"/>,     bg: "rgba(59, 130, 246, 0.15)", label: "Total Reviews",    val: loading ? "..." : String(reviewsList.length) }, // Ginamit ang reviewsList.length
              ].map((s) => (
                <div className="admin-stat" key={s.label}>
                  <div className="admin-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                  <div>
                    <div className="admin-stat-lbl">{s.label}</div>
                    <div className="admin-stat-val">{s.val}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-grid">
              <div className="admin-table-card">
                <div className="admin-table-head">
                  <h3><MapPin size={18} color="var(--pri)"/> Recent Tourist Spots</h3>
                  <button className="btn btn-pri btn-sm" onClick={() => setAdminTab("spots")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Plus size={16}/> Add Spot
                  </button>
                </div>
                {loading ? (
                  <p style={{ padding: "2rem", color: "var(--muted)", textAlign: "center" }}>Loading spots...</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr><th>Spot</th><th>Municipality</th><th>Category</th><th>Status</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {spots.slice(0, 5).map((s) => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                {s.imageUrl ? (
                                  <img src={s.imageUrl} alt={s.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                                    {s.emoji}
                                  </div>
                                )}
                                <strong style={{ color: "var(--text-main)" }}>{s.name}</strong>
                              </div>
                            </td>
                            <td>{s.municipality}</td>
                            <td>{s.category}</td>
                            <td><span className="status-badge status-active"><CheckCircle size={12}/> Active</span></td>
                            <td>
                              <span className="action-icon" onClick={() => { setEditingSpot(s); setAdminTab("spots"); }} title="Edit"><Edit2 size={16}/></span>
                              <span className="action-icon" style={{ color: "#ef4444" }} onClick={() => handleDeleteSpot(s.id)} title="Delete"><Trash2 size={16}/></span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── SPOTS ──────────────────────────────────────────── */}
        {adminTab === "spots" && (
          <>
            <div className="admin-page-title" style={{ marginBottom: "1.5rem" }}>
              <h2>{editingSpot ? "Edit Spot" : "Manage Tourist Spots"}</h2>
              <p>{editingSpot ? "Update details for " + editingSpot.name : "Add a new destination to the directory"}</p>
            </div>
            
            <SpotForm
              key={editingSpot?.id || "new"}
              municipalities={MUNICIPALITIES}
              categories={CATEGORIES}
              bgOptions={BG_OPTIONS}
              initialData={editingSpot}
              onSpotAdded={handleSpotAdded}
              onSpotUpdated={handleSpotUpdated}
              onCancelEdit={() => setEditingSpot(null)}
            />

            <div className="admin-table-card" style={{ marginTop: "2rem" }}>
              <div className="admin-table-head">
                <h3><Map size={18} color="var(--pri)"/> All Official Spots ({loading ? "..." : spots.length})</h3>
                <button className="btn btn-sec btn-sm" onClick={loadData} style={{ display: "flex", alignItems: "center", gap: "6px" }}><RefreshCw size={14}/> Refresh</button>
              </div>
              {loading ? (
                <p style={{ padding: "2rem", color: "var(--muted)", textAlign: "center" }}>Loading database...</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr><th>Spot</th><th>Municipality</th><th>Category</th><th>Fee</th><th>Rating</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {spots.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              {s.imageUrl ? (
                                <img src={s.imageUrl} alt={s.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                                  {s.emoji}
                                </div>
                              )}
                              <strong style={{ color: "var(--text-main)", fontSize: "0.95rem" }}>{s.name}</strong>
                            </div>
                          </td>
                          <td>{s.municipality}</td>
                          <td>{s.category}</td>
                          <td>{s.fee}</td>
                          <td>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {s.rating > 0 ? <><Star size={14} fill="#f59e0b" color="#f59e0b"/> {s.rating}</> : <><Star size={14} color="var(--muted)"/> —</>}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                className="btn btn-sec btn-sm"
                                style={{ padding: "6px", display: "flex", alignItems: "center" }}
                                onClick={() => { setEditingSpot(s); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                                title="Edit"
                              ><Edit2 size={16}/></button>
                              <button
                                className="btn btn-sm"
                                style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "none", padding: "6px", display: "flex", alignItems: "center" }}
                                onClick={() => handleDeleteSpot(s.id)}
                                title="Delete"
                              ><Trash2 size={16}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── USERS ──────────────────────────────────────────── */}
        {adminTab === "users" && (
          <>
            <div className="admin-page-title" style={{ marginBottom: "1.5rem" }}>
              <h2>Registered Users</h2>
              <p>Manage community members</p>
            </div>
            <div className="admin-table-card">
              <div className="admin-table-head">
                <h3><Users size={18} color="var(--pri)"/> All Users ({loading ? "..." : usersList.length})</h3>
                <input type="text" placeholder="Search users..." style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.85rem", background: "var(--bg-main)", color: "var(--text-main)", outline: "none", width: "250px" }} />
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 && !loading ? (
                      <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--muted)" }}>No users found.</td></tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id}>
                          <td><strong style={{ color: "var(--text-main)" }}>{u.name || "Guest User"}</strong></td>
                          <td style={{ color: "var(--muted)" }}>{u.email || "No email"}</td>
                          <td>{u.isAdmin ? "Admin" : "User"}</td>
                          <td>{u.joined || "Unknown"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <span className="action-icon" title="View Profile"><Eye size={18}/></span>
                              <span className="action-icon" style={{ color: "#ef4444" }} title="Ban User"><Ban size={18}/></span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SpotForm ─────────────────────────────────────────────
function SpotForm({ municipalities, categories, bgOptions, initialData, onSpotAdded, onSpotUpdated, onCancelEdit }) {
  const isEditing = !!initialData;

  const [form, setForm] = useState(initialData ? {
    name:         initialData.name         || "",
    municipality: initialData.municipality || "",
    category:     initialData.category     || "",
    fee:          initialData.fee          || "",
    pasalubong:   initialData.pasalubong   || "",
    hours:        initialData.hours        || "",
    desc:         initialData.desc         || "",
    badge:        initialData.badge        || "",
    emoji:        initialData.emoji        || "📍",
    bg:           initialData.bg           || "#e8f5ee",
    lat:          initialData.lat          || "",
    lng:          initialData.lng          || "",
    imageUrl:     initialData.imageUrl     || "",
    mapsLink:     "",
  } : EMPTY_FORM);

  const [submitting, setSubmitting] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");
  const [dragOver,   setDragOver]   = useState(false);
  const fileInputRef                = useRef(null);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleMapsLink = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, mapsLink: val }));
    const match = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) {
      setForm((prev) => ({
        ...prev,
        mapsLink: val,
        lat:      parseFloat(match[1]),
        lng:      parseFloat(match[2]),
      }));
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB."); return; }
    setUploading(true); setError("");

    try {
      const CLOUD  = process.env.REACT_APP_CLOUDINARY_CLOUD;
      const PRESET = process.env.REACT_APP_CLOUDINARY_PRESET;
      const formData = new FormData();
      formData.append("file",          file);
      formData.append("upload_preset", PRESET);

      const res = await fetch("https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.secure_url }));
    } catch (err) {
      setError("Image upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); handleImageUpload(e.dataTransfer.files[0]); };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true);  };
  const handleDragLeave = ()  => setDragOver(false);
  const handleClear = () => { setForm(EMPTY_FORM); setSuccess(""); setError(""); };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!form.name.trim() || !form.municipality || !form.category || !form.fee.trim() || !form.hours.trim() || !form.desc.trim()) {
      setError("Please fill out all required fields marked with *"); return;
    }
    setSubmitting(true);
    try {
      if (isEditing) {
        await updateSpot(initialData.id, form);
        setSuccess("Spot updated successfully!");
        onSpotUpdated({ ...initialData, ...form });
      } else {
        const newSpot = await addSpot(form);
        setSuccess(`"${form.name}" published successfully!`);
        onSpotAdded(newSpot);
        handleClear();
      }
    } catch (err) {
      setError("Failed to save spot. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-table-card">
      <div className="admin-table-head">
        <h3>{isEditing ? <><Edit2 size={18} color="var(--pri)"/> Editing: {initialData.name}</> : <><Plus size={18} color="var(--pri)"/> Add New Tourist Spot</>}</h3>
        {isEditing && <button className="btn btn-sec btn-sm" onClick={onCancelEdit} style={{ display: "flex", alignItems: "center", gap: "6px" }}><X size={14}/> Cancel Edit</button>}
      </div>
      <div style={{ padding: "1.5rem" }}>

        {error   && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}><AlertTriangle size={18}/> {error}</div>}
        {success && <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={18}/> {success}</div>}

        {/* ── Image Upload ──────────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: "0.5rem", color: "var(--text-main)" }}>Spot Photo</label>
          <div
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => fileInputRef.current?.click()}
            style={{ border: "2px dashed " + (dragOver ? "var(--pri)" : "var(--border)"), borderRadius: 12, padding: "2rem", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(46, 204, 113, 0.05)" : "var(--bg-main)", transition: "all 0.2s ease" }}
          >
            {uploading ? (
              <div style={{ color: "var(--pri)", fontSize: "0.9rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}><RefreshCw size={32} className="spin" /> Uploading to Cloudinary...</div>
            ) : form.imageUrl ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <img src={form.imageUrl} alt="Preview" style={{ width: "100%", maxWidth: 400, maxHeight: 250, objectFit: "cover", borderRadius: 8, marginBottom: "1rem", border: "1px solid var(--border)" }} />
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}><Camera size={16}/> Click or drag to replace image</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--muted)" }}>
                <UploadCloud size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
                <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-main)" }}>Drag & drop a photo here</div>
                <div style={{ fontSize: "0.85rem" }}>or click to browse — JPG, PNG, WEBP up to 10MB</div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleImageUpload(e.target.files[0])} />
          {form.imageUrl && !uploading && (
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setForm((prev) => ({ ...prev, imageUrl: "" })); }} style={{ fontSize: "0.8rem", marginTop: "0.5rem", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "none", display: "flex", alignItems: "center", gap: "4px" }}>
              <Trash2 size={14}/> Remove photo
            </button>
          )}
        </div>

        {/* ── Form Fields ───────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
          <div className="form-field">
            <label>Spot Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="text" name="name" placeholder="e.g. Bocaue River Festival Grounds" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Municipality <span style={{ color: "#ef4444" }}>*</span></label>
            <select name="municipality" value={form.municipality} onChange={handleChange}>
              <option value="">Select municipality</option>
              {municipalities.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Category <span style={{ color: "#ef4444" }}>*</span></label>
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Entrance Fee <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="text" name="fee" placeholder="₱50 or Free" value={form.fee} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Visit Hours <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="text" name="hours" placeholder="e.g. 7:00 AM – 5:00 PM" value={form.hours} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Badge <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
            <input type="text" name="badge" placeholder="e.g. National Shrine" value={form.badge} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Pasalubong / What to Buy</label>
            <input type="text" name="pasalubong" placeholder="e.g. Pastillas, Woven crafts" value={form.pasalubong} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label>Card Color <span style={{ color: "var(--muted)", fontWeight: 400 }}>(fallback if no photo)</span></label>
            <select name="bg" value={form.bg} onChange={handleChange}>
              {bgOptions.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-field" style={{ marginBottom: "1.25rem" }}>
          <label>Google Maps Link <span style={{ color: "var(--muted)", fontWeight: 400 }}>(auto-fills GPS)</span></label>
          <input type="text" name="mapsLink" placeholder="Paste Google Maps URL here..." value={form.mapsLink || ""} onChange={handleMapsLink} />
          {form.lat && form.lng && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={14}/> GPS: {form.lat}, {form.lng}
            </div>
          )}
        </div>

        <div className="form-field" style={{ marginBottom: "1.5rem" }}>
          <label>Description <span style={{ color: "#ef4444" }}>*</span></label>
          <textarea name="desc" placeholder="Describe the tourist spot — history, what to see, tips for visitors..." value={form.desc} onChange={handleChange} style={{ minHeight: 120, resize: "vertical" }} />
        </div>

        {/* ── Preview Card ──────────────────────────────────── */}
        {form.name && (
          <div style={{ marginBottom: "1.5rem", padding: "1.25rem", background: "var(--bg-main)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.75rem", fontWeight: 700, letterSpacing: "1px" }}>LIVE PREVIEW</div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="preview" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 8, background: form.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", border: "1px solid var(--border)" }}>{form.emoji}</div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text-main)", marginBottom: "0.25rem" }}>{form.name}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={12}/> {form.municipality || "Municipality"} • {form.category || "Category"} • {form.fee || "Fee"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ────────────────────────────────── */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
          {isEditing ? (
            <>
              <button className="btn btn-sec" onClick={onCancelEdit} disabled={submitting}>Cancel</button>
              <button className="btn btn-pri" onClick={handleSubmit} disabled={submitting || uploading} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Save size={18}/> {submitting ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-sec" onClick={handleClear} disabled={submitting}>Clear</button>
              <button className="btn btn-pri" onClick={handleSubmit} disabled={submitting || uploading} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Send size={18}/> {submitting ? "Publishing..." : "Publish Spot"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
