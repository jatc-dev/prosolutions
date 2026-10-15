/**
 * URLs del ecosistema. Se resuelven por variables de entorno de cada app
 * (VITE_CORE_URL, VITE_PROCV_URL, VITE_PROJOBS_URL, VITE_JATC_URL, VITE_PRIVACY_URL)
 * con fallbacks seguros a URLs relativas o por defecto.
 */
export declare const APP_URLS: {
    readonly core: string;
    readonly procv: string;
    readonly procvLogin: string;
    readonly projobs: string;
};
export declare const JATC_URL: string;
export declare const PRIVACY_URL: string;
export declare const TERMS_URL: string;
/** Cliente de Google AdSense del ecosistema (pub-3956322934366702 / ca-pub-3956322934366702). */
export declare const ADSENSE_CLIENT: string;
/** Marca si la URL apunta a otro origen (abre en pestaña nueva). */
export declare function isExternalUrl(url: string): boolean;
/**
 * Normaliza un ID de AdSense al formato que esperan los scripts y los <ins>:
 * siempre con prefijo `ca-`. Acepta `pub-XXXX`, `ca-pub-XXXX` o valores vacios.
 */
export declare function normalizeAdSenseClient(client: string | null | undefined): string | undefined;
