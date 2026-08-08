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

export default function BusinessTab() {
  const { profile } = useAuth();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("business")
      .select("id, name, street, town, county, country, postcode, phone, email, vat_number, company_number")
      .eq("id", profile.business_id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setForm(data);
      });
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const { error: err } = await supabase
      .from("business")
      .update({
        name: form.name,
        street: form.street,
        town: form.town,
        county: form.county,
        country: form.country,
        postcode: form.postcode,
        phone: form.phone,
        email: form.email,
        vat_number: form.vat_number,
        company_number: form.company_number,
      })
      .eq("id", form.id);
    if (err) {
      setStatus("error");
      setError(err.message);
      return;
    }
    setStatus("saved");
  }

  if (!form) return <p style={{ color: colors.inkSoft }}>Loading…</p>;

  return (
    <div>
      <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.mossDark, marginTop: 0 }}>Business</h2>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginTop: 0 }}>
        The company itself — used on generated documents once that's built. Park-specific contact details (address, VAT rate, bank details) live under Parks instead.
      </p>
      <form onSubmit={handleSave} style={{ ...cardStyle, padding: "20px 24px", maxWidth: "480px" }}>
        <label style={labelStyle}>Name</label>
        <input required value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldStyle} />

        <AddressFields form={form} setForm={setForm} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>VAT number</label>
            <input value={form.vat_number || ""} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Company number</label>
            <input value={form.company_number || ""} onChange={(e) => setForm({ ...form, company_number: e.target.value })} style={fieldStyle} />
          </div>
        </div>

        {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
        {status === "saved" && <p style={{ color: colors.moss, fontSize: "13px" }}>Saved.</p>}

        <button type="submit" disabled={status === "saving"} style={buttonStyle.primary}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
