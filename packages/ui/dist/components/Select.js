import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "../utils.js";
/**
 * Selector desplegable del ecosistema ProSolutions.
 */
export function Select({ label, error, className, id, ...props }) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (_jsxs("div", { className: "w-full space-y-2", children: [label && (_jsx("label", { htmlFor: inputId, className: "block text-sm font-medium text-slate-700 dark:text-slate-300", children: label })), _jsx("select", { id: inputId, ...props, className: cn("flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700/50 focus:border-brand-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-brand-400 dark:focus:border-brand-400", className, error ? "border-red-500 dark:border-red-400" : "") }), error && (_jsx("p", { className: "mt-1 text-sm text-red-600 dark:text-red-400", children: error }))] }));
}
Select.displayName = "Select";
