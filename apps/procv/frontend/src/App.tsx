import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./stores/authStore";
import { ThemeProvider } from "./components/ThemeProvider";
import React, { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { fetchCSRFToken } from "./services/api";
import { GlobalPreferencesBootstrap } from "./components/GlobalPreferencesBootstrap";
import { ConsentBanner, ProFooter } from "@prosolutions/ui";

const PROSOLUTIONS_URL =
  import.meta.env.VITE_PROSOLUTIONS_URL ||
  "https://prosolutions.page";

const WorkspacePage = lazy(() => import("./pages/UnifiedWorkspacePage").then((m) => ({ default: m.UnifiedWorkspacePage })));
const CVEditorPage = lazy(() => import("./pages/CVEditorPage").then((m) => ({ default: m.CVEditorPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));


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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
      {t("common.loading")}
    </div>
  );
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.href = `${PROSOLUTIONS_URL}/login?redirect_uri=${redirectUri}`;
    return null;
  }
  return children;
}

/** Shared ecosystem footer on every page except the full-screen editor. */
function SiteFooter() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/editor")) return <ConsentBanner />;
  return (
    <>
      <ProFooter />
      <ConsentBanner />
    </>
  );
}

export default function App() {
  useSessionTimeout();
  useEffect(() => { fetchCSRFToken(); }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalPreferencesBootstrap />
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
              <Route path="/editor-free" element={<Navigate to="/editor" replace />} />
              <Route path="/editor/:cvId" element={<CVEditorPage />} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/settings" element={<RedirectToProsolutions path="/settings" />} />
              <Route path="/admin" element={<RedirectToProsolutions path="/admin" />} />
              <Route path="/admin/settings" element={<RedirectToProsolutions path="/admin?section=platform" />} />
              <Route path="/admin/landing" element={<RedirectToProsolutions path="/admin?section=landing" />} />
              <Route path="/admin/audit-logs" element={<RedirectToProsolutions path="/admin?section=audit" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
          <SiteFooter />
        </ErrorBoundary>
      </AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: { background: "var(--toast-bg, #363636)", color: "#fff" },
          success: { duration: 3000, style: { background: "#059669" } },
          error: { duration: 5000, style: { background: "#dc2626" } },
        }}
      />
    </ThemeProvider>
  );
}
