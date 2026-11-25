import React from "react";
import { TemplateRenderer } from "./TemplateRenderer";
import { CVData as RendererCVData } from "./TemplateRenderer";
import { cvFontFamily, normalizeFontScale } from "../fonts";

interface WithCustomStylesProps {
  template: string;
  data: RendererCVData;
}

type ColorKey = "accentColor" | "headingColor" | "textColor" | "mutedTextColor" | "linkColor" | "sidebarTextColor" | "sidebarSectionTitleColor";

/**
 * Colour settings: CSS variable, wrapper class, and the value every CV used to
 * store by default. A stored value equal to that old default (or empty) means
 * "not customized", so the template keeps its own palette.
 */
const COLOR_SETTINGS: Array<{ key: ColorKey; cssVar: string; className: string; legacyDefault: string }> = [
  { key: "accentColor", cssVar: "--color-accent", className: "cv-c-accent", legacyDefault: "#3b82f6" },
  { key: "headingColor", cssVar: "--color-heading", className: "cv-c-heading", legacyDefault: "#0f172a" },
  { key: "textColor", cssVar: "--color-text", className: "cv-c-text", legacyDefault: "#1e293b" },
  { key: "mutedTextColor", cssVar: "--color-muted", className: "cv-c-muted", legacyDefault: "#64748b" },
  { key: "linkColor", cssVar: "--color-link", className: "cv-c-link", legacyDefault: "#2563eb" },
  { key: "sidebarTextColor", cssVar: "--color-sidebar-text", className: "cv-c-sidebar-text", legacyDefault: "#e2e8f0" },
  { key: "sidebarSectionTitleColor", cssVar: "--color-sidebar-section", className: "cv-c-sidebar-section", legacyDefault: "#f1f5f9" },
];

const DEFAULT_SECTION_SPACING = 2;

/** True when a colour setting was changed by the user. */
export function isCustomColor(key: ColorKey, value?: string): boolean {
  const setting = COLOR_SETTINGS.find((item) => item.key === key);
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(setting && normalized && normalized !== setting.legacyDefault);
}

/**
 * Applies the user's fonts, colours and spacing (only those they changed) to
 * any CV document: the CV templates and the cover letter.
 */
/** Keeps a framing percentage within 0–100. */
const clampPercent = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null);

/** Photo zoom limits (1 = the photo fills its frame, no zoom). */
export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 2.5;
const clampZoom = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? Math.min(PHOTO_ZOOM_MAX, Math.max(PHOTO_ZOOM_MIN, value)) : null);

export function CustomStylesWrapper({ settings, photo, children }: { settings: unknown; photo?: { x?: number; y?: number; zoom?: number }; children: React.ReactNode }) {
  const s: Record<string, string | number | undefined> = (settings as Record<string, string | number | undefined>) || {};

  const bodyFont = cvFontFamily(s.fontBody as string | undefined);
  const headingFont = cvFontFamily(s.fontHeading as string | undefined);
  const spacing = typeof s.sectionSpacing === "number" ? s.sectionSpacing : DEFAULT_SECTION_SPACING;

  const cssVars: Record<string, string> = {};
  // ui-print: the CV is a printed page, so it keeps the standard neutral
  // palette even when the app is in dark mode.
  const classes = ["cv-custom-wrapper", "ui-print"];
  // Stored font values are keys ("merriweather"), not family names.
  if (bodyFont) {
    cssVars["--font-body"] = bodyFont;
    classes.push("cv-font-body-custom");
  }
  if (headingFont) {
    cssVars["--font-heading"] = headingFont;
    classes.push("cv-font-heading-custom");
  }
  for (const setting of COLOR_SETTINGS) {
    const value = s[setting.key] as string | undefined;
    if (isCustomColor(setting.key, value)) {
      cssVars[setting.cssVar] = value!;
      classes.push(setting.className);
    }
  }
  // Font sizes: templates size text with Tailwind classes (rem), so the CSS
  // rescales those classes; headings and body text have their own factor.
  const bodyScale = normalizeFontScale(s.fontScaleBody);
  const headingScale = normalizeFontScale(s.fontScaleHeading);
  if (bodyScale !== 1 || headingScale !== 1) {
    cssVars["--cv-body-scale"] = String(bodyScale);
    cssVars["--cv-heading-scale"] = String(headingScale);
    classes.push("cv-size-custom");
  }
  if (spacing !== DEFAULT_SECTION_SPACING) {
    cssVars["--section-spacing"] = String(spacing);
    classes.push("cv-spacing-custom");
  }
  classes.push(s.density === "compact" ? "density-compact" : s.density === "spacious" ? "density-spacious" : "density-balanced");
  const photoX = clampPercent(photo?.x);
  const photoY = clampPercent(photo?.y);
  if (photoX !== null) cssVars["--cv-photo-x"] = `${photoX}%`;
  if (photoY !== null) cssVars["--cv-photo-y"] = `${photoY}%`;
  const photoZoom = clampZoom(photo?.zoom);
  if (photoZoom !== null && photoZoom !== 1) cssVars["--cv-photo-zoom"] = String(photoZoom);

  return (
    <div className={classes.join(" ")} style={cssVars as React.CSSProperties}>
      {children}
    </div>
  );
}

export function WithCustomStyles({ template, data }: WithCustomStylesProps) {
  return (
    <CustomStylesWrapper settings={data.settings} photo={{ x: data.personal?.profileImagePositionX, y: data.personal?.profileImagePositionY, zoom: data.personal?.profileImageZoom }}>
      <TemplateRenderer template={template} data={data} />
    </CustomStylesWrapper>
  );
}
