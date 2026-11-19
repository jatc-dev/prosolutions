import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE,
  consentCookieString,
  hasAdvertisingConsent,
  parseConsent,
  readConsent,
  serializeConsent,
  writeConsent,
} from "../../../packages/ui/src/consent";

const clearConsent = () => {
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
};

describe("cookie consent (CMP)", () => {
  afterEach(clearConsent);

  it("serializes and parses a decision round-trip", () => {
    const value = serializeConsent({ analytics: false, advertising: true }, 1_763_424_000_000);
    expect(value).toBe("v1.a0.d1.1763424000000");
    const parsed = parseConsent(`other=1; ${CONSENT_COOKIE}=${encodeURIComponent(value)}; theme=dark`);
    expect(parsed).toEqual({ version: 1, analytics: false, advertising: true, decidedAt: new Date(1_763_424_000_000).toISOString() });
  });

  it("treats missing, tampered or unknown-version cookies as no decision", () => {
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=v2.a1.d1.1763424000000`)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=v1.a1.d2.1763424000000`)).toBeNull();
    expect(parseConsent(`${CONSENT_COOKIE}=v1.a1.d1.abc`)).toBeNull();
  });

  it("shares the cookie across subdomains only on prosolutions.page, Secure only on https", () => {
    const prod = consentCookieString("v1.a1.d1.1763424000000", { hostname: "projobs.prosolutions.page", protocol: "https:" });
    expect(prod).toContain("Domain=.prosolutions.page");
    expect(prod).toContain("Secure");
    expect(prod).toContain("SameSite=Lax");
    expect(prod).toMatch(/Max-Age=\d+/);

    const local = consentCookieString("v1.a1.d1.1763424000000", { hostname: "localhost", protocol: "http:" });
    expect(local).not.toContain("Domain=");
    expect(local).not.toContain("Secure");

    const lookalike = consentCookieString("v1.a1.d1.1763424000000", { hostname: "evilprosolutions.page", protocol: "https:" });
    expect(lookalike).not.toContain("Domain=");
  });

  it("advertising consent is false until the user explicitly accepts it", () => {
    expect(hasAdvertisingConsent(null)).toBe(false);
    expect(hasAdvertisingConsent(parseConsent(`${CONSENT_COOKIE}=v1.a1.d0.1763424000000`))).toBe(false);
    expect(hasAdvertisingConsent(parseConsent(`${CONSENT_COOKIE}=v1.a0.d1.1763424000000`))).toBe(true);
  });

  it("writes the decision to document.cookie and notifies listeners", () => {
    const listener = vi.fn();
    window.addEventListener("ps:consent-change", listener);
    expect(readConsent()).toBeNull();
    writeConsent({ analytics: false, advertising: false });
    expect(readConsent()).toMatchObject({ analytics: false, advertising: false });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("ps:consent-change", listener);
  });
});
