import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdSlot, NoAds } from "../../../packages/ui/src/AdSlot";
import { resetAdsConfigCache } from "../../../packages/ui/src/adsConfig";
import { AD_MIN_HEIGHT, adEligibility, isAdAllowedOnPath, type AdsConfig } from "../../../packages/ui/src/adsPolicy";
import { CONSENT_COOKIE } from "../../../packages/ui/src/consent";

const PUBLISHER = "ca-pub-1234567890123456";
const ENABLED: AdsConfig = {
  enabled: true,
  publisherId: PUBLISHER,
  placements: { "academy-article": true, "academy-index": true, "tools-result": true, "jobs-listing": true },
};

function setup(config: AdsConfig, consent: "accepted" | "rejected" | "none") {
  sessionStorage.setItem("ps_ads_config_v1", JSON.stringify(config));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ ads: config }) })),
  );
  if (consent !== "none") document.cookie = `${CONSENT_COOKIE}=v1.a0.d${consent === "accepted" ? 1 : 0}.${Date.now()}; Path=/`;
}

const adsenseScripts = () => document.head.querySelectorAll('script[src*="adsbygoogle.js"]');

describe("ad placement policy", () => {
  it.each([
    "/login",
    "/register",
    "/auth/callback",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/legal/privacidad",
    "/legal/terminos",
    "/legal/cookies",
    "/legal/uso-ia",
    "/contacto",
    "/settings",
    "/dashboard",
    "/admin",
    "/admin/publicidad",
    "/404",
  ])("never allows ads on %s", (path) => {
    expect(isAdAllowedOnPath(path)).toBe(false);
  });

  it.each(["/academy", "/academy/hoja-de-vida-ats-2026", "/tools/salario-neto", "/", "/empleos?q=ventas"])("allows ads on editorial/listing page %s", (path) => {
    expect(isAdAllowedOnPath(path)).toBe(true);
  });

  it("requires publisher, global switch, placement, consent and an allowed page", () => {
    const base = { placement: "tools-result" as const, pathname: "/tools/liquidacion", config: ENABLED, buildClientId: undefined, advertisingConsent: true, disabledByPage: false };
    expect(adEligibility(base)).toEqual({ eligible: true, client: PUBLISHER });
    expect(adEligibility({ ...base, disabledByPage: true }).reason).toBe("page");
    expect(adEligibility({ ...base, pathname: "/login" }).reason).toBe("path");
    expect(adEligibility({ ...base, config: { ...ENABLED, publisherId: null } }).reason).toBe("no-client");
    expect(adEligibility({ ...base, config: { ...ENABLED, enabled: false } }).reason).toBe("disabled");
    expect(adEligibility({ ...base, config: { ...ENABLED, placements: { ...ENABLED.placements, "tools-result": false } } }).reason).toBe("placement");
    expect(adEligibility({ ...base, advertisingConsent: false }).reason).toBe("consent");
    expect(adEligibility({ ...base, config: null }).reason).toBe("no-client");
    // The build-time publisher id is a fallback when the runtime config has none.
    expect(adEligibility({ ...base, config: { ...ENABLED, publisherId: null }, buildClientId: PUBLISHER }).eligible).toBe(true);
  });
});

describe("<AdSlot />", () => {
  beforeEach(() => {
    resetAdsConfigCache();
    sessionStorage.clear();
    document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0`;
    adsenseScripts().forEach((node) => node.remove());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the labelled unit with reserved height and loads AdSense only after consent", async () => {
    setup(ENABLED, "accepted");
    render(<AdSlot placement="academy-article" format="in-article" pathname="/academy/hoja-de-vida-ats-2026" />);
    const slot = await screen.findByRole("complementary", { name: "Publicidad" });
    expect(slot).toHaveTextContent("Publicidad");
    expect((slot.querySelector("ins") as HTMLElement).style.minHeight).toBe(`${AD_MIN_HEIGHT["in-article"]}px`);
    expect(slot.querySelector("ins")).toHaveAttribute("data-ad-client", PUBLISHER);
    await waitFor(() => expect(adsenseScripts()).toHaveLength(1));
  });

  it("collapses completely and never loads adsbygoogle.js without advertising consent", async () => {
    setup(ENABLED, "rejected");
    const { container } = render(<AdSlot placement="academy-article" pathname="/academy/hoja-de-vida-ats-2026" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(adsenseScripts()).toHaveLength(0);
  });

  it("collapses when no decision has been made yet", async () => {
    setup(ENABLED, "none");
    const { container } = render(<AdSlot placement="tools-result" pathname="/tools/salario-neto" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(adsenseScripts()).toHaveLength(0);
  });

  it("collapses on excluded pages even with consent", async () => {
    setup(ENABLED, "accepted");
    const { container } = render(<AdSlot placement="tools-result" pathname="/login" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(adsenseScripts()).toHaveLength(0);
  });

  it("collapses inside <NoAds> (legal, contact and error pages)", async () => {
    setup(ENABLED, "accepted");
    const { container } = render(
      <NoAds>
        <AdSlot placement="academy-article" pathname="/academy/x" />
      </NoAds>,
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("collapses when ProAdmin turned ads off or there is no publisher id", async () => {
    setup({ ...ENABLED, enabled: false }, "accepted");
    const off = render(<AdSlot placement="jobs-listing" pathname="/" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(off.container).toBeEmptyDOMElement();
    off.unmount();

    resetAdsConfigCache();
    setup({ ...ENABLED, publisherId: null }, "accepted");
    const missing = render(<AdSlot placement="jobs-listing" pathname="/" />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(missing.container).toBeEmptyDOMElement();
    expect(adsenseScripts()).toHaveLength(0);
  });

  it("collapses when AdSense reports the unit as unfilled", async () => {
    setup(ENABLED, "accepted");
    const { container } = render(<AdSlot placement="academy-index" format="leaderboard" pathname="/academy" />);
    const ins = (await screen.findByRole("complementary", { name: "Publicidad" })).querySelector("ins")!;
    ins.setAttribute("data-ad-status", "unfilled");
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
