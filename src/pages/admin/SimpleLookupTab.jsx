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

// Generic list+modal admin tab for the "id, business_id, name [+ one
// optional extra field]" lookups (PitchType, PitchStatus, CaravanStatus,
// CaravanType) -- these are structurally identical, so one component
// parametrized by table/label/extraField covers all of them instead of
// four near-duplicate files.
export default function SimpleLookupTab({ table, singularLabel, pluralLabel, extraField }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null); // null = modal closed
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from(table)
      .select(extraField ? `id, name, ${extraField.key}` : "id, name")
      .eq("business_id", profile.business_id)
      .order("name")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRows(data || []);
      });
  }

  useEffect(refresh, [profile]);

  function blankForm() {
    return { id: null, name: "", ...(extraField ? { [extraField.key]: "" } : {}) };
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { business_id: profile.business_id, name: form.name };
    if (extraField) payload[extraField.key] = form[extraField.key] || null;
    const { error: err } = form.id
      ? await supabase.from(table).update(payload).eq("id", form.id)
      : await supabase.from(table).insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from(table).delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, margin: 0 }}>{pluralLabel}</h2>
        <button onClick={() => { setError(null); setForm(blankForm()); }} style={buttonStyle.primary}>+ Add {singularLabel.toLowerCase()}</button>
      </div>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {rows.map((r) => (
        <div key={r.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            {extraField && r[extraField.key] != null && (
              <div style={{ fontSize: "12px", color: colors.inkSoft }}>{extraField.label}: {r[extraField.key]}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm({ id: r.id, name: r.name, ...(extraField ? { [extraField.key]: r[extraField.key] ?? "" } : {}) }); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(r.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p style={{ color: colors.inkSoft }}>No {pluralLabel.toLowerCase()} yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }} onClick={() => setForm(null)}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, marginTop: 0 }}>
              {form.id ? `Edit ${singularLabel.toLowerCase()}` : `New ${singularLabel.toLowerCase()}`}
            </h2>
            <form onSubmit={handleSave}>
              <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" style={fieldStyle} />
              {extraField && (
                <input
                  type={extraField.type || "text"}
                  value={form[extraField.key]}
                  onChange={(e) => setForm({ ...form, [extraField.key]: e.target.value })}
                  placeholder={extraField.label}
                  style={fieldStyle}
                />
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
