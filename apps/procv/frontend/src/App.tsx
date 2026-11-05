import { Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./stores/authStore";
import { ThemeProvider } from "./components/ThemeProvider";
import React, { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { fetchCSRFToken } from "./services/api";

const PROSOLUTIONS_URL =
  import.meta.env.VITE_PROSOLUTIONS_URL ||
  "https://prosolutions.page";

const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })));
const CVEditorPage = lazy(() => import("./pages/CVEditorPage").then((m) => ({ default: m.CVEditorPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

const AdminLayout = lazy(() => import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const PlatformSettings = lazy(() => import("./pages/admin/PlatformSettings").then((m) => ({ default: m.PlatformSettings })));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const LandingPageManagement = lazy(() =>
  import("./pages/admin/LandingPageManagement").then((m) => ({ default: m.LandingPageManagement }))
);
const TemplatesGallery = lazy(() =>
  import("./modules/landing/pages/TemplatesGallery").then((m) => ({ default: m.TemplatesGallery }))
);

function RedirectToProsolutions({ path }: { path: string }) {
  useEffect(() => {
    window.location.href = `${PROSOLUTIONS_URL}${path}${window.location.search}${window.location.hash}`;
  }, [path]);
  return null;
}

function RedirectToCentralLogin() {
  useEffect(() => {
    window.location.replace(`${PROSOLUTIONS_URL}/login`);
  }, []);
  return null;
}

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

  if (loading) {
    return <RouteFallback />;
  }

  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${PROSOLUTIONS_URL}/login?redirect_uri=${redirectUri}`;
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
    window.location.href = `${PROSOLUTIONS_URL}/login?redirect_uri=${redirectUri}`;
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
            <Route path="/login" element={<RedirectToCentralLogin />} />
            <Route path="/auth/callback" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<RedirectToCentralLogin />} />
            <Route path="/register" element={<RedirectToProsolutions path="/register" />} />
            <Route path="/forgot-password" element={<RedirectToProsolutions path="/forgot-password" />} />
            <Route path="/reset-password" element={<RedirectToProsolutions path="/reset-password" />} />
            <Route path="/verify-email" element={<RedirectToProsolutions path="/verify-email" />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/templates" element={<TemplatesGallery />} />
            <Route path="/dashboard" element={<PrivateRoute><WorkspacePage /></PrivateRoute>} />
            <Route path="/editor" element={<CVEditorPage />} />
            {/* Backward-compatible URL used by the public "try for free" CTA. */}
            <Route path="/editor-free" element={<Navigate to="/editor" replace />} />
            <Route path="/editor/:cvId" element={<CVEditorPage />} />
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
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
