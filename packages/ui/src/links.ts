/**
 * Lectura de variables de entorno con accesos LITERALES: Vite sustituye
 * estaticamente `import.meta.env.VITE_X` en build. Fuera de Vite (p. ej. Node)
 * import.meta.env no existe y se devuelve un objeto vacio (fallbacks).
 */
function readEnv(): Record<string, string | undefined> {
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
    VITE_ADSENSE_CLIENT_ID: import.meta.env.VITE_ADSENSE_CLIENT_ID,
    VITE_IDENTITY_API_URL: import.meta.env.VITE_IDENTITY_API_URL,
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
  // Enter through the protected route so ProCV can preserve its return URL
  // when the central QA login is required.
  procvLogin: `${procvUrl.replace(/\/+$/, "")}/dashboard`,
  projobs: env.VITE_PROJOBS_URL ?? "https://projobs.prosolutions.page",
} as const;

export const JATC_URL = env.VITE_JATC_URL ?? "https://github.com/jatc-dev";

const coreBase = APP_URLS.core;

/** Public pages hosted by Core (pre-rendered): legal framework, company and resources. */
export const LEGAL_URLS = {
  privacy: env.VITE_PRIVACY_URL ?? `${coreBase}/legal/privacidad/`,
  terms: env.VITE_TERMS_URL ?? `${coreBase}/legal/terminos/`,
  cookies: `${coreBase}/legal/cookies/`,
  ai: `${coreBase}/legal/uso-ia/`,
  about: `${coreBase}/nosotros/`,
  contact: `${coreBase}/contacto/`,
} as const;

export const RESOURCE_URLS = {
  tools: `${coreBase}/tools/`,
  academy: `${coreBase}/academy/`,
} as const;

export const PRIVACY_URL = LEGAL_URLS.privacy;
export const TERMS_URL = LEGAL_URLS.terms;

/**
 * AdSense publisher id from the build (VITE_ADSENSE_CLIENT_ID, legacy
 * VITE_ADSENSE_CLIENT). No default: without it, ad slots collapse.
 */
export const ADSENSE_CLIENT = normalizeAdSenseClient(env.VITE_ADSENSE_CLIENT_ID || env.VITE_ADSENSE_CLIENT);

/** ProIdentity origin (public platform settings such as the ads configuration). */
export const IDENTITY_ORIGIN = (env.VITE_IDENTITY_API_URL || "https://identity.prosolutions.page/api/auth")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/auth(\/.*)?$/i, "");

/** Marca si la URL apunta a otro origen (abre en pestaña nueva). */
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Normaliza un ID de AdSense al formato que esperan los scripts y los <ins>:
 * siempre con prefijo `ca-`. Acepta `pub-XXXX`, `ca-pub-XXXX` o valores vacios.
 */
export function normalizeAdSenseClient(client: string | null | undefined): string | undefined {
  if (!client) return undefined;
  const trimmed = client.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("ca-pub-")) return trimmed;
  if (trimmed.startsWith("pub-")) return `ca-${trimmed}`;
  return trimmed;
}
