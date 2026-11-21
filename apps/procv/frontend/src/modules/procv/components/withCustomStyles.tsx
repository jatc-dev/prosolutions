import React from "react";
import { TemplateRenderer } from "./TemplateRenderer";
import { CVData as RendererCVData } from "./TemplateRenderer";
import { cvFontFamily } from "../fonts";

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
export function CustomStylesWrapper({ settings, children }: { settings: unknown; children: React.ReactNode }) {
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
  if (spacing !== DEFAULT_SECTION_SPACING) {
    cssVars["--section-spacing"] = String(spacing);
    classes.push("cv-spacing-custom");
  }
  classes.push(s.density === "compact" ? "density-compact" : s.density === "spacious" ? "density-spacious" : "density-balanced");

  return (
    <div className={classes.join(" ")} style={cssVars as React.CSSProperties}>
      {children}
    </div>
  );
}

export function WithCustomStyles({ template, data }: WithCustomStylesProps) {
  return (
    <CustomStylesWrapper settings={data.settings}>
      <TemplateRenderer template={template} data={data} />
    </CustomStylesWrapper>
  );
}
