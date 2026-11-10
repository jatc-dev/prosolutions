import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { ProHeader } from "@prosolutions/ui";
import { useAuthStore } from "../stores/authStore";

const PROSOLUTIONS_URL = import.meta.env.VITE_PROSOLUTIONS_URL || "https://prosolutions.page";

interface AppHeaderProps { cvId?: string; leftExtra?: ReactNode; rightExtra?: ReactNode; showUserInfo?: boolean; }

/** Global ecosystem navigation plus ProCV-specific account actions. */
export function AppHeader({ leftExtra, rightExtra, showUserInfo = true }: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const actions = (
    <>
      {leftExtra}
      <Link to="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><LayoutDashboard className="h-4 w-4" aria-hidden="true" /><span>{t("navigation.dashboardShort", "Dashboard")}</span></Link>
      {user?.role === "admin" ? <Link to="/admin" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"><ShieldCheck className="h-4 w-4" aria-hidden="true" /><span>{t("navigation.adminShort", "Admin")}</span></Link> : null}
      {rightExtra}
    </>
  );
  return <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} actions={actions} profile={showUserInfo && user ? { name: user.name, email: user.email } : null} onSignOut={showUserInfo && user ? logout : undefined} profileHref="/profile" settingsHref={`${PROSOLUTIONS_URL}/settings`} securityHref={`${PROSOLUTIONS_URL}/security/sessions`} />;
}
