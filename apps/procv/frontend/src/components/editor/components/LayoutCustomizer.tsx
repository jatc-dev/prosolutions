import React from "react";
import { useTranslation } from "react-i18next";

interface LayoutCustomizerProps {
  settings: {
    density?: "compact" | "balanced" | "spacious";
    sectionSpacing?: number;
    showSectionIcons?: boolean;
  };
  onChange: (settings: Partial<LayoutCustomizerProps["settings"]>) => void;
}

export function LayoutCustomizer({ settings, onChange }: LayoutCustomizerProps) {
  const { t } = useTranslation();

  const densities = [
    { value: "compact", label: t("layout.compact", "Compacto"), desc: t("layout.compactDesc", "Máximo espacio") },
    { value: "balanced", label: t("layout.balanced", "Equilibrado"), desc: t("layout.balancedDesc", "Estándar") },
    { value: "spacious", label: t("layout.spacious", "Espacioso"), desc: t("layout.spaciousDesc", "Más aire") },
  ];

  return (
    <div className="space-y-4">
      {/* Densidad */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          {t("layout.density", "Densidad del CV")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {densities.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onChange({ density: d.value as "compact" | "balanced" | "spacious" })}
              className={`p-2 rounded-lg border-2 text-left transition-all duration-150 ${
                settings.density === d.value
                  ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
            >
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {d.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {d.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Espaciado de secciones */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          {t("layout.sectionSpacing", "Espaciado entre secciones")}: {settings.sectionSpacing || 2}
        </label>
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={settings.sectionSpacing ?? 2}
          onChange={(e) => onChange({ sectionSpacing: Number(e.target.value) })}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          <span>{t("layout.tight", "Cerrado")}</span>
          <span>{t("layout.wide", "Ancho")}</span>
        </div>
      </div>

      {/* Mostrar íconos de sección */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {t("layout.showSectionIcons", "Mostrar íconos de sección")}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={settings.showSectionIcons ?? true}
          onClick={() => onChange({ showSectionIcons: !(settings.showSectionIcons ?? true) })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.showSectionIcons ?? true ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.showSectionIcons ?? true ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}