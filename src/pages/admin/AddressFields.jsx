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

const labelStyle = { display: "block", fontSize: "12px", color: colors.inkSoft, marginBottom: "4px" };

// Structured address fields shared by Business and Park -- broken out
// (rather than one free-text block, unlike Customer's address which
// deliberately stayed a blob to mirror CampManager's shape) so mail
// merge has real fields to merge into, not a block of prose to parse.
export default function AddressFields({ form, setForm }) {
  return (
    <>
      <label style={labelStyle}>Address line 1</label>
      <input value={form.address_line1 || ""} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} style={fieldStyle} />

      <label style={labelStyle}>Address line 2</label>
      <input value={form.address_line2 || ""} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} style={fieldStyle} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Town</label>
          <input value={form.town || ""} onChange={(e) => setForm({ ...form, town: e.target.value })} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>County</label>
          <input value={form.county || ""} onChange={(e) => setForm({ ...form, county: e.target.value })} style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Postcode</label>
          <input value={form.postcode || ""} onChange={(e) => setForm({ ...form, postcode: e.target.value })} style={fieldStyle} />
        </div>
      </div>
    </>
  );
}
