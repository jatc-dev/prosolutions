import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "./utils.js";
/** Marca ProSolutions: monograma técnico en esmeralda y grafito. */
export function ProSolutionsLogo({ className, showWordmark = true, }) {
    return (_jsxs("span", { className: cn("inline-flex items-center gap-2.5", className), children: [_jsx("span", { "aria-hidden": "true", className: "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-sm font-black text-white shadow-sm", children: "PS" }), showWordmark ? (_jsxs("span", { className: "leading-tight", children: [_jsxs("span", { className: "block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white", children: ["Pro", _jsx("span", { className: "text-brand-900 dark:text-brand-300", children: "Solutions" })] }), _jsx("span", { className: "block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500", children: "Ecosystem" })] })) : null] }));
}
