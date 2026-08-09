import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { colors, fonts } from "../lib/theme.js";
import { loadOperationalRows } from "../lib/operationalRows.js";
import OperationalTable from "../components/OperationalTable.jsx";

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

// Dashboard stat tiles link straight into a filtered view of this same
// table (Andy, 9 Aug 2026: "I'd like to click on the stats tiles and
// get to the search list showing the appropriate info") rather than a
// free-text search -- same three-way occupancy split as the Dashboard.
const FILTERS = {
  occupied: { title: "Occupied pitches", desc: "caravan sited, with an owner recorded", test: (r) => r.pitch && r.caravan && r.customer },
  unoccupied: { title: "Unoccupied pitches", desc: "caravan sited, no owner recorded", test: (r) => r.pitch && r.caravan && !r.customer },
  empty: { title: "Empty pitches", desc: "no caravan sited", test: (r) => r.pitch && !r.caravan },
  forsale: { title: "Caravans for sale", desc: null, test: (r) => !!r.caravan?.for_sale },
};

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const filterKey = searchParams.get("filter");
  const filter = filterKey && FILTERS[filterKey] ? FILTERS[filterKey] : null;
  const [allRows, setAllRows] = useState(null);

  useEffect(() => {
    setAllRows(null);
    loadOperationalRows().then(setAllRows);
  }, [q, filterKey]);

  if (!allRows) {
    return (
      <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
        <p style={{ color: colors.inkSoft }}>Searching…</p>
      </div>
    );
  }

  const needle = q.trim().toLowerCase();
  const rows = filter ? allRows.filter(filter.test) : needle ? allRows.filter((r) => rowMatches(r, needle)) : [];

  return (
    <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "0 0 4px" }}>
        {filter ? filter.title : "Search results"}
      </h1>
      <p style={{ color: colors.inkSoft, margin: "0 0 20px" }}>
        {filter
          ? `${rows.length} result${rows.length === 1 ? "" : "s"}${filter.desc ? ` — ${filter.desc}` : ""}`
          : `${rows.length} match${rows.length === 1 ? "" : "es"} for "${q}"`}
      </p>

      {rows.length === 0 ? (
        <p style={{ color: colors.inkSoft }}>{filter ? "No matches." : `No matches for "${q}".`}</p>
      ) : (
        <OperationalTable rows={rows} />
      )}
    </div>
  );
}
