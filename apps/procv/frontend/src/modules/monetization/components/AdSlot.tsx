import React from "react";
import { Megaphone } from "lucide-react";

interface AdSlotProps {
  placement: string;
  className?: string;
}

/** In-feed ad placeholder. Render the AdSense <ins> here once the account is approved. */
export function AdSlot({ placement, className = "" }: AdSlotProps) {
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
