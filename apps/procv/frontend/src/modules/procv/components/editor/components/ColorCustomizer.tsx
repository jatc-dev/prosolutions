import React from "react";
import { Check } from "lucide-react";
import { luminance, MIN_PAGE_LUMINANCE, PAGE_COLOR_EXCLUDED, PAGE_COLOR_PRESETS } from "../../../pageColor";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </label>
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      />
    </div>
  );
}

interface ColorCustomizerProps {
  /** Current template: some keep their own page background. */
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

/** "Color de página": light presets plus a free colour, with a legibility warning. */
function PageColorField({ template, value, onChange }: { template?: string; value?: string; onChange: (value: string | undefined) => void }) {
  const current = (value || "#ffffff").toLowerCase();
  const tooDark = luminance(current) < MIN_PAGE_LUMINANCE;
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
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Color de página</p>
      <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Color de página">
        {PAGE_COLOR_PRESETS.map((preset) => {
          const selected = current === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => onChange(preset.value === "#ffffff" ? undefined : preset.value)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${selected ? "border-brand-700 ring-2 ring-brand-700 ring-offset-1 dark:ring-offset-slate-900" : "border-slate-300 dark:border-slate-600"}`}
              style={{ backgroundColor: preset.value }}
            >
              {selected ? <Check className="h-4 w-4 text-brand-800" aria-hidden="true" /> : null}
            </button>
          );
        })}
        <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300" title="Otro color">
          <input type="color" value={current} onChange={(event) => onChange(event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-slate-300 bg-white dark:border-slate-700" aria-label="Otro color de página" />
          Otro
        </label>
      </div>
      {tooDark ? (
        <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">
          Este color es oscuro y el texto de la plantilla puede no leerse bien, sobre todo al imprimir. Prefiere un tono claro.
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Se aplica a la hoja completa, también en el PDF y en Word. Los tonos claros se leen e imprimen mejor.</p>
      )}
    </div>
  );
}

export function ColorCustomizer({ template, settings, onChange }: ColorCustomizerProps) {
  return (
    <div className="space-y-2">
      <PageColorField template={template} value={settings.pageColor} onChange={(pageColor) => onChange({ pageColor })} />
      <div className="my-3 border-t border-slate-200 dark:border-slate-700" />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Mientras no cambies un color, la plantilla usa su propia paleta.
      </p>
      <ColorField
        label="Color de acento"
        value={settings.accentColor || "#3b82f6"}
        onChange={(v) => onChange({ accentColor: v })}
      />
      <ColorField
        label="Color de títulos"
        value={settings.headingColor || "#0f172a"}
        onChange={(v) => onChange({ headingColor: v })}
      />
      <ColorField
        label="Color de texto"
        value={settings.textColor || "#1e293b"}
        onChange={(v) => onChange({ textColor: v })}
      />
      <ColorField
        label="Texto secundario"
        value={settings.mutedTextColor || "#64748b"}
        onChange={(v) => onChange({ mutedTextColor: v })}
      />
      <ColorField
        label="Enlaces"
        value={settings.linkColor || "#2563eb"}
        onChange={(v) => onChange({ linkColor: v })}
      />
      <ColorField
        label="Texto sidebar"
        value={settings.sidebarTextColor || "#e2e8f0"}
        onChange={(v) => onChange({ sidebarTextColor: v })}
      />
      <ColorField
        label="Título sidebar"
        value={settings.sidebarSectionTitleColor || "#f1f5f9"}
        onChange={(v) => onChange({ sidebarSectionTitleColor: v })}
      />
      <button
        type="button"
        onClick={() => onChange({ pageColor: undefined, accentColor: undefined, headingColor: undefined, textColor: undefined, mutedTextColor: undefined, linkColor: undefined, sidebarTextColor: undefined, sidebarSectionTitleColor: undefined })}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Usar los colores de la plantilla
      </button>
    </div>
  );
}