import React from "react";
import { ADSENSE_CLIENT, useAdSensePush, useAdSenseScript } from "@prosolutions/ui";

interface AdSlotProps {
  placement: string;
  /** ID de bloque de AdSense (data-ad-slot). */
  slot?: string;
  className?: string;
}

/** In-feed ad placeholder. Usa el cliente AdSense del ecosistema (ca-pub-3956322934366702 por defecto). */
export function AdSlot({ placement, slot, className = "" }: AdSlotProps) {
  const client = ADSENSE_CLIENT;

  // Advertising follows AdSense configuration; the shared hooks still control loading.
  useAdSenseScript(client);
  useAdSensePush(Boolean(slot));

  // Most placements currently have no AdSense ad-unit ID. Do not render an empty <ins>:
  // the global script in index.html handles Auto ads, while manual units need a real slot ID.
  if (!client || !slot) return null;

  return (
    <ins
      className={`adsbygoogle block ${className}`}
      style={{ display: "block", minHeight: "90px" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-ad-placement={placement}
    />
  );
}
