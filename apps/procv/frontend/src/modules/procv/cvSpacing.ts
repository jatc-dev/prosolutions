/**
 * Vertical spacing of the CV ("Densidad" and "Espaciado entre secciones").
 *
 * Density scales every vertical margin, padding and gap of the templates
 * (see styles/cv-spacing.css) and, at the ends of the scale, the line height
 * of paragraphs and bullets. It is the main tool to make a CV fit on one page
 * when a section spills onto the next one.
 *
 * Section spacing is the extra room above each section title
 * ([data-cv-section-title]), also scaled by the density.
 */
export type CvDensity = "tight" | "compact" | "balanced" | "spacious" | "airy";

export const CV_DENSITIES: Array<{ value: CvDensity; label: string; hint: string; space: number; leading: number | null }> = [
  { value: "tight", label: "Muy compacto", hint: "Para que todo quepa en menos páginas", space: 0.45, leading: 1.3 },
  { value: "compact", label: "Compacto", hint: "Menos espacio entre bloques", space: 0.7, leading: 1.4 },
  { value: "balanced", label: "Normal", hint: "El diseño de la plantilla", space: 1, leading: null },
  { value: "spacious", label: "Amplio", hint: "Más aire entre bloques", space: 1.3, leading: 1.6 },
  { value: "airy", label: "Muy amplio", hint: "Para hojas de vida cortas", space: 1.6, leading: 1.7 },
];

export const DEFAULT_DENSITY: CvDensity = "balanced";

export function normalizeDensity(value: unknown): CvDensity {
  return CV_DENSITIES.some((item) => item.value === value) ? (value as CvDensity) : DEFAULT_DENSITY;
}

export function densityConfig(value: unknown) {
  return CV_DENSITIES.find((item) => item.value === normalizeDensity(value))!;
}

/** Room above section titles, in rem, for each step of the slider. */
export const SECTION_SPACING_STEPS = [0, 0.375, 0.75, 1.25, 1.75, 2.5, 3.25];
export const DEFAULT_SECTION_SPACING = 2;
export const MAX_SECTION_SPACING = SECTION_SPACING_STEPS.length - 1;

export function normalizeSectionSpacing(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SECTION_SPACING;
  return Math.min(MAX_SECTION_SPACING, Math.max(0, Math.round(value)));
}

/** CSS length of the room above section titles for these settings. */
export function sectionTitleGap(spacing: unknown, density: unknown): string {
  const rem = SECTION_SPACING_STEPS[normalizeSectionSpacing(spacing)] * densityConfig(density).space;
  return `${Math.round(rem * 1000) / 1000}rem`;
}
