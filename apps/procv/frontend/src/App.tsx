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
const AuthCallback = lazy(() => import("./pages/AuthCallback").then((m) => ({ default: m.AuthCallback })));
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

function RedirectToProsolutions({ path }: { path: string }) {
  useEffect(() => {
    const target = new URL(path, PROSOLUTIONS_URL);
    const incoming = new URLSearchParams(window.location.search);

    // Legacy ProCV routes remain as compatibility aliases, but login,
    // registration, verification and recovery all belong to ProIdentity.
    incoming.forEach((value, key) => target.searchParams.set(key, value));
    if (path === "/login" && !target.searchParams.has("redirect_uri")) {
      target.searchParams.set(
        "redirect_uri",
        `${window.location.origin}/auth/callback`,
      );
    }
    target.hash = window.location.hash;
    window.location.replace(target.toString());
  }, [path]);
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

function ModuleAccessRequired() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 3.86 1.82 18.1A2 2 0 003.54 21h16.92a2 2 0 001.72-2.9L13.7 3.86a2 2 0 00-3.4 0z" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Acceso a ProCV no habilitado</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          La cuenta {user?.email ? <strong>{user.email}</strong> : "actual"} está autenticada en ProSolutions, pero Identity no ha concedido el permiso de módulo <code>PROCV</code>.
          No necesitas crear otra cuenta ni restablecer tu contraseña.
        </p>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Abre el portal central para consultar tus módulos o pide a un administrador que revise tu permiso.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={PROSOLUTIONS_URL + "/dashboard"} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Ir al portal ProSolutions
          </a>
          <a href="mailto:soporte@prosolutions.page" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
            Contactar soporte
          </a>
        </div>
      </section>
    </main>
  );
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <RouteFallback />;

  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.replace(`${PROSOLUTIONS_URL}/login?redirect_uri=${redirectUri}`);
    return null;
  }

  if (!user?.modules?.includes("PROCV")) return <ModuleAccessRequired />;
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <RouteFallback />;

  if (!isAuthenticated) {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location.replace(`${PROSOLUTIONS_URL}/login?redirect_uri=${redirectUri}`);
    return null;
  }

  if (!user?.modules?.includes("PROCV")) return <ModuleAccessRequired />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
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
            <Route path="/login" element={<RedirectToProsolutions path="/login" />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<RedirectToProsolutions path="/register" />} />
            <Route path="/forgot-password" element={<RedirectToProsolutions path="/forgot-password" />} />
            <Route path="/reset-password" element={<RedirectToProsolutions path="/reset-password" />} />
            <Route path="/verify-email" element={<RedirectToProsolutions path="/verify-email" />} />
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
