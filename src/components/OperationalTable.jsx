import { Link } from "react-router-dom";
import { colors, fonts, cardStyle } from "../lib/theme.js";
import { customerName, customerContact, caravanLabel } from "../lib/operationalRows.js";

const tableWrapStyle = { ...cardStyle, overflow: "hidden" };
const thStyle = { textAlign: "left", padding: "10px 16px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.inkSoft, borderBottom: `1px solid ${colors.line}` };
const thSortableStyle = { ...thStyle, cursor: "pointer", userSelect: "none" };
const tdStyle = { padding: "12px 16px", fontSize: "13.5px", borderBottom: `1px solid ${colors.line}`, verticalAlign: "top" };
const checkboxTdStyle = { ...tdStyle, width: "1%" };
const linkStyle = { color: colors.brandDark, fontWeight: 600, textDecoration: "none" };
const subStyle = { fontSize: "12px", color: colors.inkSoft, marginTop: "2px" };
const blankStyle = { color: colors.inkSoft };

// The Pitch/Customer/Caravan table shared by SearchResults.jsx and
// ParkList.jsx -- same row shape (see loadOperationalRows), just a
// different set of rows feeding it.
//
// - originPath/originLabel are stamped onto each Link's router state so
//   UnitDetail.jsx's "← Back" returns to wherever this table was
//   rendered (Park list / Search results), not always "Pitches".
// - Sorting and selection are both controlled from the parent (sort
//   has to happen on the full row set before ParkList paginates it,
//   so it can't live inside this component) -- pass sortKey/sortDir/
//   onSort and selected/onToggleRow/onToggleAll, or omit the
//   selection props entirely to render without checkboxes.
export default function OperationalTable({
  rows,
  originPath,
  originLabel,
  sortKey,
  sortDir,
  onSort,
  selected,
  onToggleRow,
  onToggleAll,
}) {
  const selectable = !!(selected && onToggleRow);
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.has(r.key));

  function sortArrow(key) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  const originState = originPath ? { originPath, originLabel } : undefined;

  return (
    <div style={tableWrapStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {selectable && (
              <th style={checkboxTdStyle}>
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Select all" />
              </th>
            )}
            <th style={onSort ? thSortableStyle : thStyle} onClick={onSort ? () => onSort("pitch") : undefined}>Pitch{sortArrow("pitch")}</th>
            <th style={onSort ? thSortableStyle : thStyle} onClick={onSort ? () => onSort("customer") : undefined}>Customer{sortArrow("customer")}</th>
            <th style={onSort ? thSortableStyle : thStyle} onClick={onSort ? () => onSort("caravan") : undefined}>Caravan{sortArrow("caravan")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              {selectable && (
                <td style={checkboxTdStyle}>
                  <input type="checkbox" checked={selected.has(r.key)} onChange={() => onToggleRow(r.key)} aria-label={`Select ${r.key}`} />
                </td>
              )}
              <td style={tdStyle}>
                {r.pitch ? (
                  <>
                    <Link to={`/units/${r.pitch.id}?tab=pitch`} state={originState} style={linkStyle}>{r.pitch.number}</Link>
                    <div style={subStyle}>{r.pitch.area?.name}</div>
                  </>
                ) : (
                  <span style={blankStyle}>Off-park</span>
                )}
              </td>
              <td style={tdStyle}>
                {r.customer ? (
                  <>
                    <Link to={`/customers/${r.customer.id}`} state={originState} style={linkStyle}>{customerName(r.customer)}</Link>
                    {customerContact(r.customer) && <div style={subStyle}>{customerContact(r.customer)}</div>}
                  </>
                ) : (
                  <span style={blankStyle}>—</span>
                )}
              </td>
              <td style={tdStyle}>
                {r.caravan ? (
                  <>
                    <Link to={`/caravans/${r.caravan.id}`} state={originState} style={linkStyle}>{caravanLabel(r.caravan)}</Link>
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
