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
const blank = { id: null, code: "", name: "" };

export default function NominalCodesTab() {
  const { profile } = useAuth();
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from("nominal_code")
      .select("id, code, name")
      .eq("business_id", profile.business_id)
      .order("code")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCodes(data || []);
      });
  }

  useEffect(refresh, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { business_id: profile.business_id, code: form.code, name: form.name };
    const { error: err } = form.id
      ? await supabase.from("nominal_code").update(payload).eq("id", form.id)
      : await supabase.from("nominal_code").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("nominal_code").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, margin: 0 }}>Nominal codes</h2>
        <button onClick={() => { setError(null); setForm(blank); }} style={buttonStyle.primary}>+ Add nominal code</button>
      </div>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginTop: 0 }}>
        Your Sage chart of accounts (e.g. "4011 — Pitch Fees"). Picked per invoice line, and written to the Sage export's Ledger Account column.
      </p>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {codes.map((c) => (
        <div key={c.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{c.code}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{c.name}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm({ id: c.id, code: c.code, name: c.name }); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(c.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {codes.length === 0 && <p style={{ color: colors.inkSoft }}>No nominal codes yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>
              {form.id ? "Edit nominal code" : "New nominal code"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Code</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. 4011" style={fieldStyle} />
              <label style={labelStyle}>Description</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pitch Fees" style={fieldStyle} />
              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create nominal code"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
