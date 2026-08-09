import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BusinessTab from "./admin/BusinessTab.jsx";
import ParksTab from "./admin/ParksTab.jsx";
import SeasonsTab from "./admin/SeasonsTab.jsx";
import AreasTab from "./admin/AreasTab.jsx";
import PitchBandsTab from "./admin/PitchBandsTab.jsx";
import SimpleLookupTab from "./admin/SimpleLookupTab.jsx";
import { colors, fonts } from "../lib/theme.js";

// Every tab here is reachable by anyone signed in for now -- Phase 1
// deliberately keeps permissions simple (see PROJECT-BRIEF.md). The
// `permission` key on each tab is unused today but already in place so
// gating individual tabs later (once section-level permissions are
// built, per the multi-park access control roadmap item) is a filter
// added here, not a restructure.
const ALL_TABS = [
  { key: "business", label: "Business", Component: BusinessTab, permission: "can_manage_business" },
  { key: "parks", label: "Parks", Component: ParksTab, permission: "can_manage_parks" },
  { key: "seasons", label: "Seasons", Component: SeasonsTab, permission: "can_manage_parks" },
  { key: "areas", label: "Areas", Component: AreasTab, permission: "can_manage_parks" },
  { key: "pitchBands", label: "Pitch Bands", Component: PitchBandsTab, permission: "can_manage_parks" },
  { key: "pitchTypes", label: "Pitch Types", Component: () => <SimpleLookupTab table="pitch_type" singularLabel="Pitch type" pluralLabel="Pitch types" />, permission: "can_manage_parks" },
  { key: "pitchStatuses", label: "Pitch Statuses", Component: () => <SimpleLookupTab table="pitch_status" singularLabel="Pitch status" pluralLabel="Pitch statuses" />, permission: "can_manage_parks" },
  { key: "caravanTypes", label: "Caravan Types", Component: () => <SimpleLookupTab table="caravan_type" singularLabel="Caravan type" pluralLabel="Caravan types" extraField={{ key: "default_licence_term_years", label: "Default licence term (years)", type: "number" }} />, permission: "can_manage_caravans" },
  { key: "caravanStatuses", label: "Caravan Statuses", Component: () => <SimpleLookupTab table="caravan_status" singularLabel="Caravan status" pluralLabel="Caravan statuses" />, permission: "can_manage_caravans" },
  { key: "caravanConditions", label: "Caravan Conditions", Component: () => <SimpleLookupTab table="caravan_condition" singularLabel="Caravan condition" pluralLabel="Caravan conditions" />, permission: "can_manage_caravans" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState(ALL_TABS[0].key);

  useEffect(() => {
    document.title = "Admin — ParkMan2";
  }, []);

  const ActiveComponent = ALL_TABS.find((t) => t.key === activeTab)?.Component;

  return (
    <div style={{ padding: "24px", maxWidth: "760px", margin: "0 auto" }}>
      <Link to="/" style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back</Link>
      <h1 style={{ fontFamily: fonts.display, color: colors.mossDark, margin: "8px 0 0" }}>Admin</h1>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {ALL_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              border: `1px solid ${activeTab === t.key ? colors.mossDark : colors.lineStrong}`,
              background: activeTab === t.key ? colors.mossDark : "transparent",
              color: activeTab === t.key ? "#FFFFFF" : colors.inkSoft,
              borderRadius: "999px",
              padding: "8px 16px",
              fontFamily: fonts.body,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
