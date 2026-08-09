import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle } from "../lib/theme.js";

function customerName(c) {
  if (!c) return null;
  const name2 = c.customer2_first_name ? ` & ${c.customer2_first_name} ${c.customer2_surname}` : "";
  return `${c.customer1_first_name} ${c.customer1_surname}${name2}`;
}

function customerContact(c) {
  return c?.customer1_phone || c?.customer1_email || null;
}

function caravanLabel(c) {
  return c ? [c.make, c.model].filter(Boolean).join(" ") : null;
}

// Andy (9 Aug 2026, after seeing the tabbed version): Pitches, Customers
// and Caravans already each have their own search on their own screen.
// This is the persistent top-bar one -- the one used most in day-to-day
// operations -- and what's actually needed there is CampManager's
// "Holiday Homes" shape: one row per pitch, Customer and Caravan as
// columns alongside it, not three separate lists to flip between.
//
// Built by fetching the (small, ~200-row) pitch/placement/caravan/
// ownership/customer tables in full and joining them in memory, rather
// than a deep nested PostgREST embed -- reads more plainly and avoids
// the multi-level embedded-filter edge cases that come with joining
// five tables in one query.
async function loadOperationalRows() {
  const [{ data: pitches }, { data: placements }, { data: caravans }, { data: ownerships }, { data: customers }] = await Promise.all([
    supabase.from("pitch").select("id, number, sort_key, area:area_id(name, code)"),
    supabase.from("placement").select("pitch_id, caravan_id").is("end_date", null),
    supabase.from("caravan").select("id, make, model, key_number, serial_number"),
    supabase.from("ownership").select("caravan_id, primary_customer_id").is("end_date", null),
    supabase.from("customer").select("id, customer1_first_name, customer1_surname, customer1_phone, customer1_email, customer2_first_name, customer2_surname"),
  ]);

  const caravanById = new Map((caravans || []).map((c) => [c.id, c]));
  const customerById = new Map((customers || []).map((c) => [c.id, c]));
  const caravanIdByPitchId = new Map((placements || []).map((pl) => [pl.pitch_id, pl.caravan_id]));
  const customerIdByCaravanId = new Map((ownerships || []).map((o) => [o.caravan_id, o.primary_customer_id]));

  const rows = [];
  const sitedCaravanIds = new Set();
  const linkedCustomerIds = new Set();

  (pitches || [])
    .sort((a, b) => {
      const areaCmp = (a.area?.code || "").localeCompare(b.area?.code || "");
      if (areaCmp !== 0) return areaCmp;
      return (a.sort_key || a.number).localeCompare(b.sort_key || b.number);
    })
    .forEach((pitch) => {
      const caravanId = caravanIdByPitchId.get(pitch.id);
      const caravan = caravanId ? caravanById.get(caravanId) : null;
      const customerId = caravanId ? customerIdByCaravanId.get(caravanId) : null;
      const customer = customerId ? customerById.get(customerId) : null;
      if (caravanId) sitedCaravanIds.add(caravanId);
      if (customerId) linkedCustomerIds.add(customerId);
      rows.push({ key: `pitch-${pitch.id}`, pitch, caravan, customer });
    });

  // Off-park caravans and their owners still show up, just without a
  // Pitch cell -- e.g. a caravan in for repair, or between placements.
  (caravans || []).forEach((caravan) => {
    if (sitedCaravanIds.has(caravan.id)) return;
    const customerId = customerIdByCaravanId.get(caravan.id);
    const customer = customerId ? customerById.get(customerId) : null;
    if (customerId) linkedCustomerIds.add(customerId);
    rows.push({ key: `caravan-${caravan.id}`, pitch: null, caravan, customer });
  });

  (customers || []).forEach((customer) => {
    if (linkedCustomerIds.has(customer.id)) return;
    rows.push({ key: `customer-${customer.id}`, pitch: null, caravan: null, customer });
  });

  return rows;
}

function rowMatches(row, needle) {
  const pitchText = row.pitch?.number || "";
  const caravanText = [row.caravan?.make, row.caravan?.model, row.caravan?.key_number, row.caravan?.serial_number].filter(Boolean).join(" ");
  const customerText = [
    row.customer?.customer1_first_name, row.customer?.customer1_surname,
    row.customer?.customer2_first_name, row.customer?.customer2_surname,
    row.customer?.customer1_phone, row.customer?.customer1_email,
  ].filter(Boolean).join(" ");
  return `${pitchText} ${caravanText} ${customerText}`.toLowerCase().includes(needle);
}

const tableWrapStyle = { ...cardStyle, overflow: "hidden" };
const thStyle = { textAlign: "left", padding: "10px 16px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.inkSoft, borderBottom: `1px solid ${colors.line}` };
const tdStyle = { padding: "12px 16px", fontSize: "13.5px", borderBottom: `1px solid ${colors.line}`, verticalAlign: "top" };
const linkStyle = { color: colors.brandDark, fontWeight: 600, textDecoration: "none" };
const subStyle = { fontSize: "12px", color: colors.inkSoft, marginTop: "2px" };
const blankStyle = { color: colors.inkSoft };

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [allRows, setAllRows] = useState(null);

  useEffect(() => {
    setAllRows(null);
    loadOperationalRows().then(setAllRows);
  }, [q]);

  if (!allRows) {
    return (
      <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
        <p style={{ color: colors.inkSoft }}>Searching…</p>
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const rows = needle ? allRows.filter((r) => rowMatches(r, needle)) : [];

  return (
    <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "0 0 4px" }}>Search results</h1>
      <p style={{ color: colors.inkSoft, margin: "0 0 20px" }}>
        {rows.length} match{rows.length === 1 ? "" : "es"} for "{q}"
      </p>

      {rows.length === 0 ? (
        <p style={{ color: colors.inkSoft }}>No matches for "{q}".</p>
      ) : (
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
                        <Link to={`/pitches?open=${r.pitch.id}`} style={linkStyle}>{r.pitch.number}</Link>
                        <div style={subStyle}>{r.pitch.area?.name}</div>
                      </>
                    ) : (
                      <span style={blankStyle}>Off-park</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {r.customer ? (
                      <>
                        <Link to={`/customers/${r.customer.id}`} style={linkStyle}>{customerName(r.customer)}</Link>
                        {customerContact(r.customer) && <div style={subStyle}>{customerContact(r.customer)}</div>}
                      </>
                    ) : (
                      <span style={blankStyle}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {r.caravan ? (
                      <>
                        <Link to={`/caravans/${r.caravan.id}`} style={linkStyle}>{caravanLabel(r.caravan)}</Link>
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
      )}
    </div>
  );
}
