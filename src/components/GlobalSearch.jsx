import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, chrome } from "../lib/theme.js";

// Searches Customer (name, phone, email), Caravan (make/model/serial/key
// number) and Pitch (number) in parallel -- Andy: the search needs to cover
// "customer name, pitch, caravan make or model... phone numbers, emails and
// key number" so staff can jump straight to a live record.
//
// Pitch matching is on its own `number` column only (e.g. "B5"), not the
// "OP-B5" area-prefixed form shown on screen -- joining through Area for a
// combined match needs a dedicated view/RPC, left for a follow-up once this
// gets real use.
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
      .limit(5),
    supabase
      .from("caravan")
      .select("id, make, model, key_number, serial_number")
      .or([`make.ilike.${like}`, `model.ilike.${like}`, `key_number.ilike.${like}`, `serial_number.ilike.${like}`].join(","))
      .limit(5),
    supabase
      .from("pitch")
      .select("id, number, area:area_id(code, name)")
      .ilike("number", like)
      .limit(5),
  ]);

  return {
    customers: customers.data || [],
    caravans: caravans.data || [],
    pitches: pitches.data || [],
  };
}

const groupLabelStyle = {
  fontSize: "10.5px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: colors.brand,
  background: "#FBF3E1",
  padding: "8px 14px 5px",
};

const resultRowStyle = {
  padding: "9px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "10px",
  textDecoration: "none",
  color: "inherit",
  borderTop: `1px solid ${colors.line}`,
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      runSearch(q).then(setResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function go(path) {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(path);
  }

  const hasResults = results && (results.customers.length || results.caravans.length || results.pitches.length);

  return (
    <div ref={boxRef} style={{ position: "relative", flex: 1, maxWidth: "460px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          borderRadius: "8px",
          background: "#1C3841",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={chrome.sidebarInk} strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search customers, caravans, pitches, phone, email, key number…"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: chrome.sidebarInk,
            fontFamily: fonts.body,
            fontSize: "13.5px",
          }}
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            minWidth: "340px",
            background: colors.paper,
            border: `1px solid ${colors.line}`,
            borderRadius: "9px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.16)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          {!results && <p style={{ padding: "14px", fontSize: "13px", color: colors.inkSoft, margin: 0 }}>Searching…</p>}
          {results && !hasResults && (
            <p style={{ padding: "14px", fontSize: "13px", color: colors.inkSoft, margin: 0 }}>No matches for "{query}".</p>
          )}

          {results?.customers.length > 0 && (
            <>
              <div style={groupLabelStyle}>Customers</div>
              {results.customers.map((c) => {
                const name2 = c.customer2_first_name ? ` & ${c.customer2_first_name} ${c.customer2_surname}` : "";
                return (
                  <div key={c.id} role="button" tabIndex={0} onClick={() => go(`/customers/${c.id}`)} style={{ ...resultRowStyle, cursor: "pointer" }}>
                    <span style={{ fontWeight: 600, fontSize: "13.5px" }}>{c.customer1_first_name} {c.customer1_surname}{name2}</span>
                    <span style={{ fontSize: "12px", color: colors.inkSoft, whiteSpace: "nowrap" }}>{c.customer1_phone || c.customer1_email || ""}</span>
                  </div>
                );
              })}
            </>
          )}

          {results?.caravans.length > 0 && (
            <>
              <div style={groupLabelStyle}>Caravans</div>
              {results.caravans.map((c) => (
                <div key={c.id} role="button" tabIndex={0} onClick={() => go(`/caravans/${c.id}`)} style={{ ...resultRowStyle, cursor: "pointer" }}>
                  <span style={{ fontWeight: 600, fontSize: "13.5px" }}>{c.make} {c.model}</span>
                  <span style={{ fontSize: "12px", color: colors.inkSoft, fontFamily: fonts.mono, whiteSpace: "nowrap" }}>{c.key_number || ""}</span>
                </div>
              ))}
            </>
          )}

          {results?.pitches.length > 0 && (
            <>
              <div style={groupLabelStyle}>Pitches</div>
              {results.pitches.map((p) => (
                <div key={p.id} role="button" tabIndex={0} onClick={() => go(`/pitches?open=${p.id}`)} style={{ ...resultRowStyle, cursor: "pointer" }}>
                  <span style={{ fontWeight: 600, fontSize: "13.5px" }}>{p.area?.code}-{p.number}</span>
                  <span style={{ fontSize: "12px", color: colors.inkSoft, whiteSpace: "nowrap" }}>{p.area?.name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
