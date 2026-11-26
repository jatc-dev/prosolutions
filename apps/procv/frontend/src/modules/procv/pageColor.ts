/**
 * Page (paper) colour of the CV ("Color de página" in Personalizar → Colores).
 * Applied in the preview, the PDF (margins included) and the Word file.
 * Templates with their own background (Contraste, Creativa) and the official
 * forms (1003, DAFP) keep theirs.
 */
export const PAGE_COLOR_EXCLUDED = new Set(["developer", "creative", "employment", "dafp"]);

export const PAGE_COLOR_PRESETS: Array<{ value: string; label: string }> = [
  { value: "#ffffff", label: "Blanco" },
  { value: "#fffdf7", label: "Marfil" },
  { value: "#fbf6ec", label: "Crema" },
  { value: "#f7f4ee", label: "Arena" },
  { value: "#f5f6f8", label: "Gris perla" },
  { value: "#f2f7fc", label: "Azul hielo" },
  { value: "#f1f9f5", label: "Verde menta" },
  { value: "#fcf3f4", label: "Rosa suave" },
];

const HEX = /^#([0-9a-f]{6})$/i;

/** Relative luminance (0 black – 1 white). */
export function luminance(hex: string): number {
  const match = HEX.exec(hex.trim());
  if (!match) return 1;
  const channel = (index: number) => {
    const value = parseInt(match[1].slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Below this the templates' dark text gets hard to read. */
export const MIN_PAGE_LUMINANCE = 0.6;

/** The page colour to use for this template, or null for plain white / the template's own. */
export function pageColorFor(template: string | undefined, settings: unknown): string | null {
  const value = String((settings as { pageColor?: unknown } | undefined)?.pageColor || "").trim().toLowerCase();
  if (!HEX.test(value) || value === "#ffffff") return null;
  if (template && PAGE_COLOR_EXCLUDED.has(template)) return null;
  return value;
}
