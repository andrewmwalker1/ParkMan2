import { colors } from "../lib/theme.js";

// Small "build from names" action button that sits beside the
// correspondence/address salutation fields on the Customer screens.
export default function LightningButton({ onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "38px",
        flexShrink: 0,
        height: "38px",
        marginBottom: "10px",
        border: `1px solid ${colors.lineStrong}`,
        borderRadius: "8px",
        background: disabled ? colors.bg : "#FFFFFF",
        color: disabled ? colors.inkSoft : colors.brand,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 2 3 14h6.5l-1.5 8L21 10h-6.5L13 2z" />
      </svg>
    </button>
  );
}
