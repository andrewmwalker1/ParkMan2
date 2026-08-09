import { Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ParkList from "./pages/ParkList.jsx";
import Admin from "./pages/Admin.jsx";
import Pitches from "./pages/Pitches.jsx";
import Customers from "./pages/Customers.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import Caravans from "./pages/Caravans.jsx";
import CaravanDetail from "./pages/CaravanDetail.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import UnitDetail from "./pages/UnitDetail.jsx";
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
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/park-list" element={<ParkList />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/pitches" element={<Pitches />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/caravans" element={<Caravans />} />
          <Route path="/caravans/:id" element={<CaravanDetail />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/units/:pitchId" element={<UnitDetail />} />
        </Routes>
      </Layout>
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
