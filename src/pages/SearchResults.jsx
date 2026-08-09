import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { colors, fonts, buttonStyle } from "../lib/theme.js";
import { loadOperationalRows, sortOperationalRows } from "../lib/operationalRows.js";
import { exportRowsToCsv } from "../lib/exportCsv.js";
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
  const location = useLocation();
  const q = searchParams.get("q") || "";
  const filterKey = searchParams.get("filter");
  const filter = filterKey && FILTERS[filterKey] ? FILTERS[filterKey] : null;
  const [allRows, setAllRows] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setAllRows(null);
    setSelected(new Set());
    loadOperationalRows().then(setAllRows);
  }, [q, filterKey]);

  const rows = useMemo(() => {
    if (!allRows) return [];
    const needle = q.trim().toLowerCase();
    const matched = filter ? allRows.filter(filter.test) : needle ? allRows.filter((r) => rowMatches(r, needle)) : [];
    return sortKey ? sortOperationalRows(matched, sortKey, sortDir) : matched;
  }, [allRows, q, filter, sortKey, sortDir]);

  if (!allRows) {
    return (
      <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
        <p style={{ color: colors.inkSoft }}>Searching…</p>
      </div>
    );
  }

  function handleSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
    }
  }

  function toggleRow(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (rows.every((r) => prev.has(r.key)) ? new Set() : new Set(rows.map((r) => r.key))));
  }

  async function handleExport() {
    setExporting(true);
    const selectedRows = rows.filter((r) => selected.has(r.key));
    await exportRowsToCsv(selectedRows, "parkman2-search-results.csv");
    setExporting(false);
  }

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
        <>
          {selected.size > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <button onClick={handleExport} disabled={exporting} style={buttonStyle.secondary}>
                {exporting ? "Exporting…" : `Export ${selected.size} selected to CSV`}
              </button>
            </div>
          )}
          <OperationalTable
            rows={rows}
            originPath={`${location.pathname}${location.search}`}
            originLabel={filter ? filter.title : "Search results"}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            selected={selected}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
          />
        </>
      )}
    </div>
  );
}
