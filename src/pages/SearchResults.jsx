import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle } from "../lib/theme.js";

const CUSTOMER_COLUMNS = "id, customer1_first_name, customer1_surname, customer1_phone, customer1_email, customer2_first_name, customer2_surname";
const CARAVAN_COLUMNS = "id, make, model, key_number, serial_number";

function caravanLabel(c) {
  return [c.make, c.model].filter(Boolean).join(" ");
}

// Andy (9 Aug 2026): a pitch or caravan match should also surface what's
// connected to it -- searching a pitch number should find the caravan
// sited there and its owner, searching a caravan (e.g. "Carnaby") should
// find its owner and its current pitch. Direct field matches run first;
// this then follows Placement/Ownership one hop out from whatever
// directly matched and merges the results in, tagging each derived row
// with `matchedVia` so it's clear why it showed up.
async function runSearch(q) {
  const like = `%${q}%`;

  const [directCustomers, directCaravans, directPitches] = await Promise.all([
    supabase
      .from("customer")
      .select(CUSTOMER_COLUMNS)
      .or(
        [
          `customer1_first_name.ilike.${like}`,
          `customer1_surname.ilike.${like}`,
          `customer2_first_name.ilike.${like}`,
          `customer2_surname.ilike.${like}`,
          `customer1_phone.ilike.${like}`,
          `customer1_email.ilike.${like}`,
          `customer2_phone.ilike.${like}`,
          `customer2_email.ilike.${like}`,
        ].join(",")
      )
      .order("customer1_surname")
      .limit(100),
    supabase
      .from("caravan")
      .select(CARAVAN_COLUMNS)
      .or([`make.ilike.${like}`, `model.ilike.${like}`, `key_number.ilike.${like}`, `serial_number.ilike.${like}`].join(","))
      .order("make")
      .limit(100),
    supabase
      .from("pitch")
      .select("id, number, area:area_id(name)")
      .ilike("number", like)
      .limit(100),
  ]);

  const customers = new Map((directCustomers.data || []).map((c) => [c.id, { ...c, matchedVia: null }]));
  const caravans = new Map((directCaravans.data || []).map((c) => [c.id, { ...c, matchedVia: null }]));
  const pitches = new Map((directPitches.data || []).map((p) => [p.id, { ...p, matchedVia: null }]));

  const directMatch = {
    customers: customers.size > 0,
    caravans: caravans.size > 0,
    pitches: pitches.size > 0,
  };

  async function pullOwners(caravanIds, viaLabel) {
    if (caravanIds.length === 0) return;
    const { data: owns } = await supabase
      .from("ownership")
      .select("primary_customer_id, secondary_customer_id")
      .in("caravan_id", caravanIds)
      .is("end_date", null);
    const customerIds = [...new Set((owns || []).flatMap((o) => [o.primary_customer_id, o.secondary_customer_id]).filter(Boolean))]
      .filter((id) => !customers.has(id));
    if (customerIds.length === 0) return;
    const { data: owners } = await supabase.from("customer").select(CUSTOMER_COLUMNS).in("id", customerIds);
    (owners || []).forEach((c) => customers.set(c.id, { ...c, matchedVia: viaLabel }));
  }

  // Matched pitches -> the caravan currently sited there, and its owner(s).
  if (directMatch.pitches) {
    const { data: placements } = await supabase
      .from("placement")
      .select("pitch_id, caravan_id")
      .in("pitch_id", [...pitches.keys()])
      .is("end_date", null);
    const newCaravanIds = (placements || []).map((pl) => pl.caravan_id).filter((id) => !caravans.has(id));
    if (newCaravanIds.length) {
      const { data: cars } = await supabase.from("caravan").select(CARAVAN_COLUMNS).in("id", newCaravanIds);
      (cars || []).forEach((c) => {
        const pl = (placements || []).find((p) => p.caravan_id === c.id);
        const pitchLabel = pl ? pitches.get(pl.pitch_id)?.number : null;
        caravans.set(c.id, { ...c, matchedVia: pitchLabel ? `sited on ${pitchLabel}` : null });
      });
    }
    await pullOwners((placements || []).map((pl) => pl.caravan_id), "owns the caravan sited there");
  }

  // Matched caravans -> their current pitch, and their owner(s).
  if (directMatch.caravans) {
    const caravanIds = [...caravans.keys()];
    const { data: placements } = await supabase
      .from("placement")
      .select("pitch_id, caravan_id")
      .in("caravan_id", caravanIds)
      .is("end_date", null);
    const newPitchIds = (placements || []).map((pl) => pl.pitch_id).filter((id) => id && !pitches.has(id));
    if (newPitchIds.length) {
      const { data: pits } = await supabase.from("pitch").select("id, number, area:area_id(name)").in("id", newPitchIds);
      (pits || []).forEach((p) => {
        const pl = (placements || []).find((x) => x.pitch_id === p.id);
        const c = pl ? caravans.get(pl.caravan_id) : null;
        pitches.set(p.id, { ...p, matchedVia: c ? `has ${caravanLabel(c)}` : null });
      });
    }
    await pullOwners(caravanIds, "owns a matching caravan");
  }

  return {
    customers: [...customers.values()],
    caravans: [...caravans.values()],
    pitches: [...pitches.values()],
    directMatch,
  };
}

