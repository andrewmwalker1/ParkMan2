import { Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { colors, pageStyle } from "./lib/theme.js";

function AppShell() {
  const { session, loading, deactivated } = useAuth();

  if (loading) {
    return (
      <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: colors.inkSoft }}>Loading…</p>
      </div>
    );
  }

  if (deactivated) {
    return (
      <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <p style={{ color: colors.immediate, textAlign: "center", maxWidth: "360px" }}>
          Your account has been deactivated. Contact your admin if you think this is a mistake.
        </p>
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div style={pageStyle}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
