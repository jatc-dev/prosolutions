import { useEffect, useState } from "react";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { LINKS } from "../config/links";
import { cn } from "../lib/utils";
import { Logo } from "./Logo";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
  { label: "Inicio", href: "#inicio" },
  { label: "ProCV", href: LINKS.procv, external: true },
  { label: "ProJobs", href: LINKS.projobs, external: true, badge: "Beta" },
  { label: "Planes Premium", href: "#planes" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-colors dark:border-slate-700/80 dark:bg-slate-900/85">
      <div className="ui-container">
        <div className="flex min-h-[72px] items-center justify-between gap-3 py-3">
          <a href="#inicio" className="flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <Logo />
          </a>

          <nav aria-label="Navegacion principal" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {item.label}
                  {item.badge ? (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  ) : null}
                </a>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            <a
              href={LINKS.procv}
              target="_blank"
              rel="noreferrer"
              className="hidden h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition-all hover:bg-brand-700 active:scale-[0.99] sm:inline-flex dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              Crear mi CV Gratis
              <ArrowRight className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              aria-controls="core-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div id="core-mobile-menu" className="border-t border-slate-200 pb-4 pt-3 dark:border-slate-700 md:hidden">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={`mobile-${item.label}`}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    {item.badge ? (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-60" />
                </a>
              ))}

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Tema</span>
                <ThemeToggle />
              </div>

              <a
                href={LINKS.procv}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                Crear mi CV Gratis
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
