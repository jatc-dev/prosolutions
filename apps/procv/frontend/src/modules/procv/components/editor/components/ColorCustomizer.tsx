import React from "react";
import { Check } from "lucide-react";
import { luminance, MIN_PAGE_LUMINANCE, PAGE_COLOR_EXCLUDED, PAGE_COLOR_PRESETS } from "../../../pageColor";

type Swatch = { value: string; label: string };

interface SwatchFieldProps {
  label: string;
  /** Stored value; undefined (or the old stored default) means the template's own colour. */
  value?: string;
  presets: Swatch[];
  onChange: (value: string | undefined) => void;
  /** Values that also mean "template's own colour" (old stored defaults). */
  templateValues?: string[];
  /** Offer a "Plantilla" swatch (the template's own colour). */
  templateOption?: boolean;
  hint?: React.ReactNode;
}

const ring = "border-brand-700 ring-2 ring-brand-700 ring-offset-1 dark:ring-offset-slate-900";

/** Which colour should the check mark use on top of this swatch. */
const checkColor = (hex: string) => (luminance(hex) > 0.45 ? "text-slate-900" : "text-white");

/**
 * One colour setting: suggested swatches, an optional "Plantilla" swatch
 * (keep the template's own colour) and "Otro" for any colour. Same look for
 * every colour in Personalizar → Colores.
 */
