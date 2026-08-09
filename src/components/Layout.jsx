import { colors } from "../lib/theme.js";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function Layout({ children }) {
  return (
    <div className="pm2-shell">
      <Sidebar />
      <div className="pm2-main">
        <Topbar />
        <div style={{ flex: 1, background: colors.bg }}>{children}</div>
      </div>
    </div>
  );
}
