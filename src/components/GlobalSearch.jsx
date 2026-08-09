import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fonts, chrome } from "../lib/theme.js";

// Andy (9 Aug 2026): changed from a live as-you-type dropdown to
// CampManager's pattern -- type a term, submit, land on a dedicated
// results screen (src/pages/SearchResults.jsx) grouped by type with
// counts, rather than picking straight off a preview list.
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        flex: 1,
        maxWidth: "460px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        borderRadius: "8px",
        background: "#1C3841",
      }}
    >
      <button
        type="submit"
        aria-label="Search"
        style={{ display: "flex", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={chrome.sidebarInk} strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </button>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
    </form>
  );
}
