/**
 * Where advertising may appear (Google AdSense program policies and our own
 * UX rules). Ads are allowed only in editorial or listing zones; never on
 * authentication, account, legal, error, admin or task-focused screens.
 */
export const AD_PLACEMENTS = ["academy-article", "academy-index", "tools-result", "jobs-listing"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export type AdFormat = "leaderboard" | "in-article" | "sidebar";

/** Space reserved before the ad loads, so the layout never jumps (CLS = 0). */
export const AD_MIN_HEIGHT: Record<AdFormat, number> = {
  leaderboard: 100,
  "in-article": 280,
  sidebar: 600,
};

const BLOCKED_PATHS: RegExp[] = [
  /^\/(login|logout|register|registro|auth|forgot-password|reset-password|verify-email)(\/|$)/,
  /^\/(legal|privacidad|privacidad\.html|terminos|cookies)(\/|$)/,
  /^\/(contacto|settings|security|dashboard|modules|admin|profile|editor)(\/|$)/,
  /^\/(postulaciones|guardados|alertas|empresa)(\/|$)/,
  /^\/(404|500|error|not-found)(\/|$)/,
];

export function isAdAllowedOnPath(pathname: string): boolean {
  const path = ((pathname || "/").split(/[?#]/)[0] ?? "/").toLowerCase();
  return !BLOCKED_PATHS.some((pattern) => pattern.test(path));
}

export interface AdsConfig {
  enabled: boolean;
  /** AdSense publisher id (ca-pub-...) set by an administrator; falls back to the build-time id. */
  publisherId: string | null;
  placements: Record<AdPlacement, boolean>;
}

export const ADS_DISABLED: AdsConfig = {
  enabled: false,
  publisherId: null,
  placements: { "academy-article": false, "academy-index": false, "tools-result": false, "jobs-listing": false },
};

const PUBLISHER_ID = /^ca-pub-\d{10,20}$/;

export function normalizePublisherId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("pub-") ? `ca-${trimmed}` : trimmed;
  return PUBLISHER_ID.test(normalized) ? normalized : null;
}

/** Every condition that must hold before an ad request is made. */
export function adEligibility(input: {
  placement: AdPlacement;
  pathname: string;
  config: AdsConfig | null;
  buildClientId: string | null | undefined;
  advertisingConsent: boolean;
  disabledByPage: boolean;
}): { eligible: boolean; client: string | null; reason?: string } {
  const client = normalizePublisherId(input.config?.publisherId) ?? normalizePublisherId(input.buildClientId);
  if (input.disabledByPage) return { eligible: false, client, reason: "page" };
  if (!isAdAllowedOnPath(input.pathname)) return { eligible: false, client, reason: "path" };
  if (!client) return { eligible: false, client, reason: "no-client" };
  if (!input.config?.enabled) return { eligible: false, client, reason: "disabled" };
  if (!input.config.placements[input.placement]) return { eligible: false, client, reason: "placement" };
  if (!input.advertisingConsent) return { eligible: false, client, reason: "consent" };
  return { eligible: true, client };
}
