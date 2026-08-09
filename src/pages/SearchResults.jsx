import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle } from "../lib/theme.js";

async function runSearch(q) {
  const like = `%${q}%`;

  const [customers, caravans, pitches] = await Promise.all([
    supabase
      .from("customer")
      .select("id, customer1_first_name, customer1_surname, customer1_phone, customer1_email, customer2_first_name, customer2_surname")
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
      .select("id, make, model, key_number, serial_number")
      .or([`make.ilike.${like}`, `model.ilike.${like}`, `key_number.ilike.${like}`, `serial_number.ilike.${like}`].join(","))
      .order("make")
      .limit(100),
    supabase
      .from("pitch")
      .select("id, number, area:area_id(name)")
      .ilike("number", like)
      .limit(100),
  ]);

  return {
    customers: customers.data || [],
    caravans: caravans.data || [],
    pitches: pitches.data || [],
  };
}

const tableWrapStyle = { ...cardStyle, overflow: "hidden" };
const thStyle = { textAlign: "left", padding: "10px 16px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.inkSoft, borderBottom: `1px solid ${colors.line}` };
const tdStyle = { padding: "12px 16px", fontSize: "13.5px", borderBottom: `1px solid ${colors.line}` };
const linkStyle = { color: colors.brandDark, fontWeight: 600, textDecoration: "none" };

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState("customers");

  useEffect(() => {
    if (!q) {
      setResults({ customers: [], caravans: [], pitches: [] });
      return;
    }
    setResults(null);
    runSearch(q).then((r) => {
      setResults(r);
      setTab(r.customers.length ? "customers" : r.caravans.length ? "caravans" : "pitches");
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
