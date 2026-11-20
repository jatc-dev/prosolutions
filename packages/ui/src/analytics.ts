import type { ConsentState } from "./consent.js";
import { GTM_ID } from "./links.js";

/**
 * Google Tag Manager with Consent Mode v2. Nothing from Google loads until the
 * visitor accepts analytics: the default consent is "denied" for everything,
 * GTM is injected only after an explicit opt-in, and revoking consent clears
 * the Google Analytics cookies. Without VITE_GTM_ID (QA, local) it is a no-op.
 */

type DataLayerEntry = Record<string, unknown> | IArguments;

declare global {
  interface Window {
    dataLayer?: DataLayerEntry[];
  }
}

export const ANALYTICS_ENABLED = Boolean(GTM_ID);
const SCRIPT_ID = "ps-gtm";
let defaultsSet = false;
let loaded = false;

function dataLayer(): DataLayerEntry[] {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

/** Same signature as Google's gtag(): pushes the `arguments` object. */
function gtag(..._args: unknown[]) {
  // eslint-disable-next-line prefer-rest-params
  dataLayer().push(arguments);
}

function setConsentDefaults() {
  if (defaultsSet) return;
  defaultsSet = true;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

function loadGtm(id: string) {
  if (loaded || document.getElementById(SCRIPT_ID)) {
    loaded = true;
    return;
  }
  loaded = true;
  dataLayer().push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Removes Google Analytics cookies (_ga, _ga_<id>, _gid) on this host and the shared domain. */
function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0] ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid");
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`, host.endsWith("prosolutions.page") ? ".prosolutions.page" : ""].filter((d, i, all) => all.indexOf(d) === i);
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

/** Applies the visitor's decision. Call on load and whenever it changes. */
export function applyAnalyticsConsent(consent: ConsentState | null) {
  if (!GTM_ID || typeof window === "undefined") return;
  setConsentDefaults();
  if (!consent) return;
  gtag("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.advertising ? "granted" : "denied",
    ad_user_data: consent.advertising ? "granted" : "denied",
    ad_personalization: consent.advertising ? "granted" : "denied",
  });
  if (consent.analytics) loadGtm(GTM_ID);
  else clearAnalyticsCookies();
}

/**
 * Records a product event (sent to GTM's dataLayer). Silently ignored until
 * analytics is accepted, so nothing is queued or collected before consent.
 */
export function trackEvent(event: string, params: Record<string, string | number | boolean | undefined> = {}) {
  if (!loaded || typeof window === "undefined") return;
  dataLayer().push({ event, ...params });
}

/** Test helper. */
export function resetAnalyticsForTests() {
  defaultsSet = false;
  loaded = false;
  if (typeof window !== "undefined") {
    window.dataLayer = [];
    document.getElementById(SCRIPT_ID)?.remove();
  }
}
