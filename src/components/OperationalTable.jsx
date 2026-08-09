import { Link } from "react-router-dom";
import { colors, fonts, cardStyle } from "../lib/theme.js";
import { customerName, customerContact, caravanLabel } from "../lib/operationalRows.js";

const tableWrapStyle = { ...cardStyle, overflow: "hidden" };
const thStyle = { textAlign: "left", padding: "10px 16px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.inkSoft, borderBottom: `1px solid ${colors.line}` };
const tdStyle = { padding: "12px 16px", fontSize: "13.5px", borderBottom: `1px solid ${colors.line}`, verticalAlign: "top" };
const linkStyle = { color: colors.brandDark, fontWeight: 600, textDecoration: "none" };
const subStyle = { fontSize: "12px", color: colors.inkSoft, marginTop: "2px" };
const blankStyle = { color: colors.inkSoft };

// The Pitch/Customer/Caravan table shared by SearchResults.jsx and
// ParkList.jsx -- same row shape (see loadOperationalRows), just a
// different set of rows feeding it.
export default function OperationalTable({ rows }) {
  return (
    <div style={tableWrapStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Pitch</th>
            <th style={thStyle}>Customer</th>
            <th style={thStyle}>Caravan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={tdStyle}>
                {r.pitch ? (
                  <>
                    <Link to={`/units/${r.pitch.id}?tab=pitch`} style={linkStyle}>{r.pitch.number}</Link>
                    <div style={subStyle}>{r.pitch.area?.name}</div>
                  </>
                ) : (
                  <span style={blankStyle}>Off-park</span>
                )}
              </td>
              <td style={tdStyle}>
                {r.customer ? (
                  <>
                    <Link to={r.pitch ? `/units/${r.pitch.id}?tab=customer` : `/customers/${r.customer.id}`} style={linkStyle}>{customerName(r.customer)}</Link>
                    {customerContact(r.customer) && <div style={subStyle}>{customerContact(r.customer)}</div>}
                  </>
                ) : (
                  <span style={blankStyle}>—</span>
                )}
              </td>
              <td style={tdStyle}>
                {r.caravan ? (
                  <>
                    <Link to={r.pitch ? `/units/${r.pitch.id}?tab=caravan` : `/caravans/${r.caravan.id}`} style={linkStyle}>{caravanLabel(r.caravan)}</Link>
                    {r.caravan.key_number && <div style={{ ...subStyle, fontFamily: fonts.mono }}>{r.caravan.key_number}</div>}
                  </>
                ) : (
                  <span style={blankStyle}>Vacant</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
