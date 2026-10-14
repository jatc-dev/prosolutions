import React, { useMemo, useState } from "react";
import {
  applyTemplateColorSelection,
  getCurrentTemplateColor,
  getTemplateColorOptions,
  TemplateVisualSettings,
} from "../../../../shared/utils/templateColorPresets";

interface TemplateColorCustomizerProps {
  template: string;
  settings?: TemplateVisualSettings;
  onChange: (nextSettings: TemplateVisualSettings) => void;
}

const TEMPLATE_LABELS: Record<string, string> = {
  sidebar: "panel lateral",
  developer: "fondo developer",
  creative: "degradados creativa",
  executive: "top ejecutiva",
  extensa: "cabecera extensa",
};

function normalizeHex(value: string): string {
  const raw = String(value || "").trim();
  const match = raw.match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : "#0f172a";
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex).replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function recommendedText(hex: string): "light" | "dark" {
  const whiteRatio = contrastRatio(hex, "#ffffff");
  const blackRatio = contrastRatio(hex, "#000000");
  return whiteRatio >= blackRatio ? "light" : "dark";
}

function getWcagStatus(bgHex: string) {
  const whiteRatio = contrastRatio(bgHex, "#ffffff");
  const blackRatio = contrastRatio(bgHex, "#000000");
  const selectedText = whiteRatio >= blackRatio ? "#ffffff" : "#000000";
  const ratio = Math.max(whiteRatio, blackRatio);

  return {
    selectedText,
    ratio,
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
  };
}

function autoExecutiveAccent(hex: string): string {
  return recommendedText(hex) === "light" ? "#93c5fd" : "#1d4ed8";
}

function extractFirstHexFromGradient(gradient: string): string {
  const match = String(gradient || "").match(/#([0-9a-fA-F]{6})/);
  return match ? `#${match[1]}` : "#3730a3";
}

export function TemplateColorCustomizer({ template, settings, onChange }: TemplateColorCustomizerProps) {
  const options = getTemplateColorOptions(template);
  if (options.length === 0) {
    return null;
  }

  const active = getCurrentTemplateColor(template, settings);
  const [customColor, setCustomColor] = useState(() => {
    if (template === "sidebar") return normalizeHex(settings?.sidebarBg || "#0f172a");
    if (template === "developer") return normalizeHex(settings?.developerBg || "#0f172a");
    if (template === "executive") return normalizeHex(settings?.executiveTop || "#0f172a");
    if (template === "extensa") return normalizeHex(settings?.extensaTop || "#0f172a");
    return "#0f172a";
  });
  const [creativeStart, setCreativeStart] = useState(() => normalizeHex(extractFirstHexFromGradient(settings?.creativeGradient || "")));
  const [creativeEnd, setCreativeEnd] = useState("#0f172a");

  const contrastHint = useMemo(() => {
    if (template === "creative") {
      return recommendedText(creativeStart) === "light" ? "Texto claro recomendado" : "Texto oscuro recomendado";
    }
    if (template === "sidebar" || template === "developer" || template === "executive" || template === "extensa") {
      return recommendedText(customColor) === "light" ? "Texto claro recomendado" : "Texto oscuro recomendado";
    }
    return "";
  }, [template, customColor, creativeStart]);

  const wcagInfo = useMemo(() => {
    const sample = template === "creative" ? creativeStart : customColor;
    return getWcagStatus(sample);
  }, [template, customColor, creativeStart]);

  const applyCustom = () => {
    if (template === "sidebar") {
      onChange({ ...(settings || {}), sidebarBg: customColor });
      return;
    }
    if (template === "developer") {
      onChange({ ...(settings || {}), developerBg: customColor });
      return;
    }
    if (template === "executive") {
      onChange({ ...(settings || {}), executiveTop: customColor, executiveAccent: autoExecutiveAccent(customColor) });
      return;
    }
    if (template === "extensa") {
      onChange({ ...(settings || {}), extensaTop: customColor, extensaAccent: autoExecutiveAccent(customColor) });
      return;
    }
    if (template === "creative") {
      const gradient = `linear-gradient(135deg, ${creativeStart} 0%, ${creativeEnd} 55%, #111827 100%)`;
      onChange({ ...(settings || {}), creativeGradient: gradient });
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Personalizar colores</h4>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Selecciona un color para {TEMPLATE_LABELS[template] || "la plantilla"}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
        {options.map((option) => {
          const isActive = option.value === active;
          const previewStyle = option.mode === "gradient"
            ? { backgroundImage: option.value }
            : { backgroundColor: option.value };

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(applyTemplateColorSelection(template, option, settings))}
              className={`rounded-md border p-1.5 text-left transition-colors ${
                isActive
                  ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              <span className="mb-1 block h-5 rounded-sm" style={previewStyle} />
              <span className="block truncate text-[10px] font-medium text-slate-700 dark:text-slate-200" title={option.label}>{option.label}</span>
            </button>
          );
        })}
      </div>

      {template === "creative" ? (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Intensidad del degradado</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "soft", label: "Suave" },
              { value: "medium", label: "Medio" },
              { value: "strong", label: "Fuerte" },
            ] as const).map((item) => {
              const activeIntensity = settings?.creativeIntensity || "medium";
              const isActive = activeIntensity === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChange({ ...(settings || {}), creativeIntensity: item.value })}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {template === "extensa" ? (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Densidad de plantilla</p>
          <div className="flex flex-wrap gap-2">
            {([
              { value: "normal", label: "Normal" },
              { value: "compact", label: "Compacta (Extensa Pro)" },
            ] as const).map((item) => {
              const activeDensity = settings?.extensaDensity || "normal";
              const isActive = activeDensity === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChange({ ...(settings || {}), extensaDensity: item.value })}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
        <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Color personalizado</p>
        {template === "creative" ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Inicio
              <input
                type="color"
                value={creativeStart}
                onChange={(event) => setCreativeStart(event.target.value)}
                className="ml-2 h-8 w-10 rounded border border-slate-300 bg-transparent"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Medio
              <input
                type="color"
                value={creativeEnd}
                onChange={(event) => setCreativeEnd(event.target.value)}
                className="ml-2 h-8 w-10 rounded border border-slate-300 bg-transparent"
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(event) => setCustomColor(event.target.value)}
              className="h-9 w-12 rounded border border-slate-300 bg-transparent"
            />
            <span className="text-xs text-slate-500 dark:text-slate-300">{customColor}</span>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={applyCustom}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Aplicar personalizado
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-300">{contrastHint}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-600 dark:border-slate-600 dark:text-slate-300">
            Ratio {wcagInfo.ratio.toFixed(2)}:1
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              wcagInfo.aa
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-100"
            }`}
          >
            AA {wcagInfo.aa ? "OK" : "NO"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              wcagInfo.aaa
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100"
            }`}
          >
            AAA {wcagInfo.aaa ? "OK" : "NO"}
          </span>
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-600 dark:border-slate-600 dark:text-slate-300">
            Texto sugerido {wcagInfo.selectedText === "#ffffff" ? "claro" : "oscuro"}
          </span>
        </div>
      </div>
    </div>
  );
}
