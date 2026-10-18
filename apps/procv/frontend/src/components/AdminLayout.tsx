import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut, PanelsTopLeft, ScrollText, Settings, Users } from "lucide-react";
import { ProHeader } from "@prosolutions/ui";
import { useAuthStore } from "../stores/authStore";

interface AdminLayoutProps { children: React.ReactNode; }

/** The global header owns branding; admin navigation stays in a compact local subnav. */
export function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const navItems = [
    { to: "/admin", label: t("admin.dashboardShort"), title: t("admin.dashboard"), icon: LayoutDashboard },
    { to: "/admin/users", label: t("admin.usersShort"), title: t("admin.users"), icon: Users },
    { to: "/admin/settings", label: t("admin.settingsShort"), title: t("admin.settings"), icon: Settings },
    { to: "/admin/audit-logs", label: t("admin.auditLogsShort"), title: t("admin.auditLogs"), icon: ScrollText },
    { to: "/admin/landing", label: t("admin.landingPageShort"), title: t("admin.landingPage"), icon: PanelsTopLeft },
  ];
  const isActive = (path: string) => path === "/admin" ? location.pathname === path : location.pathname.startsWith(path);
  const actions = (
    <>
      <span className="hidden max-w-48 truncate px-2 text-xs text-slate-500 xl:inline" title={user?.email || ""}>{user?.email}</span>
      <button type="button" onClick={() => { logout(); navigate("/"); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><LogOut className="h-4 w-4" aria-hidden="true" /><span>{t("admin.logout")}</span></button>
    </>
  );
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} actions={actions} />
      <nav aria-label={language === "es" ? "Navegación de administración" : "Admin navigation"} className="border-b border-slate-200 bg-white/90 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} title={item.title} aria-current={isActive(item.to) ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isActive(item.to) ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
