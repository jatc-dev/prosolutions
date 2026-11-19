/**
 * Design tokens of the ProSolutions ecosystem.
 *
 * The values live in tokens.json (single source of truth). theme.css and the
 * Tailwind preset (tailwind-preset.js) are generated from / read that file, so
 * components, CSS and Tailwind classes can never drift apart.
 */
import data from "./tokens.json";

export const tokens = {
  palette: data.palette,
  semantic: data.semantic,
  themeColor: data.themeColor,
  font: data.font,
  radius: data.radius,
  motion: data.motion,
} as const;

export type BrandStep = keyof typeof data.palette.brand;
export type NeutralStep = keyof typeof data.palette.neutral;
export type SemanticToken = keyof typeof data.semantic.light;
export type TokenRadius = keyof typeof data.radius;
