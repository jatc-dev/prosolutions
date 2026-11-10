import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { EmailVerificationPage } from "./pages/EmailVerificationPage";
import { PortalPage } from "./pages/PortalPage";
import { AdminAccessPage } from "./pages/AdminAccessPage";
import { LandingPage } from "./pages/LandingPage";
import { SecuritySessionsPage } from "./pages/SecuritySessionsPage";
import { PreferencesPage } from "./pages/PreferencesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<HomePage />} />
        <Route path="/auth/callback" element={<HomePage />} />
        <Route path="/dashboard" element={<PortalPage />} />
        <Route path="/security/sessions" element={<SecuritySessionsPage />} />
        <Route path="/settings" element={<PreferencesPage />} />
        <Route path="/modules" element={<PortalPage />} />
        <Route path="/admin/access" element={<AdminAccessPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
