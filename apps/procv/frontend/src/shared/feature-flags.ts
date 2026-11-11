export interface Entitlements {
  /** Commercial feature gates are retired; ad-free remains unavailable by entitlement. */
  can: (featureKey: string) => boolean;
}

const AVAILABLE_FEATURES = new Set(["projobs_job_alerts", "procv_templates_all"]);

export function useEntitlements(): Entitlements {
  const can = (featureKey: string) => AVAILABLE_FEATURES.has(featureKey);

  return { can };
}
