import { useEffect, useMemo, useState } from "react";
import { colors, fonts, buttonStyle } from "../lib/theme.js";
import { loadOperationalRows, sortOperationalRows } from "../lib/operationalRows.js";
import { exportRowsToCsv } from "../lib/exportCsv.js";
import OperationalTable from "../components/OperationalTable.jsx";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 250, 500];

const pagerButtonStyle = (active, disabled) => ({
  ...buttonStyle.secondary,
  padding: "6px 12px",
  fontSize: "13px",
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? "default" : "pointer",
  ...(active ? { background: colors.brand, borderColor: colors.brand, color: "#fff" } : {}),
});

export default function ParkList() {
  const [allRows, setAllRows] = useState(null);
  const [pageSize, setPageSize] = useState(250);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadOperationalRows().then(setAllRows);
  }, []);

  const sortedRows = useMemo(() => {
    if (!allRows) return [];
    return sortKey ? sortOperationalRows(allRows, sortKey, sortDir) : allRows;
  }, [allRows, sortKey, sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedRows.length / pageSize)), [sortedRows, pageSize]);
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  function goTo(p) {
    setPage(Math.min(Math.max(p, 1), totalPages));
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
    setPage(1);
  }

  function toggleRow(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Selects/clears every row on the current page -- not every row
  // across all pages, so it stays predictable as page size changes.
  function toggleAll() {
    setSelected((prev) => (pageRows.every((r) => prev.has(r.key)) ? new Set() : new Set([...prev, ...pageRows.map((r) => r.key)])));
  }

  async function handleExport() {
    setExporting(true);
    const selectedRows = sortedRows.filter((r) => selected.has(r.key));
    await exportRowsToCsv(selectedRows, "parkman2-park-list.csv");
    setExporting(false);
  }

  // Small park, small page counts today, but window the buttons rather
  // than always rendering every page number so this holds up as the
  // park (and the list) grows.
  const pageButtons = [];
  const windowStart = Math.max(1, currentPage - 2);
  const windowEnd = Math.min(totalPages, windowStart + 4);
  for (let p = windowStart; p <= windowEnd; p++) pageButtons.push(p);

  if (!allRows) {
    return (
      <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
        <p style={{ color: colors.inkSoft }}>Loading…</p>
      </div>
    );
  }

  const from = sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, sortedRows.length);

  return (
    <div style={{ padding: "24px", maxWidth: "980px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "0 0 4px" }}>Park list</h1>
      <p style={{ color: colors.inkSoft, margin: "0 0 20px" }}>Every pitch, with its current customer and caravan.</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft }}>
          Show
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${colors.lineStrong}`, fontFamily: fonts.body }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          rows
        </label>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button onClick={() => goTo(1)} disabled={currentPage === 1} style={pagerButtonStyle(false, currentPage === 1)}>First</button>
          <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} style={pagerButtonStyle(false, currentPage === 1)}>Prev</button>
          {pageButtons.map((p) => (
            <button key={p} onClick={() => goTo(p)} style={pagerButtonStyle(p === currentPage, false)}>{p}</button>
          ))}
          <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages} style={pagerButtonStyle(false, currentPage === totalPages)}>Next</button>
          <button onClick={() => goTo(totalPages)} disabled={currentPage === totalPages} style={pagerButtonStyle(false, currentPage === totalPages)}>Last</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <button onClick={handleExport} disabled={exporting} style={buttonStyle.secondary}>
            {exporting ? "Exporting…" : `Export ${selected.size} selected to CSV`}
          </button>
        </div>
      )}

      <OperationalTable
        rows={pageRows}
        originPath="/park-list"
        originLabel="Park list"
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        selected={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
      />

      <p style={{ color: colors.inkSoft, fontSize: "12.5px", textAlign: "center", marginTop: "14px" }}>
        Showing {from} to {to} of {sortedRows.length}
      </p>
    </div>
  );
}
