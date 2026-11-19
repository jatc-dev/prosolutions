export { ProHeader, type ActiveApp } from "./ProHeader.js";
export { ProFooter } from "./ProFooter.js";
export { ProSolutionsLogo } from "./ProSolutionsLogo.js";
export { AdSlot, NoAds, type AdFormat, type AdPlacement } from "./AdSlot.js";
export { ConsentBanner } from "./ConsentBanner.js";
export { CONSENT_COOKIE, consentCookieString, hasAdvertisingConsent, openConsentPreferences, parseConsent, readConsent, serializeConsent, useConsent, writeConsent, type ConsentState } from "./consent.js";
export { AD_MIN_HEIGHT, AD_PLACEMENTS, ADS_DISABLED, adEligibility, isAdAllowedOnPath, normalizePublisherId, type AdsConfig } from "./adsPolicy.js";
export { loadAdsConfig, resetAdsConfigCache, sanitizeAdsConfig, useAdsConfig } from "./adsConfig.js";
export { useTheme } from "./useTheme.js";
export { useAdSensePush, useAdSenseScript } from "./useAdSense.js";
export { ADSENSE_CLIENT, APP_URLS, IDENTITY_ORIGIN, JATC_URL, LEGAL_URLS, PRIVACY_URL, RESOURCE_URLS, TERMS_URL, isExternalUrl, normalizeAdSenseClient } from "./links.js";

// Primitivos de UI
export { Button } from "./components/Button.js";
export type { ButtonVariant, ButtonSize } from "./components/Button.js";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./components/Card.js";
export { Badge } from "./components/Badge.js";
export type { BadgeVariant } from "./components/Badge.js";
export { Container } from "./components/Container.js";
export { Input } from "./components/Input.js";
export type { InputProps } from "./components/Input.js";
export { Select } from "./components/Select.js";
export type { SelectProps } from "./components/Select.js";

// Utilidades
export { cn } from "./utils.js";

// Tokens de diseño
export { tokens } from "./tokens.js";
export type { BrandStep, NeutralStep, SemanticToken, TokenRadius } from "./tokens.js";
