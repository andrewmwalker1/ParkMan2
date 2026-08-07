// Field Journal design tokens -- same as Hub and Maintenance, reproduced
// exactly for visual consistency across the Tree Tops app family. Don't
// hardcode these hex values anywhere else.

export const colors = {
  bg: "#E7E2CC",
  paper: "#FBF9F1",
  ink: "#31382D",
  inkSoft: "#78806E",
  moss: "#5C7A4E",
  mossDark: "#3F5837",
  clay: "#A65A34",
  gold: "#C9962F",
  immediate: "#8C3A22",
  line: "#DDD6BC",
  lineStrong: "#CBC2A0",
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
    background: colors.moss,
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
    color: colors.mossDark,
    border: `1px solid ${colors.lineStrong}`,
    borderRadius: "999px",
    padding: "10px 20px",
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: "pointer",
  },
};
