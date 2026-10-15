/** import.meta.env solo existe bajo Vite; fuera de el se usan los fallbacks. */
const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/**
 * URLs del ecosistema. Se resuelven por variables de entorno de cada app
 * (VITE_CORE_URL, VITE_PROCV_URL, VITE_PROJOBS_URL, VITE_JATC_URL, VITE_PRIVACY_URL)
 * con fallbacks seguros a URLs relativas o por defecto.
 */
export const APP_URLS = {
  core: env.VITE_CORE_URL ?? "/",
  procv: env.VITE_PROCV_URL ?? "https://procv-platform.onrender.com",
  projobs: env.VITE_PROJOBS_URL ?? "https://jatc-dev.github.io/empleos-tech-remoto",
} as const;

export const JATC_URL = env.VITE_JATC_URL ?? "https://github.com/jatc-dev";
export const PRIVACY_URL =
  env.VITE_PRIVACY_URL ?? "https://jatc-dev.github.io/empleos-tech-remoto/privacidad.html";
export const TERMS_URL = env.VITE_TERMS_URL ?? "#terminos";

/** Marca si la URL apunta a otro origen (abre en pestaña nueva). */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}
