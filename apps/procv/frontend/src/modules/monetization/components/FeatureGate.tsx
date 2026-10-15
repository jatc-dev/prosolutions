import React from "react";
import { Lock } from "lucide-react";
import { useEntitlements } from "../../../shared/feature-flags";

interface FeatureGateProps {
  featureKey: string;
  /** Rendered when the feature is locked: "lock" (default) shows a lock notice, "hide" renders nothing. */
  fallback?: "lock" | "hide";
  origin?: string;
  children: React.ReactNode;
}

/** Renders children only when the current user is entitled to the feature. */
export function FeatureGate({ featureKey, fallback = "lock", origin, children }: FeatureGateProps) {
  const { can } = useEntitlements();

  if (can(featureKey)) {
    return <>{children}</>;
  }

  if (fallback === "hide") {
    return null;
  }

  return (
    <div
      data-feature-locked={featureKey}
      data-lock-origin={origin}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400"
    >
      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      Requiere plan Premium
    </div>
  );
}
