import React from "react";
import { Megaphone } from "lucide-react";
import { useAdSensePush, useAdSenseScript } from "@prosolutions/ui";

interface AdSlotProps {
  placement: string;
  /** ID de bloque de AdSense (data-ad-slot). */
  slot?: string;
  className?: string;
}

const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/** In-feed ad placeholder. Con VITE_ADSENSE_CLIENT renderiza el bloque real de AdSense. */
export function AdSlot({ placement, slot, className = "" }: AdSlotProps) {
  const client = env.VITE_ADSENSE_CLIENT;
  useAdSenseScript(client);
  useAdSensePush(Boolean(client));

  if (client) {
    return (
      <ins
        className={`adsbygoogle block ${className}`}
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="fluid"
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
