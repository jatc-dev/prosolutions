import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpRight } from "lucide-react";
import { APP_URLS, JATC_URL, PRIVACY_URL, TERMS_URL, isExternalUrl } from "./links.js";
import { ProSolutionsLogo } from "./ProSolutionsLogo.js";
const NAV_GROUPS = [
    {
        title: "Ecosistema",
        links: [
            { label: "Inicio", href: APP_URLS.core, external: isExternalUrl(APP_URLS.core) },
            { label: "ProCV", href: APP_URLS.procv, external: true },
            { label: "ProJobs", href: APP_URLS.projobs, external: true },
            { label: "Planes Premium", href: `${APP_URLS.core.replace(/\/$/, "")}/#planes` },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacidad", href: PRIVACY_URL, external: true },
            { label: "Terminos", href: TERMS_URL },
        ],
    },
];
/** Footer unificado del ecosistema ProSolutions con el credito de JATC.DEV. */
export function ProFooter() {
    return (_jsx("footer", { id: "terminos", className: "border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900", children: _jsxs("div", { className: "mx-auto w-full max-w-7xl px-4 py-14 sm:px-6", children: [_jsxs("div", { className: "grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]", children: [_jsxs("div", { children: [_jsx(ProSolutionsLogo, {}), _jsx("p", { className: "mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300", children: "El ecosistema de herramientas profesionales tech. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu proximo empleo remoto con ProJobs." })] }), NAV_GROUPS.map((group) => (_jsxs("nav", { "aria-label": group.title, children: [_jsx("h4", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500", children: group.title }), _jsx("ul", { className: "mt-4 space-y-2.5", children: group.links.map((link) => (_jsx("li", { children: _jsxs("a", { href: link.href, target: link.external ? "_blank" : undefined, rel: link.external ? "noreferrer" : undefined, className: "inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300", children: [link.label, link.external ? _jsx(ArrowUpRight, { className: "h-3.5 w-3.5 opacity-60" }) : null] }) }, link.label))) })] }, group.title)))] }), _jsxs("div", { className: "mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-center dark:border-slate-700 sm:flex-row sm:text-left", children: [_jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: ["\u00A9 ", new Date().getFullYear(), " ProSolutions. Un producto desarrollado por", " ", _jsx("a", { href: JATC_URL, target: "_blank", rel: "noreferrer", className: "font-semibold text-slate-700 transition-colors hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300", children: "JATC.DEV" })] }), _jsx("p", { className: "text-xs text-slate-400 dark:text-slate-500", children: "Hecho para profesionales tech" })] })] }) }));
}
