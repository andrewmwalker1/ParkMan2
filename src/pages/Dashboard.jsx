import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

export default function Dashboard() {
  const { profile, business, signOut } = useAuth();

  return (
    <div style={{ padding: "24px", maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: fonts.display, color: colors.mossDark, margin: "0 0 4px" }}>ParkMan2</h1>
          <p style={{ color: colors.inkSoft, margin: 0 }}>{business?.name}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link to="/admin" style={{ ...buttonStyle.secondary, textDecoration: "none", display: "inline-block" }}>Admin</Link>
          <button onClick={signOut} style={buttonStyle.secondary}>Sign out</button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "20px 24px" }}>
        <p style={{ color: colors.ink, margin: 0 }}>Signed in as {profile?.display_name}.</p>
        <p style={{ color: colors.inkSoft, fontSize: "14px" }}>
          Customers, Caravans, and Pitches screens land here as Phase 1 continues.
        </p>
      </div>
    </div>
  );
}
