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
const blank = { id: null, code: "", area_id: "" };

export default function PitchBandsTab() {
  const { profile } = useAuth();
  const [bands, setBands] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    Promise.all([
      supabase.from("pitch_band").select("id, code, area_id, area:area_id(name, code)").order("code"),
      supabase.from("area").select("id, name, code").order("name"),
    ]).then(([{ data: b, error: err }, { data: a }]) => {
      if (err) setError(err.message);
      else setBands(b || []);
      setAreas(a || []);
    });
  }

  useEffect(refresh, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { code: form.code, area_id: form.area_id };
    const { error: err } = form.id
      ? await supabase.from("pitch_band").update(payload).eq("id", form.id)
      : await supabase.from("pitch_band").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("pitch_band").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, margin: 0 }}>Pitch bands</h2>
        <button
          onClick={() => { setError(null); setForm({ ...blank, area_id: areas[0]?.id || "" }); }}
          disabled={areas.length === 0}
          style={buttonStyle.primary}
        >
          + Add band
        </button>
      </div>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginTop: 0 }}>
        Pricing tiers within an Area (e.g. "PN-Band 4"). Pricing itself isn't built yet — this is just the reference list Pitches assign to.
      </p>
      {areas.length === 0 && <p style={{ fontSize: "13px", color: colors.inkSoft }}>Add an Area first.</p>}
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {bands.map((b) => (
        <div key={b.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{b.area?.code}-{b.code}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{b.area?.name}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm({ id: b.id, code: b.code, area_id: b.area_id }); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(b.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {bands.length === 0 && areas.length > 0 && <p style={{ color: colors.inkSoft }}>No pitch bands yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>
              {form.id ? "Edit pitch band" : "New pitch band"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Area</label>
              <select required value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} style={fieldStyle}>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <label style={labelStyle}>Band code</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. Band 4" style={fieldStyle} />

              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create band"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
