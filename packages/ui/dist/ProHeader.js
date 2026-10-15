import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { APP_URLS, isExternalUrl } from "./links.js";
import { ProSolutionsLogo } from "./ProSolutionsLogo.js";
import { useTheme } from "./useTheme.js";
import { cn } from "./utils.js";
function ThemeToggle() {
    const { theme, toggle } = useTheme();
    const isDark = theme === "dark";
    return (_jsx("button", { type: "button", onClick: toggle, className: "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white", "aria-label": isDark ? "Activar modo claro" : "Activar modo oscuro", title: isDark ? "Modo claro" : "Modo oscuro", children: isDark ? _jsx(Sun, { className: "h-5 w-5" }) : _jsx(Moon, { className: "h-5 w-5" }) }));
}
function navItems() {
    return [
        { label: "Inicio", href: APP_URLS.core, app: "core" },
        { label: "ProCV", href: APP_URLS.procv, app: "procv" },
        { label: "ProJobs", href: APP_URLS.projobs, app: "projobs", badge: "Beta" },
        { label: "Planes Premium", href: `${APP_URLS.core.replace(/\/$/, "")}/#planes` },
    ];
}
function CTA_BY_APP(activeApp) {
    if (activeApp === "procv")
        return { label: "Explorar Empleos", href: APP_URLS.projobs };
    if (activeApp === "projobs")
        return { label: "Crear mi CV Gratis", href: APP_URLS.procv };
    return { label: "Crear mi CV Gratis", href: APP_URLS.procv };
}
/**
 * Header unificado del ecosistema ProSolutions.
 * Uso: <ProHeader activeApp="core" /> en apps/core, "procv" en apps/procv, etc.
 */
export function ProHeader({ activeApp, actions, className }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const items = navItems();
    const cta = CTA_BY_APP(activeApp);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                setMobileOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);
    const linkClasses = (isActive) => cn("inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors", isActive
        ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white");
    const renderLink = (item, onNavigate) => {
        const isActive = item.app === activeApp;
        const external = isExternalUrl(item.href);
        return (_jsxs("a", { href: item.href, target: external ? "_blank" : undefined, rel: external ? "noreferrer" : undefined, onClick: onNavigate, "aria-current": isActive ? "page" : undefined, className: linkClasses(isActive), children: [item.label, isActive ? (_jsx("span", { className: "rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-900/50 dark:text-brand-300", children: "Activo" })) : null, item.badge ? (_jsx("span", { className: "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", children: item.badge })) : null] }, item.label));
    };
    return (_jsx("header", { className: cn("sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-colors dark:border-slate-700/80 dark:bg-slate-900/85", className), children: _jsxs("div", { className: "mx-auto w-full max-w-7xl px-4 sm:px-6", children: [_jsxs("div", { className: "flex min-h-[72px] items-center justify-between gap-3 py-3", children: [_jsx("a", { href: APP_URLS.core, target: isExternalUrl(APP_URLS.core) ? "_blank" : undefined, rel: isExternalUrl(APP_URLS.core) ? "noreferrer" : undefined, className: "flex items-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", children: _jsx(ProSolutionsLogo, {}) }), _jsx("nav", { "aria-label": "Navegacion del ecosistema ProSolutions", className: "hidden items-center gap-1 md:flex", children: items.map((item) => renderLink(item)) }), _jsxs("div", { className: "flex items-center gap-2", children: [actions ? _jsx("div", { className: "hidden items-center gap-2 lg:flex", children: actions }) : null, _jsx("div", { className: "hidden lg:block", children: _jsx(ThemeToggle, {}) }), _jsxs("a", { href: cta.href, target: isExternalUrl(cta.href) ? "_blank" : undefined, rel: isExternalUrl(cta.href) ? "noreferrer" : undefined, className: "hidden h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition-all hover:bg-brand-700 active:scale-[0.99] sm:inline-flex dark:bg-brand-500 dark:hover:bg-brand-400", children: [cta.label, _jsx(ArrowRight, { className: "h-4 w-4" })] }), _jsx("button", { type: "button", onClick: () => setMobileOpen((prev) => !prev), className: "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white", "aria-label": mobileOpen ? "Cerrar menu" : "Abrir menu", "aria-expanded": mobileOpen, "aria-controls": "pro-header-mobile-menu", children: mobileOpen ? _jsx(X, { className: "h-5 w-5" }) : _jsx(Menu, { className: "h-5 w-5" }) })] })] }), mobileOpen ? (_jsx("div", { id: "pro-header-mobile-menu", className: "border-t border-slate-200 pb-4 pt-3 dark:border-slate-700 md:hidden", children: _jsxs("div", { className: "flex flex-col gap-2", children: [items.map((item) => renderLink(item, () => setMobileOpen(false))), actions ? _jsx("div", { className: "flex flex-col gap-2 pt-1", children: actions }) : null, _jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700", children: [_jsx("span", { className: "text-sm font-medium text-slate-600 dark:text-slate-300", children: "Tema" }), _jsx(ThemeToggle, {})] }), _jsxs("a", { href: cta.href, target: isExternalUrl(cta.href) ? "_blank" : undefined, rel: isExternalUrl(cta.href) ? "noreferrer" : undefined, onClick: () => setMobileOpen(false), className: "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400", children: [cta.label, _jsx(ArrowRight, { className: "h-4 w-4" })] })] }) })) : null] }) }));
}
