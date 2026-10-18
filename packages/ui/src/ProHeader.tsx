import React, { useEffect, useState } from "react";
import { Briefcase, FileText, Gem, House, Menu, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { APP_URLS, JATC_URL, PRIVACY_URL, TERMS_URL, isExternalUrl } from "./links.js";
import { ProSolutionsLogo } from "./ProSolutionsLogo.js";
import { useTheme } from "./useTheme.js";
import { cn } from "./utils.js";

export type ActiveApp = "core" | "procv" | "projobs";

interface NavItem {
  label: string;
  href: string;
  app?: ActiveApp;
  icon: LucideIcon;
}

interface ProHeaderProps {
  /** App actual: resalta su enlace con un badge "Activo". */
  activeApp: ActiveApp;
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      aria-label={isDark ? (locale === "en" ? "Switch to light mode" : "Activar modo claro") : (locale === "en" ? "Switch to dark mode" : "Activar modo oscuro")}
      title={isDark ? (locale === "en" ? "Light mode" : "Modo claro") : (locale === "en" ? "Dark mode" : "Modo oscuro")}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

function navItems(locale: "es" | "en"): NavItem[] {
  const labels = locale === "en"
    ? { home: "ProSolutions", plans: "Premium plans" }
    : { home: "ProSolutions", plans: "Planes Premium" };
  return [
    { label: labels.home, href: APP_URLS.core, app: "core", icon: House },
    { label: "ProCV", href: APP_URLS.procvLogin, app: "procv", icon: FileText },
    { label: "ProJobs", href: APP_URLS.projobs, app: "projobs", icon: Briefcase },
    { label: labels.plans, href: APP_URLS.core.replace(/\/$/, "") + "/#planes", icon: Gem },
  ];
}

/**
 * Header unificado del ecosistema ProSolutions.
 * Uso: <ProHeader activeApp="core" /> en apps/core, "procv" en apps/procv, etc.
 */
export function ProHeader({ activeApp, actions, className, locale = "es", onLocaleChange }: ProHeaderProps) {
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
    const isActive = item.app === activeApp;
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
        {isActive ? (
          <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            {locale === "en" ? "Active" : "Activo"}
          </span>
        ) : null}
      </a>
    );
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-colors dark:border-slate-700/80 dark:bg-slate-900/85",
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
          <a
            href={APP_URLS.core}
            target={isExternalUrl(APP_URLS.core) ? "_blank" : undefined}
            rel={isExternalUrl(APP_URLS.core) ? "noreferrer" : undefined}
            className="flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ProSolutionsLogo />
          </a>

      <nav aria-label={locale === "en" ? "ProSolutions ecosystem navigation" : "Navegación del ecosistema ProSolutions"} className="hidden items-center gap-1 lg:flex">
            {items.map((item) => renderLink(item))}
          </nav>

          <div className="flex items-center gap-2">
            {actions ? <div className="hidden items-center gap-2 lg:flex">{actions}</div> : null}

            {onLocaleChange ? (
              <button
                type="button"
                onClick={onLocaleChange}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label={locale === "en" ? "Switch language to Spanish" : "Cambiar idioma a inglés"}
                title={locale === "en" ? "Switch language to Spanish" : "Cambiar idioma a inglés"}
              >
                {locale === "es" ? "EN" : "ES"}
              </button>
            ) : null}

            <div className="hidden lg:block">
              <ThemeToggle locale={locale} />
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label={mobileOpen ? (locale === "en" ? "Close menu" : "Cerrar menú") : (locale === "en" ? "Open menu" : "Abrir menú")}
              aria-expanded={mobileOpen}
              aria-controls="pro-header-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="pro-header-mobile-menu" className="border-t border-slate-200 pb-4 pt-3 dark:border-slate-700 lg:hidden">
            <div className="flex flex-col gap-2">
              {items.map((item) => renderLink(item, () => setMobileOpen(false)))}

              {actions ? <div className="flex flex-col gap-2 pt-1">{actions}</div> : null}

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
