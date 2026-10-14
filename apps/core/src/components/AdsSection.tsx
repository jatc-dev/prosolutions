import { Megaphone } from "lucide-react";
import { cn } from "../lib/utils";

export type AdFormat = "leaderboard" | "in-feed" | "rectangle" | "native";

// Google AdSense integration: when your account is approved, render the
// <ins class="adsbygoogle"> element instead of this placeholder, e.g.:
//
//   <ins className="adsbygoogle" style={{ display: "block" }}
//        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="XXXXXXXXXX" />
//   <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
export function AdSlot({
  format = "leaderboard",
  className,
}: {
  format?: AdFormat;
  className?: string;
}) {
  return (
    <div
      role="complementary"
      aria-label="Espacio publicitario"
      data-ad-format={format}
      className={cn(
        "flex items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-slate-100/50 px-6 py-8 text-center transition-colors dark:border-slate-600/70 dark:bg-slate-800/30",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1.5">
        <Megaphone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          Espacio publicitario
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Banner Google AdSense &middot; formato {format}
        </p>
      </div>
    </div>
  );
}

export function AdsSection() {
  return (
    <section id="anuncios" aria-label="Espacios publicitarios" className="pb-4">
      <div className="ui-container space-y-6">
        <AdSlot format="leaderboard" className="min-h-[110px]" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <AdSlot format="in-feed" className="min-h-[140px]" />
          <AdSlot format="rectangle" className="min-h-[140px]" />
        </div>
      </div>
    </section>
  );
}
