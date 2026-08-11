import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

// __APP_VERSION__/__GIT_SHA__/__BUILD_TIME__ are injected by vite.config.js
// at build time -- unlike a manually maintained "last bumped" string, this
// can't go stale, and the SHA lets Andy check a live-site footer against
// `git log` directly to confirm a specific push actually deployed.
const BUILD_DATE = new Date(__BUILD_TIME__).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Andy (9 Aug 2026): dashboard starts with pitch occupancy and caravans
// for sale, and "there will be more when we move onto billing and bring
// maintenance into the system" -- laid out as a grid of tiles so more
// can drop in alongside these without a redesign.
//
// Occupancy is three-way, not a simple yes/no -- refined same day after
// Andy clarified "Unoccupied" specifically means a caravan is sited but
// nobody's recorded as owning it (not just "no caravan at all"):
//   Occupied   = pitch has a caravan AND that caravan has an owner
//   Unoccupied = pitch has a caravan but NO owner recorded
//   Empty      = pitch has no caravan sited (so no owner either)
// Andy (9 Aug 2026): "I'd like to click on the stats tiles and get to
// the search list showing the appropriate info" -- each tile links to
// SearchResults.jsx's matching ?filter=, which uses this exact same
// occupied/unoccupied/empty/for-sale test so the number on the tile
// and the list behind it can never disagree.
function StatTile({ value, label, sub, to }) {
  return (
    <Link to={to} style={{ ...cardStyle, padding: "18px 20px", textDecoration: "none", display: "block" }}>
      <div style={{ fontFamily: fonts.display, fontSize: "30px", fontWeight: 700, color: colors.brandDark, lineHeight: 1 }}>
        {value === null ? "—" : value}
      </div>
      <div style={{ fontSize: "12.5px", color: colors.ink, marginTop: "6px" }}>{label}</div>
      {sub && <div style={{ fontSize: "11px", color: colors.inkSoft, opacity: 0.75, marginTop: "1px" }}>{sub}</div>}
    </Link>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("pitch").select("id", { count: "exact", head: true }),
      supabase.from("placement").select("pitch_id, caravan_id").is("end_date", null),
      supabase.from("ownership").select("caravan_id").is("end_date", null),
      supabase.from("caravan").select("id", { count: "exact", head: true }).eq("for_sale", true),
    ]).then(([pitches, placements, ownerships, forSale]) => {
      const totalPitches = pitches.count ?? 0;
      const placementRows = placements.data || [];
      const ownedCaravanIds = new Set((ownerships.data || []).map((o) => o.caravan_id));

      const withCaravan = placementRows.length;
      const occupied = placementRows.filter((pl) => ownedCaravanIds.has(pl.caravan_id)).length;

      setStats({
        occupied,
        unoccupied: withCaravan - occupied,
        empty: Math.max(totalPitches - withCaravan, 0),
        forSale: forSale.count ?? 0,
      });
    });
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "0 0 20px" }}>
        Welcome back, {profile?.display_name}.
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <StatTile value={stats?.occupied ?? null} label="Occupied pitches" sub="caravan & customer" to="/search?filter=occupied" />
        <StatTile value={stats?.unoccupied ?? null} label="Unoccupied pitches" sub="caravan, no customer" to="/search?filter=unoccupied" />
        <StatTile value={stats?.empty ?? null} label="Empty pitches" sub="no caravan sited" to="/search?filter=empty" />
        <StatTile value={stats?.forSale ?? null} label="Caravans for sale" to="/search?filter=forsale" />
      </div>

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
        ParkMan2 v{__APP_VERSION__} · built {BUILD_DATE} · {__GIT_SHA__}
      </p>
    </div>
  );
}
