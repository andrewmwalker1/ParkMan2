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
const blank = { id: null, name: "", start_month: "3", start_day: "1", end_month: "12", end_day: "7" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthDay(month, day) {
  if (!month || !day) return "";
  return `${day} ${MONTHS[month - 1]}`;
}

export default function SeasonsTab() {
  const { profile } = useAuth();
  const [seasons, setSeasons] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from("season")
      .select("id, name, start_month, start_day, end_month, end_day")
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
    const payload = {
      business_id: profile.business_id,
      name: form.name,
      start_month: Number(form.start_month),
      start_day: Number(form.start_day),
      end_month: Number(form.end_month),
      end_day: Number(form.end_day),
    };
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

  function monthDaySelect(monthKey, dayKey) {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <select required value={form[dayKey]} onChange={(e) => setForm({ ...form, [dayKey]: e.target.value })} style={{ ...fieldStyle, flex: 1 }}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select required value={form[monthKey]} onChange={(e) => setForm({ ...form, [monthKey]: e.target.value })} style={{ ...fieldStyle, flex: 2 }}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, margin: 0 }}>Seasons</h2>
        <button onClick={() => { setError(null); setForm(blank); }} style={buttonStyle.primary}>+ Add season</button>
      </div>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginTop: 0 }}>
        e.g. "9 Month Season" (1 Mar–7 Dec) for most of the park, "10.5 Month Season" (1 Feb–15 Dec) for the Orchard. Repeats every year — no year attached, since these dates don't change year to year. Areas pick a Season below.
      </p>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {seasons.map((s) => (
        <div key={s.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{formatMonthDay(s.start_month, s.start_day)} – {formatMonthDay(s.end_month, s.end_day)}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                setError(null);
                // s.start_month etc. can be null on rows that predate this
                // month/day schema -- String(null) is the literal text
                // "null", which then serializes as invalid on save. Fall
                // back to blank's defaults instead.
                setForm({
                  ...s,
                  start_month: String(s.start_month ?? blank.start_month),
                  start_day: String(s.start_day ?? blank.start_day),
                  end_month: String(s.end_month ?? blank.end_month),
                  end_day: String(s.end_day ?? blank.end_day),
                });
              }}
              style={buttonStyle.secondary}
            >
              Edit
            </button>
            <button onClick={() => handleDelete(s.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {seasons.length === 0 && <p style={{ color: colors.inkSoft }}>No seasons yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>
              {form.id ? "Edit season" : "New season"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 9 Month Season" style={fieldStyle} />
              <label style={labelStyle}>Start date</label>
              {monthDaySelect("start_month", "start_day")}
              <label style={{ ...labelStyle, marginTop: "10px" }}>End date</label>
              {monthDaySelect("end_month", "end_day")}
              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
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
