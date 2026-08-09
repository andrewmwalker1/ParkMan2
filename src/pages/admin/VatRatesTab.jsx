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
const blank = { id: null, name: "", rate_percent: "" };

export default function VatRatesTab() {
  const { profile } = useAuth();
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from("vat_rate")
      .select("id, name, rate_percent")
      .eq("business_id", profile.business_id)
      .order("rate_percent", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setRates(data || []);
      });
  }

  useEffect(refresh, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { business_id: profile.business_id, name: form.name, rate_percent: Number(form.rate_percent) };
    const { error: err } = form.id
      ? await supabase.from("vat_rate").update(payload).eq("id", form.id)
      : await supabase.from("vat_rate").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("vat_rate").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, margin: 0 }}>VAT rates</h2>
        <button onClick={() => { setError(null); setForm(blank); }} style={buttonStyle.primary}>+ Add VAT rate</button>
      </div>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginTop: 0 }}>
        Picked per invoice line. Name should match Sage's own VAT rate names (e.g. "Standard") since it's written to the Sage export as-is.
      </p>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {rates.map((r) => (
        <div key={r.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{r.rate_percent}%</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm({ id: r.id, name: r.name, rate_percent: String(r.rate_percent) }); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(r.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {rates.length === 0 && <p style={{ color: colors.inkSoft }}>No VAT rates yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "400px" }}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>
              {form.id ? "Edit VAT rate" : "New VAT rate"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard" style={fieldStyle} />
              <label style={labelStyle}>Rate (%)</label>
              <input required type="number" step="0.01" min="0" value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} placeholder="e.g. 20" style={fieldStyle} />
              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create VAT rate"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
