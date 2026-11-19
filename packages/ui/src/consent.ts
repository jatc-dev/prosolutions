import { useCallback, useEffect, useState } from "react";

/**
 * Cookie consent shared by every ProSolutions app (one decision for all
 * *.prosolutions.page subdomains). Strictly necessary cookies (session,
 * CSRF, this consent record) never need consent; analytics and advertising
 * cookies are blocked until the user opts in.
 */
export interface ConsentState {
  version: 1;
  analytics: boolean;
  advertising: boolean;
  decidedAt: string;
}

export const CONSENT_COOKIE = "ps_consent";
export const CONSENT_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;
const CHANGE_EVENT = "ps:consent-change";
const OPEN_EVENT = "ps:consent-open";

export function parseConsent(cookieHeader: string | null | undefined): ConsentState | null {
  if (!cookieHeader) return null;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  const match = decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)).match(/^v1\.a([01])\.d([01])\.(\d{10,13})$/);
  if (!match) return null;
  return {
    version: 1,
    analytics: match[1] === "1",
    advertising: match[2] === "1",
    decidedAt: new Date(Number(match[3])).toISOString(),
  };
}

export function serializeConsent(state: Pick<ConsentState, "analytics" | "advertising">, now = Date.now()): string {
  return `v1.a${state.analytics ? 1 : 0}.d${state.advertising ? 1 : 0}.${now}`;
}

/** Cookie attributes: shared across subdomains in production, host-only elsewhere. */
export function consentCookieString(value: string, location: { hostname: string; protocol: string }): string {
  const parts = [`${CONSENT_COOKIE}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${CONSENT_MAX_AGE_SECONDS}`, "SameSite=Lax"];
  if (location.hostname === "prosolutions.page" || location.hostname.endsWith(".prosolutions.page")) parts.push("Domain=.prosolutions.page");
  if (location.protocol === "https:") parts.push("Secure");
  return parts.join("; ");
}

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  return parseConsent(document.cookie);
}

export function writeConsent(choice: Pick<ConsentState, "analytics" | "advertising">): ConsentState {
  const value = serializeConsent(choice);
  if (typeof document !== "undefined") {
    document.cookie = consentCookieString(value, window.location);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
  return parseConsent(`${CONSENT_COOKIE}=${value}`)!;
}

/** Opens the preferences dialog (e.g. from the footer's "Configurar cookies"). */
export function openConsentPreferences(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function hasAdvertisingConsent(state: ConsentState | null): boolean {
  return Boolean(state?.advertising);
}

export function useConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(() => readConsent());

  useEffect(() => {
    const sync = () => setConsent(readConsent());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const save = useCallback((choice: Pick<ConsentState, "analytics" | "advertising">) => setConsent(writeConsent(choice)), []);
  return {
    consent,
    decided: consent !== null,
    acceptAll: () => save({ analytics: true, advertising: true }),
    rejectNonEssential: () => save({ analytics: false, advertising: false }),
    save,
  };
}

/** Subscribe to "open preferences" requests. */
export function useConsentPreferencesRequest(onOpen: () => void) {
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [onOpen]);
}
