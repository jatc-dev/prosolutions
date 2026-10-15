import React from "react";
import { ADSENSE_CLIENT, useAdSensePush, useAdSenseScript } from "@prosolutions/ui";
import { useEntitlements } from "../../../shared/feature-flags";

interface AdSlotProps {
  placement: string;
  /** ID de bloque de AdSense (data-ad-slot). */
  slot?: string;
  className?: string;
}

/** In-feed ad placeholder. Usa el cliente AdSense del ecosistema (ca-pub-3956322934366702 por defecto). */
export function AdSlot({ placement, slot, className = "" }: AdSlotProps) {
  const client = ADSENSE_CLIENT;
  const { can } = useEntitlements();
  const shouldShowAds = !can("platform_no_ads");

  // Premium users (and admins) have the no-ads entitlement. Keep hooks unconditional,
  // but do not load the AdSense script or enqueue an ad request for those users.
  useAdSenseScript(shouldShowAds ? client : undefined);
  useAdSensePush(shouldShowAds && Boolean(slot));

  // Most placements currently have no AdSense ad-unit ID. Do not render an empty <ins>:
  // the global script in index.html handles Auto ads, while manual units need a real slot ID.
  if (!shouldShowAds || !client || !slot) return null;

  if (client) {
    return (
      <ins
        className={`adsbygoogle block ${className}`}
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-ad-placement={placement}
      />
    );
  }

  return (
    <div
      role="complementary"
      aria-label="Espacio publicitario"
      data-ad-placement={placement}
      className={`flex min-h-[90px] items-center justify-center rounded-card border border-dashed border-slate-300/80 bg-slate-100/50 px-6 py-6 text-center dark:border-slate-600/70 dark:bg-slate-800/30 ${className}`}
    >
      <div className="flex flex-col items-center gap-1">
        <Megaphone className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Espacio publicitario
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">Google AdSense &middot; {placement}</p>
      </div>
    </div>
  );
}
