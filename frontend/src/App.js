import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";

import LandingPage from "@/pages/LandingPage";
import TempleExplorer from "@/pages/TempleExplorer";
import TempleDetail from "@/pages/TempleDetail";
import PackageExplorer from "@/pages/PackageExplorer";
import PackageDetail from "@/pages/PackageDetail";
import AIPlanner from "@/pages/AIPlanner";
import TripBuilder from "@/pages/TripBuilder";
import TransportCompare from "@/pages/TransportCompare";
import TrekkingExplorer from "@/pages/TrekkingExplorer";
import FestivalCalendar from "@/pages/FestivalCalendar";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import UserDashboard from "@/pages/UserDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

import "@/App.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/temples" element={<TempleExplorer />} />
              <Route path="/temples/:slug" element={<TempleDetail />} />
              <Route path="/packages" element={<PackageExplorer />} />
              <Route path="/packages/:slug" element={<PackageDetail />} />
              <Route path="/ai-planner" element={<AIPlanner />} />
              <Route path="/trip-builder" element={<TripBuilder />} />
              <Route path="/transport" element={<TransportCompare />} />
              <Route path="/trekking" element={<TrekkingExplorer />} />
              <Route path="/festivals" element={<FestivalCalendar />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />

              <Route path="/dashboard/*" element={<ProtectedRoute roles={["user", "employee", "admin", "superadmin"]}><UserDashboard /></ProtectedRoute>} />
              <Route path="/employee" element={<ProtectedRoute roles={["employee", "admin", "superadmin"]}><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute roles={["admin", "superadmin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/sanctum-portal-7821" element={<ProtectedRoute roles={["superadmin"]}><SuperAdminDashboard /></ProtectedRoute>} />
            </Routes>
          </Layout>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
