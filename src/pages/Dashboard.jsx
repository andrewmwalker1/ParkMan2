import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

// Bump both on every deployed change, same convention as Hub/Maintenance --
// gives Andy a quick way to confirm a push actually landed on the live site.
const APP_VERSION = "0.3.0";
const BUILD_DATE = "9 Aug 2026";

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div style={{ padding: "24px", maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "0 0 20px" }}>
        Welcome back, {profile?.display_name}.
      </h1>

      <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "20px" }}>
        <p style={{ color: colors.ink, margin: 0 }}>
          Use the search bar above to jump straight to a customer, caravan, or pitch — or browse from the sections below.
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <Link to="/pitches" style={{ ...buttonStyle.primary, textDecoration: "none", display: "inline-block" }}>Pitches</Link>
        <Link to="/customers" style={{ ...buttonStyle.primary, textDecoration: "none", display: "inline-block" }}>Customers</Link>
        <Link to="/caravans" style={{ ...buttonStyle.primary, textDecoration: "none", display: "inline-block" }}>Caravans</Link>
      </div>

      <p style={{ textAlign: "center", fontSize: "10.5px", color: colors.inkSoft, opacity: 0.6, marginTop: "22px" }}>
        ParkMan2 v{APP_VERSION} · built {BUILD_DATE}
      </p>
    </div>
  );
}
