import { useEffect, useState } from "react";
import { ADS_DISABLED, AD_PLACEMENTS, normalizePublisherId, type AdsConfig } from "./adsPolicy.js";
import { IDENTITY_ORIGIN } from "./links.js";

/**
 * Runtime advertising configuration managed in ProAdmin (global switch,
 * publisher id and active placements), served publicly by ProIdentity.
 * Any failure means "no ads": the slot collapses instead of breaking.
 */
const CACHE_KEY = "ps_ads_config_v1";
let pending: Promise<AdsConfig> | null = null;

export function sanitizeAdsConfig(value: unknown): AdsConfig {
  if (!value || typeof value !== "object") return ADS_DISABLED;
  const raw = value as { enabled?: unknown; publisherId?: unknown; placements?: unknown };
  const placements = { ...ADS_DISABLED.placements };
  if (raw.placements && typeof raw.placements === "object") {
    for (const placement of AD_PLACEMENTS) {
      placements[placement] = (raw.placements as Record<string, unknown>)[placement] === true;
    }
  }
  return {
    enabled: raw.enabled === true,
    publisherId: normalizePublisherId(typeof raw.publisherId === "string" ? raw.publisherId : null),
    placements,
  };
}

function readCached(): AdsConfig | null {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(CACHE_KEY) : null;
    return raw ? sanitizeAdsConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function loadAdsConfig(fetchImpl: typeof fetch = fetch): Promise<AdsConfig> {
  if (!pending) {
    pending = fetchImpl(`${IDENTITY_ORIGIN}/api/public/platform/ads`, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const config = sanitizeAdsConfig(body?.ads ?? body);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(config));
        } catch {
          /* storage unavailable */
        }
        return config;
      })
      .catch(() => ADS_DISABLED);
  }
  return pending;
}

/** Test hook. */
export function resetAdsConfigCache(): void {
  pending = null;
}

export function useAdsConfig(): AdsConfig | null {
  const [config, setConfig] = useState<AdsConfig | null>(() => readCached());
  useEffect(() => {
    let active = true;
    void loadAdsConfig().then((next) => {
      if (active) setConfig(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return config;
}
