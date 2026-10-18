import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { ProHeader } from "@prosolutions/ui";
import { useAuthStore } from "../stores/authStore";

interface AppHeaderProps { cvId?: string; leftExtra?: ReactNode; rightExtra?: ReactNode; showUserInfo?: boolean; }

/** Global ecosystem navigation plus ProCV-specific account actions. */
export function AppHeader({ leftExtra, rightExtra, showUserInfo = true }: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const accountLabel = user?.name || user?.email || t("common.user", "User");
  const actions = (
    <>
      {leftExtra}
      <Link to="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><LayoutDashboard className="h-4 w-4" aria-hidden="true" /><span>{t("navigation.dashboardShort", "Dashboard")}</span></Link>
      {user?.role === "admin" ? <Link to="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><ShieldCheck className="h-4 w-4" aria-hidden="true" /><span>{t("navigation.adminShort", "Admin")}</span></Link> : null}
      {rightExtra}
      {showUserInfo && user ? (
        <details className="group relative">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"><UserRound className="h-4 w-4" aria-hidden="true" /><span className="max-w-32 truncate">{accountLabel}</span></summary>
          <div className="absolute right-0 z-50 mt-2 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"><UserRound className="h-4 w-4" aria-hidden="true" />{t("navigation.profile", "Profile")}</Link>
            <Link to="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"><Settings className="h-4 w-4" aria-hidden="true" />{t("navigation.settings", "Settings")}</Link>
            <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"><LogOut className="h-4 w-4" aria-hidden="true" />{t("navigation.logout", "Log out")}</button>
          </div>
        </details>
      ) : null}
    </>
  );
  return <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} actions={actions} />;
}
