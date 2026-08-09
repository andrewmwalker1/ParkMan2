import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import AddressFields from "./AddressFields.jsx";
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

const blank = {
  id: null, name: "", street: "", town: "", county: "", country: "UK", postcode: "",
  phone: "", fax: "", web: "", email: "",
  vat_number: "", company_number: "",
  bank_account_number: "", bank_sort_code: "",
};

export default function ParksTab() {
  const { profile } = useAuth();
  const [parks, setParks] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from("park")
      .select("id, name, street, town, county, country, postcode, phone, fax, web, email, vat_number, company_number, bank_account_number, bank_sort_code")
      .eq("business_id", profile.business_id)
      .order("name")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setParks(data || []);
      });
  }

  useEffect(refresh, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, business_id: profile.business_id };
    delete payload.id;
    const { error: err } = form.id
      ? await supabase.from("park").update(payload).eq("id", form.id)
      : await supabase.from("park").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("park").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, margin: 0 }}>Parks</h2>
        <button onClick={() => { setError(null); setForm(blank); }} style={buttonStyle.primary}>+ Add park</button>
      </div>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {parks.map((p) => (
        <div key={p.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>{[p.street, p.town, p.postcode].filter(Boolean).join(", ")}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setError(null); setForm({ ...blank, ...p }); }} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(p.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {parks.length === 0 && <p style={{ color: colors.inkSoft }}>No parks yet.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "480px" }}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>
              {form.id ? "Edit park" : "New park"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} />

              <AddressFields form={form} setForm={setForm} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={labelStyle}>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Fax</label><input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Web</label><input value={form.web} onChange={(e) => setForm({ ...form, web: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>VAT number</label><input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Company number</label><input value={form.company_number} onChange={(e) => setForm({ ...form, company_number: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Bank account number</label><input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Bank sort code</label><input value={form.bank_sort_code} onChange={(e) => setForm({ ...form, bank_sort_code: e.target.value })} style={fieldStyle} /></div>
              </div>

              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create park"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
