import { useEffect } from "react";
import { normalizeAdSenseClient } from "./links.js";
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
/**
 * Carga el script de Google AdSense una sola vez cuando VITE_ADSENSE_CLIENT
 * esta definido. Sin la variable, no se inyecta nada (modo placeholder).
 * El cliente se normaliza siempre al formato ca-pub-XXXX.
 */
export function useAdSenseScript(client) {
    const normalized = normalizeAdSenseClient(client);
    useEffect(() => {
        if (!normalized || typeof document === "undefined")
            return;
        if (document.head.querySelector(`script[data-adsense-client="${normalized}"]`))
            return;
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `${ADSENSE_SRC}?client=${normalized}`;
        script.setAttribute("data-adsense-client", normalized);
        document.head.appendChild(script);
    }, [normalized]);
}
/** Empuja el render del bloque <ins> al loader de AdSense (idempotente por montaje). */
export function useAdSensePush(enabled) {
    useEffect(() => {
        if (!enabled || typeof window === "undefined")
            return;
        try {
            const w = window;
            w.adsbygoogle = w.adsbygoogle || [];
            w.adsbygoogle.push({});
        }
        catch {
            /* el loader de AdSense aun no esta disponible */
        }
    }, [enabled]);
}
