import { APP_URLS } from "@prosolutions/ui";

const trimSlash = (value: string) => value.trim().replace(/\/+$/, "");

/** ProJobs API base URL (no trailing slash). */
export const PROJOBS_API_URL = trimSlash(
  import.meta.env.VITE_PROJOBS_API_URL || (import.meta.env.DEV ? "http://localhost:5176" : "https://projobs-api-0clw.onrender.com"),
);

/** ProIdentity auth API (`.../api/auth`); tolerates values that end in /login. */
export const IDENTITY_API_URL = (() => {
  const raw = trimSlash(import.meta.env.VITE_IDENTITY_API_URL || "https://identity.prosolutions.page/api/auth");
  return raw.replace(/\/(login|refresh)$/, "");
})();

export const CORE_URL = APP_URLS.core;
export const PROCV_URL = APP_URLS.procv;

/** Central login hosted by Core; it returns to `returnUrl` (allow-listed origins only). */
export function loginUrl(returnUrl = window.location.href): string {
  return `${CORE_URL}/login?redirect_uri=${encodeURIComponent(returnUrl)}`;
}

/** Public origin of this web app (canonical URLs and structured data). */
export const WEB_URL = trimSlash(APP_URLS.projobs);
