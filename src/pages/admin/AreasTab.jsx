import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { colors, fonts, cardStyle, buttonStyle } from "../../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
  marginBottom: "10px",
};

const labelStyle = { display: "block", fontSize: "12px", color: colors.inkSoft, marginBottom: "4px" };
const blank = { id: null, name: "", code: "", park_id: "", season_id: "" };

export default function AreasTab() {
  const { profile } = useAuth();
  const [areas, setAreas] = useState([]);
  const [parks, setParks] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    Promise.all([
      supabase.from("area").select("id, name, code, park_id, season_id, park:park_id(name), season:season_id(name)").order("name"),
      supabase.from("park").select("id, name").eq("business_id", profile.business_id).order("name"),
      supabase.from("season").select("id, name").eq("business_id", profile.business_id).order("name"),
    ]).then(([{ data: a, error: err }, { data: p }, { data: s }]) => {
      if (err) setError(err.message);
      else setAreas(a || []);
      setParks(p || []);
      setSeasons(s || []);
    });
  }

  useEffect(refresh, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { name: form.name, code: form.code, park_id: form.park_id, season_id: form.season_id || null };
    const { error: err } = form.id
      ? await supabase.from("area").update(payload).eq("id", form.id)
      : await supabase.from("area").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("area").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, margin: 0 }}>Areas</h2>
        <button
          onClick={() => { setError(null); setForm({ ...blank, park_id: parks[0]?.id || "" }); }}
          disabled={parks.length === 0}
          style={buttonStyle.primary}
        >
          + Add area
        </button>
      </div>
      {parks.length === 0 && <p style={{ fontSize: "13px", color: colors.inkSoft }}>Add a Park first.</p>}
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {areas.map((a) => (
        <div key={a.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{a.name} <span style={{ color: colors.inkSoft, fontWeight: 400 }}>({a.code})</span></div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{a.park?.name} · {a.season?.name || "no season set"}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm({ id: a.id, name: a.name, code: a.code || "", park_id: a.park_id, season_id: a.season_id || "" }); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(a.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {areas.length === 0 && parks.length > 0 && <p style={{ color: colors.inkSoft }}>No areas yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }} onClick={() => setForm(null)}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, marginTop: 0 }}>
              {form.id ? "Edit area" : "New area"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Park</label>
              <select required value={form.park_id} onChange={(e) => setForm({ ...form, park_id: e.target.value })} style={fieldStyle}>
                {parks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Parc Newydd" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Code</label>
                  <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. PN" maxLength={6} style={fieldStyle} />
                </div>
              </div>

              <label style={labelStyle}>Season</label>
              <select value={form.season_id} onChange={(e) => setForm({ ...form, season_id: e.target.value })} style={fieldStyle}>
                <option value="">No season set</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create area"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