const tableWrapStyle = { ...cardStyle, overflow: "hidden" };
const thStyle = { textAlign: "left", padding: "10px 16px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.inkSoft, borderBottom: `1px solid ${colors.line}` };
const tdStyle = { padding: "12px 16px", fontSize: "13.5px", borderBottom: `1px solid ${colors.line}` };
const linkStyle = { color: colors.brandDark, fontWeight: 600, textDecoration: "none" };
const viaStyle = { fontSize: "11.5px", color: colors.brand, fontStyle: "italic" };

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState("customers");

  useEffect(() => {
    if (!q) {
      setResults({ customers: [], caravans: [], pitches: [], directMatch: {} });
      return;
    }
    setResults(null);
    runSearch(q).then((r) => {
      setResults(r);
      // Default to whichever category the query directly matched --
      // e.g. searching a caravan make shouldn't default to the Customers
      // tab just because their owner got pulled in too.
      const { directMatch } = r;
      setTab(
        directMatch.customers ? "customers" : directMatch.caravans ? "caravans" : directMatch.pitches ? "pitches"
        : r.customers.length ? "customers" : r.caravans.length ? "caravans" : "pitches"
      );
    });
  }, [q]);

  if (!results) {
    return (
      <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ color: colors.inkSoft }}>Searching…</p>
      </div>
    );
  }

  const tabs = [
    { key: "customers", label: "Customers", count: results.customers.length },
    { key: "caravans", label: "Caravans", count: results.caravans.length },
    { key: "pitches", label: "Pitches", count: results.pitches.length },
  ];

  const noResults = results.customers.length === 0 && results.caravans.length === 0 && results.pitches.length === 0;

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "0 0 4px" }}>Search results</h1>
      <p style={{ color: colors.inkSoft, margin: "0 0 20px" }}>Showing all results for "{q}"</p>

      {noResults ? (
        <p style={{ color: colors.inkSoft }}>No matches for "{q}".</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: "20px", borderBottom: `1px solid ${colors.line}`, marginBottom: "16px" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                disabled={t.count === 0}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: tab === t.key ? `2px solid ${colors.brand}` : "2px solid transparent",
                  padding: "0 0 10px",
                  marginBottom: "-1px",
                  fontFamily: fonts.body,
                  fontSize: "14px",
                  fontWeight: tab === t.key ? 700 : 500,
                  color: t.count === 0 ? colors.inkSoft : tab === t.key ? colors.brandDark : colors.ink,
                  opacity: t.count === 0 ? 0.5 : 1,
                  cursor: t.count === 0 ? "default" : "pointer",
                }}
              >
                {t.count} {t.label}
              </button>
            ))}
          </div>

          {tab === "customers" && (
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Customer</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {results.customers.map((c) => {
                    const name2 = c.customer2_first_name ? ` & ${c.customer2_first_name} ${c.customer2_surname}` : "";
                    return (
                      <tr key={c.id}>
                        <td style={tdStyle}>
                          <Link to={`/customers/${c.id}`} style={linkStyle}>{c.customer1_first_name} {c.customer1_surname}{name2}</Link>
                          {c.matchedVia && <div style={viaStyle}>{c.matchedVia}</div>}
                        </td>
                        <td style={{ ...tdStyle, color: colors.inkSoft }}>{c.customer1_phone || "—"}</td>
                        <td style={{ ...tdStyle, color: colors.inkSoft }}>{c.customer1_email || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "caravans" && (
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Caravan</th>
                    <th style={thStyle}>Key number</th>
                    <th style={thStyle}>Serial number</th>
                  </tr>
                </thead>
                <tbody>
                  {results.caravans.map((c) => (
                    <tr key={c.id}>
                      <td style={tdStyle}>
                        <Link to={`/caravans/${c.id}`} style={linkStyle}>{c.make} {c.model}</Link>
                        {c.matchedVia && <div style={viaStyle}>{c.matchedVia}</div>}
                      </td>
                      <td style={{ ...tdStyle, color: colors.inkSoft, fontFamily: fonts.mono }}>{c.key_number || "—"}</td>
                      <td style={{ ...tdStyle, color: colors.inkSoft, fontFamily: fonts.mono }}>{c.serial_number || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "pitches" && (
            <div style={tableWrapStyle}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Pitch</th>
                    <th style={thStyle}>Area</th>
                  </tr>
                </thead>
                <tbody>
                  {results.pitches.map((p) => (
                    <tr key={p.id}>
                      <td style={tdStyle}>
                        <Link to={`/pitches?open=${p.id}`} style={linkStyle}>{p.number}</Link>
                        {p.matchedVia && <div style={viaStyle}>{p.matchedVia}</div>}
                      </td>
                      <td style={{ ...tdStyle, color: colors.inkSoft }}>{p.area?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
