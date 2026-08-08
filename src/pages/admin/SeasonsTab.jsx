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
const blank = { id: null, name: "", start_date: "", end_date: "" };

export default function SeasonsTab() {
  const { profile } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from("season")
      .select("id, name, start_date, end_date")
      .eq("business_id", profile.business_id)
      .order("name")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setSeasons(data || []);
      });
  }

  useEffect(refresh, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { business_id: profile.business_id, name: form.name, start_date: form.start_date, end_date: form.end_date };
    const { error: err } = form.id
      ? await supabase.from("season").update(payload).eq("id", form.id)
      : await supabase.from("season").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("season").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, margin: 0 }}>Seasons</h2>
        <button onClick={() => { setError(null); setForm(blank); }} style={buttonStyle.primary}>+ Add season</button>
      </div>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginTop: 0 }}>
        e.g. "9 Month Season" (1 Mar–7 Dec) for most of the park, "10.5 Month Season" (1 Feb–15 Dec) for the Orchard. Areas pick a Season below.
      </p>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {seasons.map((s) => (
        <div key={s.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{s.start_date} – {s.end_date}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm(s); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(s.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {seasons.length === 0 && <p style={{ color: colors.inkSoft }}>No seasons yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }} onClick={() => setForm(null)}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, marginTop: 0 }}>
              {form.id ? "Edit season" : "New season"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 9 Month Season" style={fieldStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={labelStyle}>Start date</label><input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>End date</label><input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={fieldStyle} /></div>
              </div>
              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create season"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
