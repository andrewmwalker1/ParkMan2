import { NavLink } from "react-router-dom";
import { chrome, fonts } from "../lib/theme.js";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/pitches", label: "Pitches" },
  { to: "/customers", label: "Customers" },
  { to: "/caravans", label: "Caravans" },
  { to: "/admin", label: "Admin" },
];

export default function Sidebar() {
  return (
    <div style={{ background: chrome.sidebarBg, padding: "12px 14px" }}>
      <div className="pm2-sidebar-nav">
        <div
          className="pm2-wordmark"
          style={{
            fontFamily: fonts.display,
            fontSize: "18px",
            fontWeight: 600,
            color: chrome.wordmarkInk,
          }}
        >
          ParkMan2
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              padding: "9px 12px",
              borderRadius: "7px",
              fontFamily: fonts.body,
              fontSize: "13.5px",
              fontWeight: isActive ? 700 : 500,
              textDecoration: "none",
              color: isActive ? chrome.wordmarkInk : chrome.sidebarInkDim,
              background: isActive ? chrome.sidebarActiveBg : "transparent",
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
