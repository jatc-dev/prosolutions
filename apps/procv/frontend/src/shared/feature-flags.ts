import { useAuthStore } from "../stores/authStore";

export interface Entitlements {
  isPremium: boolean;
  /** Feature keys gated behind a plan. Unknown keys are allowed by default. */
  can: (featureKey: string) => boolean;
}

const PREMIUM_FEATURES = new Set(["platform_no_ads", "projobs_job_alerts", "procv_premium_templates"]);

export function useEntitlements(): Entitlements {
  const user = useAuthStore((state) => state.user);
  const profile = user as (typeof user & { plan?: string; isPremium?: boolean }) | null;
  const isPremium = Boolean(
    profile && (profile.isPremium === true || profile.plan === "premium" || profile.role === "admin")
  );

  const can = (featureKey: string) => (PREMIUM_FEATURES.has(featureKey) ? isPremium : true);

  return { isPremium, can };
}
