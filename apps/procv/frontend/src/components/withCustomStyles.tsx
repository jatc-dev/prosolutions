import React from "react";
import { TemplateRenderer } from "./TemplateRenderer";
import { CVData as RendererCVData } from "./TemplateRenderer";

interface WithCustomStylesProps {
  template: string;
  data: RendererCVData;
}

export function WithCustomStyles({ template, data }: WithCustomStylesProps) {
  const s = (data as any).settings || {};

  const cssVars: any = {
    // Fuentes
    "--font-body": s.fontBody
      ? `"${s.fontBody}", system-ui, sans-serif`
      : "system-ui, sans-serif",
    "--font-heading": s.fontHeading
      ? `"${s.fontHeading}", system-ui, sans-serif`
      : "system-ui, sans-serif",
    // Colores
    "--color-accent": s.accentColor || "#3b82f6",
    "--color-heading": s.headingColor || "#0f172a",
    "--color-text": s.textColor || "#1e293b",
    "--color-muted": s.mutedTextColor || "#64748b",
    "--color-link": s.linkColor || "#2563eb",
    "--color-sidebar-text": s.sidebarTextColor || "#e2e8f0",
    "--color-sidebar-section": s.sidebarSectionTitleColor || "#f1f5f9",
    // Densidad
    "--density": s.density || "balanced",
    "--section-spacing": String(s.sectionSpacing ?? 2),
  };

  // Clases de densidad
  const densityClass =
    s.density === "compact" ? "density-compact"
    : s.density === "spacious" ? "density-spacious"
    : "density-balanced";

  return (
    <div
      className={`cv-custom-wrapper ${densityClass}`}
      style={cssVars}
    >
      <TemplateRenderer template={template} data={data} />
    </div>
  );
}