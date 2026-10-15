import React from "react";
import { Megaphone } from "lucide-react";
import { ADSENSE_CLIENT } from "./links.js";
import { cn } from "./utils.js";
import { useAdSensePush, useAdSenseScript } from "./useAdSense.js";

export type AdFormat = "leaderboard" | "in-feed" | "rectangle" | "native" | "auto";

interface AdSlotProps {
  /** Identificador logico del emplazamiento (analitica/depuracion). */
  placement?: string;
  /** ID de bloque de AdSense (data-ad-slot). Sin el, AdSense usa anuncios automaticos. */
  slot?: string;
  format?: AdFormat;
  className?: string;
}

/**
 * Bloque de anuncio unificado del ecosistema.
 * Renderiza el <ins> real de Google AdSense con el cliente del ecosistema
 * (VITE_ADSENSE_CLIENT, por defecto ca-pub-3956322934366702).
 */
export function AdSlot({ placement = "default", slot, format = "auto", className }: AdSlotProps) {
  const client = ADSENSE_CLIENT;
  useAdSenseScript(client);
  useAdSensePush(true);

  if (client) {
    return (
      <ins
        className={cn("adsbygoogle block", className)}
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
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
      data-ad-format={format}
      className={cn(
        "flex min-h-[90px] items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-slate-100/50 px-6 py-8 text-center dark:border-slate-600/70 dark:bg-slate-800/30",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1.5">
        <Megaphone className="h-5 w-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Espacio publicitario
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Google AdSense &middot; {placement} &middot; {format}
        </p>
      </div>
    </div>
  );
}
