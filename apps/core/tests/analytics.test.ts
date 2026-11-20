import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConsentState } from "../../../packages/ui/src/consent";

const consent = (analytics: boolean, advertising = false): ConsentState => ({ version: 1, analytics, advertising, decidedAt: new Date().toISOString() });

async function loadAnalytics(gtmId: string) {
  vi.resetModules();
  vi.stubEnv("VITE_GTM_ID", gtmId);
  const module = await import("../../../packages/ui/src/analytics");
  module.resetAnalyticsForTests();
  return module;
}

const gtmScript = () => document.getElementById("ps-gtm") as HTMLScriptElement | null;
const consentCalls = () =>
  (window.dataLayer ?? [])
    .map((entry) => Array.from(entry as ArrayLike<unknown>))
    .filter((args) => args[0] === "consent");

afterEach(() => {
  vi.unstubAllEnvs();
  document.getElementById("ps-gtm")?.remove();
  window.dataLayer = [];
});

describe("analytics (Google Tag Manager + Consent Mode v2)", () => {
  it("does nothing at all without a container id", async () => {
    const analytics = await loadAnalytics("");
    expect(analytics.ANALYTICS_ENABLED).toBe(false);
    analytics.applyAnalyticsConsent(consent(true));
    analytics.trackEvent("search", { search_term: "contador" });
    expect(gtmScript()).toBeNull();
    expect(window.dataLayer ?? []).toHaveLength(0);
  });

  it("denies everything by default and loads GTM only after analytics consent", async () => {
    const analytics = await loadAnalytics("GTM-TEST123");
    expect(analytics.ANALYTICS_ENABLED).toBe(true);

    analytics.applyAnalyticsConsent(null);
    expect(consentCalls()[0]).toEqual(["consent", "default", expect.objectContaining({ analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" })]);
    expect(gtmScript()).toBeNull();

    // Events before consent are dropped, not queued.
    analytics.trackEvent("search", { search_term: "antes" });
    expect((window.dataLayer ?? []).some((entry) => (entry as Record<string, unknown>).event === "search")).toBe(false);

    analytics.applyAnalyticsConsent(consent(false, true));
    expect(gtmScript()).toBeNull();

    analytics.applyAnalyticsConsent(consent(true));
    expect(gtmScript()?.src).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-TEST123");
    expect(consentCalls().at(-1)).toEqual(["consent", "update", expect.objectContaining({ analytics_storage: "granted", ad_storage: "denied" })]);

    analytics.trackEvent("search", { search_term: "contador" });
    expect(window.dataLayer).toContainEqual({ event: "search", search_term: "contador" });
  });

  it("clears Google Analytics cookies when analytics is withdrawn", async () => {
    const analytics = await loadAnalytics("GTM-TEST123");
    document.cookie = "_ga=GA1.1.123; path=/";
    document.cookie = "_ga_ABC123=GS1.1.456; path=/";
    document.cookie = "ps_consent=v1.a0.d0.1763560000000; path=/";
    analytics.applyAnalyticsConsent(consent(false));
    expect(document.cookie).not.toContain("_ga=");
    expect(document.cookie).not.toContain("_ga_ABC123");
    expect(document.cookie).toContain("ps_consent");
  });

  it("ignores malformed container ids", async () => {
    const analytics = await loadAnalytics("<script>");
    expect(analytics.ANALYTICS_ENABLED).toBe(false);
  });
});
