import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AD_MIN_HEIGHT, adEligibility, type AdFormat, type AdPlacement } from "./adsPolicy.js";
import { useAdsConfig } from "./adsConfig.js";
import { hasAdvertisingConsent, useConsent } from "./consent.js";
import { ADSENSE_CLIENT } from "./links.js";
import { cn } from "./utils.js";
import { useAdSensePush, useAdSenseScript } from "./useAdSense.js";

/** Pages that must never show ads (errors, legal, auth...) wrap their content in <NoAds>. */
const NoAdsContext = createContext(false);

export function NoAds({ children }: { children: React.ReactNode }) {
  return <NoAdsContext.Provider value={true}>{children}</NoAdsContext.Provider>;
}

interface AdSlotProps {
  /** Editorial or listing zone; each one can be switched off in ProAdmin. */
  placement: AdPlacement;
  format?: AdFormat;
  /** AdSense ad unit id (data-ad-slot). Optional with Auto ads. */
  slot?: string;
  /** Overrides the current path (tests, server rendering). */
  pathname?: string;
  className?: string;
}

/**
 * Google AdSense unit with the platform's guardrails:
 *  - renders nothing (no placeholder, no empty box) unless every condition
 *    holds: publisher id, global switch, placement on, advertising consent,
 *    and an allowed page;
 *  - reserves the format's height up front so loading never shifts content;
 *  - is always labelled "Publicidad";
 *  - collapses if AdSense reports the slot as unfilled.
 */
export function AdSlot({ placement, format = "in-article", slot, pathname, className }: AdSlotProps) {
  const disabledByPage = useContext(NoAdsContext);
  const { consent } = useConsent();
  const config = useAdsConfig();
  const insRef = useRef<HTMLModElement>(null);
  const [unfilled, setUnfilled] = useState(false);

  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const { eligible, client } = adEligibility({
    placement,
    pathname: path,
    config,
    buildClientId: ADSENSE_CLIENT,
    advertisingConsent: hasAdvertisingConsent(consent),
    disabledByPage,
  });

  useAdSenseScript(eligible ? client ?? undefined : undefined);
  useAdSensePush(eligible && !unfilled);

  useEffect(() => {
    const node = insRef.current;
    if (!eligible || !node || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      if (node.getAttribute("data-ad-status") === "unfilled") setUnfilled(true);
    });
    observer.observe(node, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => observer.disconnect();
  }, [eligible]);

  if (!eligible || !client || unfilled) return null;

  return (
    <aside aria-label="Publicidad" data-ad-placement={placement} className={cn("my-8", className)}>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ui-subtle">Publicidad</p>
      <div style={{ minHeight: AD_MIN_HEIGHT[format] }} className="w-full overflow-hidden">
        <ins
          ref={insRef}
          className="adsbygoogle block"
          style={{ display: "block", minHeight: AD_MIN_HEIGHT[format] }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format === "in-article" ? "fluid" : "auto"}
          data-ad-layout={format === "in-article" ? "in-article" : undefined}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}

export type { AdFormat, AdPlacement };
