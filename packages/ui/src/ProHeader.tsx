import React, { useEffect, useState } from "react";
import { BookOpen, Briefcase, Building2, Calculator, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, UserRound, X, type LucideIcon } from "lucide-react";
import { APP_URLS, RESOURCE_URLS, isExternalUrl } from "./links.js";
import { ProSolutionsLogo } from "./ProSolutionsLogo.js";
import { useTheme } from "./useTheme.js";
import { cn } from "./utils.js";

export type ActiveApp = "core" | "procv" | "projobs";

interface NavItem {
  label: string;
  href: string;
  app?: ActiveApp;
  /** Within the app, the item is active only under this path prefix. */
  matchPath?: string;
  icon: LucideIcon;
}

interface HeaderProfile {
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  /** Capability modules from ProIdentity (e.g. PRORECRUIT shows the company panel). */
  modules?: string[] | null;
  /** Shows the Administration entry (the server still enforces permissions). */
  isAdmin?: boolean;
}

interface MenuLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface ProHeaderProps {
  /** App actual: marca su enlace como página activa (aria-current). */
  activeApp: ActiveApp;
  /** Usuario autenticado; cuando existe, muestra el menú unificado de cuenta. */
  profile?: HeaderProfile | null;
  /** Acción de cierre de sesión del módulo autenticado. */
  onSignOut?: () => void | Promise<void>;
  /** Destino opcional para la página de perfil del módulo actual. */
  profileHref?: string;
  /** Destino opcional para configuración de cuenta. */
  settingsHref?: string;
  /** Destino opcional para administrar dispositivos y sesiones. */
  securityHref?: string;
  /** URL de acceso cuando no hay una sesión autenticada. */
  loginHref?: string;
  /** Indica que la aplicación está comprobando la sesión. */
  authLoading?: boolean;
  /** Idioma de la interfaz compartida. */
  locale?: "es" | "en";
  /** Acción para cambiar el idioma, cuando la aplicación ofrece traducciones. */
  onLocaleChange?: () => void;
  /** Acciones extra a la derecha del header (p. ej. "Abrir editor"). */
  actions?: React.ReactNode;
  className?: string;
}

