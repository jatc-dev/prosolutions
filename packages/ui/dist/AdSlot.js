import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Megaphone } from "lucide-react";
import { ADSENSE_CLIENT } from "./links.js";
import { cn } from "./utils.js";
import { useAdSensePush, useAdSenseScript } from "./useAdSense.js";
/**
 * Bloque de anuncio unificado del ecosistema.
 * Renderiza el <ins> real de Google AdSense con el cliente del ecosistema
 * (VITE_ADSENSE_CLIENT, por defecto ca-pub-3956322934366702).
 */
export function AdSlot({ placement = "default", slot, format = "auto", className }) {
    const client = ADSENSE_CLIENT;
    useAdSenseScript(client);
    useAdSensePush(true);
    if (client) {
        return (_jsx("ins", { className: cn("adsbygoogle block", className), style: { display: "block", minHeight: "90px" }, "data-ad-client": client, "data-ad-slot": slot, "data-ad-format": format, "data-full-width-responsive": "true", "data-ad-placement": placement }));
    }
    return (_jsx("div", { role: "complementary", "aria-label": "Espacio publicitario", "data-ad-placement": placement, "data-ad-format": format, className: cn("flex min-h-[90px] items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-slate-100/50 px-6 py-8 text-center dark:border-slate-600/70 dark:bg-slate-800/30", className), children: _jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [_jsx(Megaphone, { className: "h-5 w-5 text-slate-400 dark:text-slate-500", "aria-hidden": "true" }), _jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500", children: "Espacio publicitario" }), _jsxs("p", { className: "text-[11px] text-slate-400 dark:text-slate-500", children: ["Google AdSense \u00B7 ", placement, " \u00B7 ", format] })] }) }));
}
