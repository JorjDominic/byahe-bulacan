import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import ROUTES from "../constants/routes";
import SpotCard from "../components/SpotCard";
import FlashLoader from "../components/FlashLoader";
import { filterSpots, getMunicipalities, getCategories } from "../services/spotService";

// 1. Mga bagong SVG icons para sa Search at Empty State
import { Search, MapPin, Tag, Compass, XCircle } from "lucide-react";

export default function BrowsePage() {
  const { navigate } = useApp();
  const [search, setSearch] = useState("");
  const [municipality, setMunicipality] = useState("All");
  const [category, setCategory] = useState("All");
  const [filtered, setFiltered] = useState([]);
  const [allSpots, setAllSpots] = useState([]);
  const [municipalities, setMunicipalities] = useState(["All"]);
  const [categories, setCategories] = useState(["All"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMunicipalities(), getCategories()]).then(([munis, cats]) => {
      setMunicipalities(munis);
      setCategories(cats);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    filterSpots({ search: "", municipality: "All", category: "All" })
      .then((data) => {
        setAllSpots(data);
        setFiltered(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (allSpots.length === 0) return;
    const result = allSpots.filter((s) => {
      const matchSearch =
        search === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.municipality.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase());
      const matchMuni = municipality === "All" || s.municipality === municipality;
      const matchCat = category === "All" || s.category === category;
      return matchSearch && matchMuni && matchCat;
    });
    setFiltered(result);
  }, [search, municipality, category, allSpots]);

  const handleReset = () => {
    setSearch("");
    setMunicipality("All");
    setCategory("All");
  };

  const hasFilters = search !== "" || municipality !== "All" || category !== "All";

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "3rem" }}>
      <FlashLoader isLoading={loading} />

      {/* ── Header with Dark Mode Variables ──────────────────────── */}
      <div style={{
        background: "var(--bg-secondary, #ffffff)",
        borderBottom: "1px solid var(--border, #e5e7eb)",
        padding: "2.5rem 0 2rem 0",
        transition: "all 0.3s ease"
      }}>
        <div className="container">
          <h2 style={{ fontFamily: "var(--font-head)", fontSize: "1.8rem", marginBottom: "1.25rem", color: "var(--text-main)" }}>
            Explore Bulacan Destinations
          </h2>
          
          {/* ── Modern Filter Row with SVG Icons ─────────────────── */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            
            {/* Search Input */}
            <div style={{ flex: "1 1 250px", position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="Search spots, municipalities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px 12px 42px",
                  borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--bg-main)", color: "var(--text-main)",
                  outline: "none", fontSize: "0.95rem", transition: "all 0.3s ease"
                }}
              />
            </div>

            {/* Municipality Dropdown */}
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <MapPin size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <select 
                value={municipality} 
                onChange={(e) => setMunicipality(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px 12px 42px",
                  borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--bg-main)", color: "var(--text-main)",
                  appearance: "none", cursor: "pointer", fontSize: "0.95rem", transition: "all 0.3s ease"
                }}
              >
                {municipalities.map((m) => (
                  <option key={m} value={m}>
                    {m === "All" ? "All Municipalities" : m}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <Tag size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px 12px 42px",
                  borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--bg-main)", color: "var(--text-main)",
                  appearance: "none", cursor: "pointer", fontSize: "0.95rem", transition: "all 0.3s ease"
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Button */}
            {hasFilters && (
              <button onClick={handleReset} style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "12px 16px", borderRadius: "8px",
                background: "var(--border)", color: "var(--text-main)",
                border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.3s ease"
              }}>
                <XCircle size={16} /> Clear
              </button>
            )}
          </div>
          
          {/* Result Counter */}
          {!loading && (
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "1rem", fontWeight: 500 }}>
              {hasFilters ? `Showing ${filtered.length} of ${allSpots.length} spots` : `Discover all ${allSpots.length} verified spots`}
            </div>
          )}
        </div>
      </div>

      {/* ── Spots Grid & Empty State ─────────────────────────────── */}
      <div className="spots-grid container" style={{ paddingTop: "2rem" }}>
        {filtered.length === 0 && !loading ? (
          <div style={{ 
            gridColumn: "1/-1", textAlign: "center", padding: "4rem 1rem", 
            background: "var(--bg-secondary)", borderRadius: "12px", 
            border: "1px dashed var(--border)", transition: "all 0.3s ease" 
          }}>
            <Compass size={48} color="var(--muted)" style={{ marginBottom: "1rem" }} />
            <h3 style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>No spots found</h3>
            <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>We couldn't find any destinations matching your search criteria.</p>
            <button className="btn btn-pri btn-sm" onClick={handleReset}>
              Clear all filters
            </button>
          </div>
        ) : (
          filtered.map((s) => <SpotCard key={s.id} spot={s} onClick={() => navigate(ROUTES.SPOT(s.id))} />)
        )}
      </div>
    </div>
  );
}