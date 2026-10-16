import { ReactNode, useMemo, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { LanguageSelector } from "./ui/LanguageSelector";
import { useAuthStore } from "../stores/authStore";
import { useTheme } from '@prosolutions/ui';

interface AppHeaderProps {
  cvId?: string;
  leftExtra?: ReactNode;
  rightExtra?: ReactNode;
  showUserInfo?: boolean;
}

export function AppHeader({
  cvId,
  leftExtra,
  rightExtra,
  showUserInfo = true
}: AppHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme, toggle } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  const navItems = useMemo(() => {
    const items = [
      {
        to: "/dashboard",
        label: t("navigation.dashboardShort", "Dashboard"),
        title: t("navigation.dashboardLong", "Main Dashboard"),
      },
    ];

    if (user?.role === "admin") {
      items.push({
        to: "/admin",
        label: t("navigation.adminShort", "Admin"),
        title: t("navigation.adminLong", "Administration"),
      });
    }

    return items;
  }, [t, user?.role]);

  const userMenuItems = useMemo(() => {
    const items = [
      { to: "/profile", label: t("navigation.profile", "Profile") },
      { to: "/settings", label: t("navigation.settings", "Settings") },
    ];

    if (user?.role === "admin") {
      items.push({ to: "/admin", label: t("navigation.admin", "Admin") });
    }

    return items;
  }, [t, user?.role]);

  const baseNavClass =
    "inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900";

  const isActive = (to: string) =>
    to === "/dashboard" ? location.pathname.startsWith("/dashboard") : location.pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-slate-900/85 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <BrandLogo variant="small" hideSubtitle to="/dashboard" />

            {leftExtra ? (
              <div className="min-w-0">{leftExtra}</div>
            ) : (
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t("app.name")}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-300">{t("app.description")}</p>
              </div>
            )}

            <nav className="ml-2 hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  title={item.title}
                  className={`${baseNavClass} ${
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
            <div className="hidden sm:flex items-center gap-2">{rightExtra}</div>

            <div className="hidden lg:block">
              <LanguageSelector />
            </div>

            <button
              type="button"
              onClick={toggle}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              aria-label={theme === "dark" ? t("theme.light", "Light Mode") : t("theme.dark", "Dark Mode")}
              title={theme === "dark" ? t("theme.light", "Light Mode") : t("theme.dark", "Dark Mode")}
            >
              {theme === "dark" ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              <span className="hidden text-sm font-medium sm:inline">
                {theme === "dark" ? t("theme.light", "Light") : t("theme.dark", "Dark")}
              </span>
            </button>

            {showUserInfo ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                  title={t("user.menu", "User Menu")}
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                  aria-controls="app-header-user-menu"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-semibold text-white">
                    {(user?.name || user?.email || "U")[0].toUpperCase()}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">{user?.name || t("common.user", "User")}</span>
                </button>

                {showUserMenu ? (
                  <div id="app-header-user-menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name || t("common.user", "User")}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-300">{user?.email}</p>
                    </div>

                    {userMenuItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={() => setShowUserMenu(false)}
                      >
                        {item.label}
                      </Link>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full border-t border-slate-200 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t("navigation.logout")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowMobileMenu((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              aria-label={t("navigation.menu", "Menu")}
              title={t("navigation.menu", "Menu")}
              aria-expanded={showMobileMenu}
              aria-controls="app-header-mobile-menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {showMobileMenu ? (
          <div id="app-header-mobile-menu" ref={mobileMenuRef} className="border-t border-slate-200 pb-4 pt-3 dark:border-slate-700 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={`mobile-${item.to}`}
                  to={item.to}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  onClick={() => setShowMobileMenu(false)}
                  className={`${baseNavClass} ${
                    isActive(item.to)
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {rightExtra ? <div className="pt-1">{rightExtra}</div> : null}

              <div className="rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                <LanguageSelector />
              </div>

              {showUserInfo ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                  {userMenuItems.map((item) => (
                    <Link
                      key={`mobile-user-${item.to}`}
                      to={item.to}
                      onClick={() => setShowMobileMenu(false)}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {item.label}
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowMobileMenu(false);
                    }}
                    className="w-full border-t border-slate-200 px-3 py-2 text-left text-sm text-red-600 dark:border-slate-700 dark:text-red-400"
                  >
                    {t("navigation.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}