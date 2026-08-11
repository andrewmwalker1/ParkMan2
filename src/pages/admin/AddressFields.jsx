import { colors, fonts } from "../../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
  marginBottom: "10px",
};

const textareaStyle = { ...fieldStyle, resize: "vertical", fontFamily: fonts.body };
const labelStyle = { display: "block", fontSize: "12px", color: colors.inkSoft, marginBottom: "4px" };

// Structured address fields shared by Business, Park, and Customer --
// Street/Town/County/Country/Postcode, corrected 8 Aug 2026 after
// review: Street is a multi-line box (a real address can run past one
// line), and Country was missing (defaults UK). Broken into real
// fields rather than one free-text block (unlike CampManager's
// printout display) so mail merge has real fields to merge into.
export default function AddressFields({ form, setForm, disabled }) {
  return (
    <>
      <label style={labelStyle}>Street</label>
      <textarea disabled={disabled} rows={2} value={form.street || ""} onChange={(e) => setForm({ ...form, street: e.target.value })} style={textareaStyle} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Town</label>
          <input disabled={disabled} value={form.town || ""} onChange={(e) => setForm({ ...form, town: e.target.value })} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>County</label>
          <input disabled={disabled} value={form.county || ""} onChange={(e) => setForm({ ...form, county: e.target.value })} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Country</label>
          <input disabled={disabled} value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Postcode</label>
          <input disabled={disabled} value={form.postcode || ""} onChange={(e) => setForm({ ...form, postcode: e.target.value })} style={fieldStyle} />
        </div>
      </div>
    </>
  );
}
