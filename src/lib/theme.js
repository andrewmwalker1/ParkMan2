// "Harbour" design tokens -- ParkMan2's own palette, chosen 9 Aug 2026
// to move away from the Field Journal green shared with Hub/Maintenance
// (Andy: didn't like the colourway) without copying CampManager's blue.
// Deep teal-navy for structure (sidebar/topbar/headings), brass for
// interactive accents, kept deliberately distinct from both. Don't
// hardcode these hex values anywhere else.

export const colors = {
  bg: "#F1F0EA",
  paper: "#FFFFFF",
  ink: "#1D2A2C",
  inkSoft: "#5E7175",
  brand: "#AC8330",
  brandDark: "#17323A",
  success: "#4B7A4F",
  immediate: "#8C3A22",
  line: "#DDE3DF",
  lineStrong: "#C7D0CC",
};

// Sidebar/topbar chrome -- always dark regardless of page theme, so it
// reads as a fixed instrument panel rather than page content.
export const chrome = {
  sidebarBg: "#17323A",
  sidebarActiveBg: "#1F424C",
  sidebarInk: "#C4DBDF",
  sidebarInkDim: "#7FA1A8",
  topbarBg: "#102329",
  wordmarkInk: "#E9F2F1",
};

export const fonts = {
  display: "'Lora', serif",
  body: "'Work Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const pageStyle = {
  minHeight: "100vh",
  background: colors.bg,
  color: colors.ink,
  fontFamily: fonts.body,
};

export const cardStyle = {
  background: colors.paper,
  border: `1px solid ${colors.line}`,
  borderRadius: "16px",
};

export const buttonStyle = {
  primary: {
    background: colors.brand,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "999px",
    padding: "10px 20px",
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondary: {
    background: "transparent",
    color: colors.brandDark,
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: "999px",
    padding: "10px 20px",
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: "pointer",
  },
};
