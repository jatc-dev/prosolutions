/**
 * The CV fonts: one per typographic family, so every choice looks clearly
 * different (with "Según la plantilla" they make six options). All are bundled (Fontsource variable fonts), which also
 * keeps them in the PDF export (html2pdf captures the rendered page).
 */
import "@fontsource-variable/montserrat";
import "@fontsource-variable/nunito";
import "@fontsource-variable/merriweather";
import "@fontsource-variable/playfair-display";
// Inter is already loaded globally in styles.css.

export interface CvFont {
  value: string;
  label: string;
  /** Short description shown under the sample. */
  style: string;
  family: string;
}

/** Keeps each template's own typography (serif for "Clásica", Arial for the 1003…). */
export const TEMPLATE_FONT = "template";

export const CV_FONTS: CvFont[] = [
  { value: "inter-sans", label: "Inter", style: "Moderna", family: "'Inter Variable', Inter, system-ui, sans-serif" },
  { value: "montserrat", label: "Montserrat", style: "Geométrica", family: "'Montserrat Variable', Montserrat, system-ui, sans-serif" },
  { value: "nunito", label: "Nunito", style: "Redondeada", family: "'Nunito Variable', Nunito, system-ui, sans-serif" },
  { value: "merriweather", label: "Merriweather", style: "Clásica", family: "'Merriweather Variable', Merriweather, Georgia, serif" },
  { value: "playfair", label: "Playfair Display", style: "Elegante", family: "'Playfair Display Variable', 'Playfair Display', Georgia, serif" },
];

/**
 * Keys offered before the list was reduced. "inter" was the silent default
 * of every CV, so it means "keep the template's font"; the rest were explicit
 * choices and map to the closest current font.
 */
const LEGACY_FONTS: Record<string, string> = {
  inter: TEMPLATE_FONT,
  roboto: "inter-sans",
  lato: "inter-sans",
  "open-sans": "inter-sans",
  "source-sans": "inter-sans",
  system: "inter-sans",
  jetbrains: "inter-sans",
  raleigh: "montserrat",
  poppins: "montserrat",
  // Removed: too close to Merriweather.
  "roboto-slab": "merriweather",
};

/** Normalizes a stored font key (including legacy keys) to TEMPLATE_FONT or one of CV_FONTS. */
export function normalizeCvFont(value?: string): string {
  if (!value || value === TEMPLATE_FONT) return TEMPLATE_FONT;
  if (CV_FONTS.some((font) => font.value === value)) return value;
  return LEGACY_FONTS[value] ?? TEMPLATE_FONT;
}

/** CSS font-family stack for a stored key, or null when the template's font applies. */
export function cvFontFamily(value?: string): string | null {
  const key = normalizeCvFont(value);
  return CV_FONTS.find((font) => font.value === key)?.family ?? null;
}

/** Font size steps offered for headings and body text (1 = the template's size). */
export const FONT_SCALE_STEPS = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2] as const;

/** Normalizes a stored font scale to one of FONT_SCALE_STEPS (1 when missing or invalid). */
export function normalizeFontScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return FONT_SCALE_STEPS.reduce((best, step) => (Math.abs(step - value) < Math.abs(best - value) ? step : best), 1);
}
