import { useEffect } from "react";

const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

/**
 * Carga el script de Google AdSense una sola vez cuando VITE_ADSENSE_CLIENT
 * esta definido. Sin la variable, no se inyecta nada (modo placeholder).
 */
export function useAdSenseScript(client: string | undefined) {
  useEffect(() => {
    if (!client || typeof document === "undefined") return;
    if (document.head.querySelector(`script[data-adsense-client="${client}"]`)) return;

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${ADSENSE_SRC}?client=${client}`;
    script.setAttribute("data-adsense-client", client);
    document.head.appendChild(script);
  }, [client]);
}

/** Empuja el render del bloque <ins> al loader de AdSense (idempotente por montaje). */
export function useAdSensePush(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {
      /* el loader de AdSense aun no esta disponible */
    }
  }, [enabled]);
}
