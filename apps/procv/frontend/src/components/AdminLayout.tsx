import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../stores/authStore";
import { BrandLogo } from "./BrandLogo";
import { LanguageSelector } from "./ui/LanguageSelector";
import { useTheme } from '@prosolutions/ui';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = useMemo(
    () => [
      { to: "/admin", label: t("admin.dashboardShort"), title: t("admin.dashboard") },
      { to: "/admin/users", label: t("admin.usersShort"), title: t("admin.users") },
      { to: "/admin/settings", label: t("admin.settingsShort"), title: t("admin.settings") },
      {
        to: "/admin/audit-logs",
        label: t("admin.auditLogsShort"),
        title: t("admin.auditLogs"),
      },
      {
        to: "/admin/landing",
        label: t("admin.landingPageShort"),
        title: t("admin.landingPage"),
      },
    ],
    [t]
  );

  const isActive = (path: string) =>
    path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <BrandLogo variant="small" />
              <div className="hidden lg:block min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.dashboard')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{user?.email}</p>
              </div>

              <nav className="hidden md:flex items-center gap-2 ml-2 min-w-0 overflow-x-auto no-scrollbar pr-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={isActive(item.to) ? "page" : undefined}
                    title={item.title}
                    className={`inline-flex min-h-10 shrink-0 whitespace-nowrap items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                      isActive(item.to)
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden lg:block">
                <LanguageSelector />
              </div>

              <button
                onClick={toggle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                title={theme === 'dark' ? t('theme.light', 'Light Mode') : t('theme.dark', 'Dark Mode')}
              >
                {theme === 'dark' ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              >
                {t('admin.logout')}
              </button>

              <button
                onClick={() => setShowMobileMenu((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                title={t('navigation.menu', 'Menu')}
                aria-expanded={showMobileMenu}
                aria-controls="admin-header-mobile-menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>

          {showMobileMenu && (
            <div id="admin-header-mobile-menu" ref={mobileMenuRef} className="md:hidden border-t border-slate-200 dark:border-slate-700 pb-4 pt-3">
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={`mobile-${item.to}`}
                    to={item.to}
                    aria-current={isActive(item.to) ? "page" : undefined}
                    onClick={() => setShowMobileMenu(false)}
                    className={`inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2">
                  <LanguageSelector />
                </div>

                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t('admin.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}