import { useAuth } from "../lib/AuthContext.jsx";
import { chrome, fonts } from "../lib/theme.js";
import GlobalSearch from "./GlobalSearch.jsx";

export default function Topbar() {
  const { profile, business, signOut } = useAuth();

  return (
    <div
      className="pm2-topbar"
      style={{
        background: chrome.topbarBg,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <GlobalSearch />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ textAlign: "right", fontSize: "12.5px", lineHeight: 1.3, fontFamily: fonts.body }}>
          <div style={{ fontWeight: 600, color: chrome.wordmarkInk }}>{profile?.display_name}</div>
          <div style={{ color: chrome.sidebarInkDim }}>{business?.name}</div>
        </div>
        <button
          onClick={signOut}
          style={{
            background: "transparent",
            border: `1px solid ${chrome.sidebarInkDim}`,
            color: chrome.sidebarInk,
            borderRadius: "999px",
            padding: "6px 14px",
            fontFamily: fonts.body,
            fontSize: "12.5px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
