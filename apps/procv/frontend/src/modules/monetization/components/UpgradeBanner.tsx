import React from "react";
import { Link } from "react-router-dom";
import { Crown, Sparkles } from "lucide-react";

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-600 to-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
      <Crown className="h-3 w-3" aria-hidden="true" />
      Premium
    </span>
  );
}

interface UpgradeBannerProps {
  /** Feature key shown in the upsell copy. */
  featureKey: string;
  className?: string;
}

/** Premium upsell banner gated by a feature key. */
export function UpgradeBanner({ featureKey, className = "" }: UpgradeBannerProps) {
  return (
    <aside
      data-upgrade-feature={featureKey}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/30 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Desbloquea ProSolutions Premium</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Esta función forma parte del plan Premium. Accede a plantillas ejecutivas, alertas de empleo y exportaciones
            avanzadas.
          </p>
        </div>
      </div>
      <Link
        to="/procv#premium"
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
      >
        Ver planes
      </Link>
    </aside>
  );
}