function ThemeToggle({ locale }: { locale: "es" | "en" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      aria-label={isDark ? (locale === "en" ? "Switch to light mode" : "Activar modo claro") : (locale === "en" ? "Switch to dark mode" : "Activar modo oscuro")}
      title={isDark ? (locale === "en" ? "Light mode" : "Modo claro") : (locale === "en" ? "Dark mode" : "Modo oscuro")}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

const trimUrl = (url: string) => url.replace(/\/+$/, "");

/** Task-based navigation shared by every app (BRAND_AND_DESIGN_SYSTEM.md §5.1). */
function navItems(locale: "es" | "en"): NavItem[] {
  const en = locale === "en";
  return [
    { label: en ? "Jobs" : "Empleos", href: APP_URLS.projobs, app: "projobs", icon: Briefcase },
    { label: en ? "Create CV" : "Crear CV", href: APP_URLS.procvLogin, app: "procv", icon: FileText },
    { label: en ? "Tools" : "Herramientas", href: RESOURCE_URLS.tools, app: "core", matchPath: "/tools", icon: Calculator },
    { label: en ? "Academy" : "Academia", href: RESOURCE_URLS.academy, app: "core", matchPath: "/academy", icon: BookOpen },
    { label: en ? "For employers" : "Para empresas", href: `${trimUrl(APP_URLS.projobs)}/empresa`, icon: Building2 },
  ];
}

/** Account menu entries for candidate, recruiter and admin roles. */
function accountLinks(locale: "es" | "en", profile: HeaderProfile): MenuLink[] {
  const en = locale === "en";
  const links: MenuLink[] = [
    { label: en ? "My dashboard" : "Mi panel", href: `${trimUrl(APP_URLS.core)}/dashboard`, icon: LayoutDashboard },
    { label: en ? "My CVs" : "Mis CV", href: APP_URLS.procvLogin, icon: FileText },
    { label: en ? "My applications" : "Mis postulaciones", href: `${trimUrl(APP_URLS.projobs)}/postulaciones`, icon: ClipboardList },
  ];
  if (profile.modules?.includes("PRORECRUIT")) {
    links.push({ label: en ? "Company panel" : "Panel de empresa", href: `${trimUrl(APP_URLS.projobs)}/empresa`, icon: Building2 });
  }
  if (profile.isAdmin) {
    links.push({ label: en ? "Administration" : "Administración", href: `${trimUrl(APP_URLS.core)}/admin`, icon: ShieldCheck });
  }
  return links;
}

/**
 * Header unificado del ecosistema ProSolutions.
 * Uso: <ProHeader activeApp="core" /> en apps/core, "procv" en apps/procv, etc.
 */
export function ProHeader({ activeApp, actions, className, locale = "es", onLocaleChange, profile, onSignOut, profileHref, settingsHref, securityHref, loginHref, authLoading = false }: ProHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navItems(locale);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const linkClasses = (isActive: boolean) =>
    cn(
      "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    );

  const renderLink = (item: NavItem, onNavigate?: () => void) => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    const isActive = item.app === activeApp && (!item.matchPath || currentPath.startsWith(item.matchPath));
    const external = isExternalUrl(item.href);

    return (
      <a
        key={item.label}
        href={item.href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={linkClasses(isActive)}
      >
        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{item.label}</span>
      </a>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-700/80 dark:bg-slate-900/90",
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
          <a
            href={APP_URLS.core}
            target={isExternalUrl(APP_URLS.core) ? "_blank" : undefined}
            rel={isExternalUrl(APP_URLS.core) ? "noreferrer" : undefined}
            className="flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            <ProSolutionsLogo />
          </a>

      <nav aria-label={locale === "en" ? "ProSolutions ecosystem navigation" : "Navegación del ecosistema ProSolutions"} className="hidden items-center gap-1 xl:flex">
            {items.map((item) => renderLink(item))}
          </nav>

          <div className="flex items-center gap-2">
            {actions ? <div className="hidden items-center gap-2 xl:flex">{actions}</div> : null}

            {authLoading && !profile ? (
              <span role="status" className="hidden rounded-xl px-3 py-2 text-xs font-medium text-slate-500 sm:inline dark:text-slate-400">
                {locale === "en" ? "Checking session..." : "Comprobando sesión..."}
              </span>
            ) : null}

            {!authLoading && !profile && loginHref ? (
              <a href={loginHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                {locale === "en" ? "Sign in" : "Iniciar sesión"}
              </a>
            ) : null}

            {profile ? (
              <details className="group relative">
                <summary className="inline-flex h-10 max-w-56 cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-900 dark:bg-brand-950/60 dark:text-brand-200">
                      {(profile.name || profile.email).trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-32 truncate">{profile.name || (locale === "en" ? "My account" : "Mi cuenta")}</span>
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-700">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{profile.name || (locale === "en" ? "Signed in" : "Sesión iniciada")}</p>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
                  </div>
                  <nav aria-label={locale === "en" ? "Account" : "Cuenta"} className="mt-1 border-b border-slate-100 pb-1 dark:border-slate-700">
                    {accountLinks(locale, profile).map((link) => (
                      <a key={link.href + link.label} href={link.href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                        <link.icon className="h-4 w-4" aria-hidden="true" />
                        {link.label}
                      </a>
                    ))}
                  </nav>
                  {profileHref ? <a href={profileHref} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"><UserRound className="h-4 w-4" aria-hidden="true" />{locale === "en" ? "My profile" : "Mi perfil"}</a> : null}
                  {settingsHref ? <a href={settingsHref} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"><Settings className="h-4 w-4" aria-hidden="true" />{locale === "en" ? "Settings" : "Configuración"}</a> : null}
                  {securityHref ? <a href={securityHref} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{locale === "en" ? "Security and sessions" : "Seguridad y sesiones"}</a> : null}
                  {onSignOut ? <button type="button" onClick={() => void onSignOut()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-900/20"><LogOut className="h-4 w-4" aria-hidden="true" />{locale === "en" ? "Sign out" : "Cerrar sesión"}</button> : null}
                </div>
              </details>
            ) : null}

            {onLocaleChange ? (
              <button
                type="button"
                onClick={onLocaleChange}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label={locale === "en" ? "Switch language to Spanish" : "Cambiar idioma a inglés"}
                title={locale === "en" ? "Switch language to Spanish" : "Cambiar idioma a inglés"}
              >
                {locale === "es" ? "EN" : "ES"}
              </button>
            ) : null}

            <div className="hidden xl:block">
              <ThemeToggle locale={locale} />
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 xl:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label={mobileOpen ? (locale === "en" ? "Close menu" : "Cerrar menú") : (locale === "en" ? "Open menu" : "Abrir menú")}
              aria-expanded={mobileOpen}
              aria-controls="pro-header-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="pro-header-mobile-menu" className="border-t border-slate-200 pb-4 pt-3 dark:border-slate-700 xl:hidden">
            <div className="flex flex-col gap-2">
              {items.map((item) => renderLink(item, () => setMobileOpen(false)))}

              {actions ? <div className="flex flex-col gap-2 pt-1">{actions}</div> : null}

              {profile ? (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{profile.name || (locale === "en" ? "Signed in" : "Sesión iniciada")}</p>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{profile.email}</p>
                  <div className="mt-2 grid gap-1">
                    {accountLinks(locale, profile).map((link) => (
                      <a key={link.href + link.label} href={link.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
                        <link.icon className="h-4 w-4" aria-hidden="true" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {profileHref ? <a href={profileHref} className="text-sm font-medium text-brand-900 hover:underline dark:text-brand-300">{locale === "en" ? "My account" : "Mi cuenta"}</a> : null}
                    {securityHref ? <a href={securityHref} className="text-sm font-medium text-brand-900 hover:underline dark:text-brand-300">{locale === "en" ? "Security and sessions" : "Seguridad y sesiones"}</a> : null}
                    {onSignOut ? <button type="button" onClick={() => void onSignOut()} className="text-sm font-medium text-red-600 hover:underline dark:text-red-400">{locale === "en" ? "Sign out" : "Cerrar sesión"}</button> : null}
                  </div>
                </div>
              ) : !authLoading && loginHref ? (
                <a href={loginHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  {locale === "en" ? "Sign in" : "Iniciar sesión"}
                </a>
              ) : authLoading ? (
                <p role="status" className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{locale === "en" ? "Checking session..." : "Comprobando sesión..."}</p>
              ) : null}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{locale === "en" ? "Theme" : "Tema"}</span>
                <ThemeToggle locale={locale} />
              </div>

            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
