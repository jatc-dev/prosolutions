/** import.meta.env solo existe bajo Vite; fuera de el se usan los fallbacks. */
const env = import.meta.env ?? {};
/**
 * URLs del ecosistema. Se resuelven por variables de entorno de cada app
 * (VITE_CORE_URL, VITE_PROCV_URL, VITE_PROJOBS_URL, VITE_JATC_URL, VITE_PRIVACY_URL)
 * con fallbacks seguros a URLs relativas o por defecto.
 */
export const APP_URLS = {
    core: env.VITE_CORE_URL ?? "/",
    procv: env.VITE_PROCV_URL ?? "https://procv-platform.onrender.com",
    projobs: env.VITE_PROJOBS_URL ?? "https://projobs.prosolutions.page",
};
export const JATC_URL = env.VITE_JATC_URL ?? "https://github.com/jatc-dev";
export const PRIVACY_URL = env.VITE_PRIVACY_URL ?? "https://projobs.prosolutions.page/privacidad.html";
export const TERMS_URL = env.VITE_TERMS_URL ?? "#terminos";
/** Cliente de Google AdSense del ecosistema (pub-3956322934366702 / ca-pub-3956322934366702). */
export const ADSENSE_CLIENT = env.VITE_ADSENSE_CLIENT ?? "ca-pub-3956322934366702";
/** Marca si la URL apunta a otro origen (abre en pestaña nueva). */
export function isExternalUrl(url) {
    return /^https?:\/\//i.test(url);
}
