import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./stores/authStore";
import { ThemeProvider } from "./components/ThemeProvider";
import React, { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { fetchCSRFToken } from "./services/api";

const IDENTITY_URL =
  import.meta.env.VITE_IDENTITY_URL ||
  "https://prosolutions.page/login";

const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })));
const CVEditorPage = lazy(() => import("./pages/CVEditorPage").then((m) => ({ default: m.CVEditorPage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const AuthCallback = lazy(() => import("./pages/AuthCallback").then((m) => ({ default: m.AuthCallback })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage").then((m) => ({ default: m.EmailVerificationPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

const AdminLayout = lazy(() => import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const UserManagement = lazy(() => import("./pages/admin/UserManagement").then((m) => ({ default: m.UserManagement })));
const PlatformSettings = lazy(() => import("./pages/admin/PlatformSettings").then((m) => ({ default: m.PlatformSettings })));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const LandingPageManagement = lazy(() =>
  import("./pages/admin/LandingPageManagement").then((m) => ({ default: m.LandingPageManagement }))
);
const ProCVHomePage = lazy(() => import("./modules/procv/pages/ProCVHomePage").then((m) => ({ default: m.ProCVHomePage })));
const JobsPage = lazy(() => import("./modules/projobs/pages/JobsPage").then((m) => ({ default: m.JobsPage })));

function RouteFallback() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600 dark:bg-slate-950 dark:text-slate-300">
      {t("common.loading")}
    </div>
  );
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  // While session is being validated, don't redirect yet
  if (loading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${IDENTITY_URL}?redirect_uri=${redirectUri}`;
    return null;
  }

  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${IDENTITY_URL}?redirect_uri=${redirectUri}`;
    return null;
  }
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  useSessionTimeout();

  useEffect(() => {
    fetchCSRFToken();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
            <Route path="/editor" element={<CVEditorPage />} />
            <Route path="/editor/:cvId" element={<CVEditorPage />} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminLayout><UserManagement /></AdminLayout></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminLayout><PlatformSettings /></AdminLayout></AdminRoute>} />
            <Route path="/admin/landing" element={<AdminRoute><AdminLayout><LandingPageManagement /></AdminLayout></AdminRoute>} />
            <Route path="/admin/audit-logs" element={<AdminRoute><AdminLayout><AuditLogs /></AdminLayout></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
           </Routes>
        </Suspense>
        </ErrorBoundary>
      </AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--toast-bg, #363636)",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "#059669",
            },
          },
          error: {
            duration: 5000,
            style: {
              background: "#dc2626",
            },
          },
        }}
      />
    </ThemeProvider>
  );
}