export function SwatchField({ label, value, presets, onChange, templateValues = [], templateOption = true, hint }: SwatchFieldProps) {
  const current = (value || "").toLowerCase();
  const isTemplate = !current || templateValues.includes(current);
  const id = `swatch-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <p id={id} className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-labelledby={id}>
        {templateOption ? (
          <button
            type="button"
            role="radio"
            aria-checked={isTemplate}
            aria-label="Color de la plantilla"
            title="Color de la plantilla"
            onClick={() => onChange(undefined)}
            className={`relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border bg-white text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300 ${isTemplate ? ring : "border-slate-300 dark:border-slate-600"}`}
          >
            {isTemplate ? <Check className="h-3.5 w-3.5 text-brand-800 dark:text-brand-300" aria-hidden="true" /> : "Aa"}
          </button>
        ) : null}
        {presets.map((preset) => {
          const selected = !isTemplate && current === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => onChange(preset.value)}
              className={`flex h-7 w-7 items-center justify-center rounded-full border ${selected ? ring : "border-slate-300 dark:border-slate-600"}`}
              style={{ backgroundColor: preset.value }}
            >
              {selected ? <Check className={`h-3.5 w-3.5 ${checkColor(preset.value)}`} aria-hidden="true" /> : null}
            </button>
          );
        })}
        {(() => {
          const custom = !isTemplate && !presets.some((preset) => preset.value === current);
          return (
            <label className="ml-0.5 inline-flex cursor-pointer items-center gap-1 text-xs text-slate-600 dark:text-slate-300" title="Otro color">
              <span className={`relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border ${custom ? ring : "border-slate-300 dark:border-slate-600"}`}
                style={{ background: custom ? current : "conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)" }}>
                {custom ? <Check className={`h-3.5 w-3.5 ${checkColor(current)}`} aria-hidden="true" /> : null}
                <input type="color" value={current || presets[0]?.value || "#000000"} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`Otro: ${label}`} />
              </span>
              Otro
            </label>
          );
        })()}
      </div>
      {hint ? <div className="mt-1">{hint}</div> : null}
    </div>
  );
}

interface ColorCustomizerProps {
  /** Current template: some keep their own page background; sidebar colours only apply to Panel lateral. */
  template?: string;
  settings: {
    pageColor?: string;
    accentColor?: string;
    headingColor?: string;
    textColor?: string;
    mutedTextColor?: string;
    linkColor?: string;
    sidebarTextColor?: string;
    sidebarSectionTitleColor?: string;
  };
  onChange: (settings: Partial<ColorCustomizerProps["settings"]>) => void;
}

// Suggested colours per role. Old CVs may have stored the previous defaults:
// those still mean "the template's own colour".
const ACCENTS: Swatch[] = [
  { value: "#047857", label: "Verde" }, { value: "#2563eb", label: "Azul" }, { value: "#4f46e5", label: "Índigo" },
  { value: "#7c3aed", label: "Morado" }, { value: "#be123c", label: "Rojo vino" }, { value: "#c2410c", label: "Naranja" },
];
const HEADINGS: Swatch[] = [
  { value: "#0f172a", label: "Negro azulado" }, { value: "#1e3a8a", label: "Azul marino" }, { value: "#064e3b", label: "Verde oscuro" },
  { value: "#4c1d95", label: "Morado oscuro" }, { value: "#7f1d1d", label: "Granate" }, { value: "#374151", label: "Gris carbón" },
];
const TEXTS: Swatch[] = [
  { value: "#111827", label: "Negro" }, { value: "#1e293b", label: "Pizarra" }, { value: "#374151", label: "Gris oscuro" }, { value: "#1e3a8a", label: "Azul marino" },
];
const MUTED: Swatch[] = [
  { value: "#475569", label: "Pizarra" }, { value: "#6b7280", label: "Gris" }, { value: "#78716c", label: "Piedra" }, { value: "#64748b", label: "Gris azulado" },
];
const LINKS: Swatch[] = [
  { value: "#2563eb", label: "Azul" }, { value: "#047857", label: "Verde" }, { value: "#7c3aed", label: "Morado" }, { value: "#0f172a", label: "Negro azulado" },
];
const SIDEBAR_TEXTS: Swatch[] = [
  { value: "#ffffff", label: "Blanco" }, { value: "#e2e8f0", label: "Gris claro" }, { value: "#fef3c7", label: "Crema" }, { value: "#0f172a", label: "Oscuro" },
];

/** "Color de página": light presets plus a free colour, with a legibility warning. */
function PageColorField({ template, value, onChange }: { template?: string; value?: string; onChange: (value: string | undefined) => void }) {
  if (template && PAGE_COLOR_EXCLUDED.has(template)) {
    return (
      <div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Color de página</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {template === "employment" || template === "dafp"
            ? "Los formatos oficiales se mantienen en blanco."
            : "Esta plantilla tiene su propio fondo; el color de página se aplica en las demás."}
        </p>
      </div>
    );
  }
  const current = (value || "#ffffff").toLowerCase();
  const tooDark = luminance(current) < MIN_PAGE_LUMINANCE;
  return (
    <SwatchField
      label="Color de página"
      value={value}
      presets={PAGE_COLOR_PRESETS}
      templateOption={false}
      templateValues={[]}
      onChange={(next) => onChange(!next || next === "#ffffff" ? undefined : next)}
      hint={tooDark ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          Este color es oscuro y el texto de la plantilla puede no leerse bien, sobre todo al imprimir. Prefiere un tono claro.
        </p>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">Se aplica a la hoja completa, también en el PDF y en Word. Los tonos claros se leen e imprimen mejor.</p>
      )}
    />
  );
}

export function ColorCustomizer({ template, settings, onChange }: ColorCustomizerProps) {
  // Blanco is the default page colour: show it selected when none is stored.
  const pageValue = settings.pageColor || "#ffffff";
  return (
    <div className="space-y-4">
      <PageColorField template={template} value={pageValue} onChange={(pageColor) => onChange({ pageColor })} />
      <div className="border-t border-slate-200 dark:border-slate-700" />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold">Aa</span> = el color propio de la plantilla.
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <SwatchField label="Color de acento" value={settings.accentColor} presets={ACCENTS} templateValues={["#3b82f6"]} onChange={(accentColor) => onChange({ accentColor })} />
        <SwatchField label="Títulos" value={settings.headingColor} presets={HEADINGS} templateValues={["#0f172a"]} onChange={(headingColor) => onChange({ headingColor })} />
        <SwatchField label="Texto" value={settings.textColor} presets={TEXTS} templateValues={["#1e293b"]} onChange={(textColor) => onChange({ textColor })} />
        <SwatchField label="Texto secundario" value={settings.mutedTextColor} presets={MUTED} templateValues={["#64748b"]} onChange={(mutedTextColor) => onChange({ mutedTextColor })} />
        <SwatchField label="Enlaces" value={settings.linkColor} presets={LINKS} templateValues={["#2563eb"]} onChange={(linkColor) => onChange({ linkColor })} />
        {/* The side-panel colours only exist in Panel lateral. */}
        {template === "sidebar" ? (
          <>
            <SwatchField label="Texto del panel" value={settings.sidebarTextColor} presets={SIDEBAR_TEXTS} templateValues={["#e2e8f0"]} onChange={(sidebarTextColor) => onChange({ sidebarTextColor })} />
            <SwatchField label="Títulos del panel" value={settings.sidebarSectionTitleColor} presets={SIDEBAR_TEXTS} templateValues={["#f1f5f9"]} onChange={(sidebarSectionTitleColor) => onChange({ sidebarSectionTitleColor })} />
          </>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onChange({ pageColor: undefined, accentColor: undefined, headingColor: undefined, textColor: undefined, mutedTextColor: undefined, linkColor: undefined, sidebarTextColor: undefined, sidebarSectionTitleColor: undefined })}
        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Usar los colores de la plantilla
      </button>
    </div>
  );
}
