/**
 * Lectura de variables de entorno con accesos LITERALES: Vite sustituye
 * estaticamente `import.meta.env.VITE_X` en build. Fuera de Vite (p. ej. Node)
 * import.meta.env no existe y se devuelve un objeto vacio (fallbacks).
 */
function readEnv() {
    if (typeof import.meta === "undefined" || !import.meta.env) {
        return {};
    }
    return {
        VITE_CORE_URL: import.meta.env.VITE_CORE_URL,
        VITE_PROCV_URL: import.meta.env.VITE_PROCV_URL,
        VITE_PROJOBS_URL: import.meta.env.VITE_PROJOBS_URL,
        VITE_JATC_URL: import.meta.env.VITE_JATC_URL,
        VITE_PRIVACY_URL: import.meta.env.VITE_PRIVACY_URL,
        VITE_TERMS_URL: import.meta.env.VITE_TERMS_URL,
        VITE_ADSENSE_CLIENT: import.meta.env.VITE_ADSENSE_CLIENT,
    };
}
const env = readEnv();
/**
 * URLs del ecosistema. Se resuelven por variables de entorno de cada app
 * (VITE_CORE_URL, VITE_PROCV_URL, VITE_PROJOBS_URL, VITE_JATC_URL, VITE_PRIVACY_URL)
 * con fallbacks seguros a URLs relativas o por defecto.
 */
const procvUrl = env.VITE_PROCV_URL ?? "https://procv.prosolutions.page";
const configuredCoreUrl = env.VITE_CORE_URL;
const coreUrl = configuredCoreUrl && /^https?:\/\//i.test(configuredCoreUrl)
    ? configuredCoreUrl.replace(/\/+$/, "")
    : "https://prosolutions.page";
export const APP_URLS = {
    core: coreUrl,
    procv: procvUrl,
    procvLogin: `${procvUrl.replace(/\/+$/, "")}/login`,
    projobs: env.VITE_PROJOBS_URL ?? "https://projobs.prosolutions.page",
};
export const JATC_URL = env.VITE_JATC_URL ?? "https://github.com/jatc-dev";
export const PRIVACY_URL = env.VITE_PRIVACY_URL ?? "https://projobs.prosolutions.page/privacidad.html";
export const TERMS_URL = env.VITE_TERMS_URL ?? "#terminos";
/** Cliente de Google AdSense del ecosistema (pub-3956322934366702 / ca-pub-3956322934366702). */
export const ADSENSE_CLIENT = normalizeAdSenseClient(env.VITE_ADSENSE_CLIENT) ?? "ca-pub-3956322934366702";
/** Marca si la URL apunta a otro origen (abre en pestaña nueva). */
export function isExternalUrl(url) {
    return /^https?:\/\//i.test(url);
}
/**
 * Normaliza un ID de AdSense al formato que esperan los scripts y los <ins>:
 * siempre con prefijo `ca-`. Acepta `pub-XXXX`, `ca-pub-XXXX` o valores vacios.
 */
export function normalizeAdSenseClient(client) {
    if (!client)
        return undefined;
    const trimmed = client.trim();
    if (!trimmed)
        return undefined;
    if (trimmed.startsWith("ca-pub-"))
        return trimmed;
    if (trimmed.startsWith("pub-"))
        return `ca-${trimmed}`;
    return trimmed;
}
