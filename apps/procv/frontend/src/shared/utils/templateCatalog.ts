import { CURATED_CV_TEMPLATES as BASE_TEMPLATES, type CVTemplateOption as BaseTemplateOption } from "../../utils/templateCatalog";

/** Template option enriched with the monetization tier consumed by the modules layer. */
export interface CVTemplateOption extends BaseTemplateOption {
  tier: "free" | "premium";
}

const PREMIUM_KEYS = new Set(["executive", "extensa"]);

export const CURATED_CV_TEMPLATES: CVTemplateOption[] = BASE_TEMPLATES.map((template) => ({
  ...template,
  tier: template.category === "premium" || PREMIUM_KEYS.has(template.key) ? "premium" : "free",
}));

/** Templates available to guests (no account): ATS-friendly free designs. */
export const GUEST_FREE_TEMPLATES: ReadonlySet<string> = new Set([
  "minimal",
  "corporate",
  "developer",
  "classic",
  "compact",
  "timeline",
]);
