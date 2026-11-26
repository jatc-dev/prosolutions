import React from "react";
import {
  CV_DENSITIES,
  MAX_SECTION_SPACING,
  normalizeDensity,
  normalizeSectionSpacing,
  type CvDensity,
} from "../../../cvSpacing";

interface LayoutCustomizerProps {
  settings: {
    density?: CvDensity;
    sectionSpacing?: number;
  };
  onChange: (settings: Partial<LayoutCustomizerProps["settings"]>) => void;
}

const SPACING_LABELS = ["Sin espacio extra", "Muy poco", "Normal", "Algo más", "Amplio", "Muy amplio", "Máximo"];

/** Density (all vertical spacing) and the room above section titles. */
export function LayoutCustomizer({ settings, onChange }: LayoutCustomizerProps) {
  const density = normalizeDensity(settings.density);
  const densityIndex = CV_DENSITIES.findIndex((item) => item.value === density);
  const current = CV_DENSITIES[densityIndex];
  const spacing = normalizeSectionSpacing(settings.sectionSpacing);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label htmlFor="cv-density" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Densidad del CV
          </label>
          <span className="text-xs font-semibold text-brand-800 dark:text-brand-300">{current.label}</span>
        </div>
        <input
          id="cv-density"
          type="range"
          min={0}
          max={CV_DENSITIES.length - 1}
          step={1}
          value={densityIndex}
          aria-valuetext={current.label}
          onChange={(event) => onChange({ density: CV_DENSITIES[Number(event.target.value)].value })}
          className="w-full accent-brand-700"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span>Muy compacto</span>
          <span>Normal</span>
          <span>Muy amplio</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{current.hint}. Ajusta el espacio entre todos los bloques y, en los extremos, el interlineado.</p>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label htmlFor="cv-section-spacing" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Espacio antes de cada sección
          </label>
          <span className="text-xs font-semibold text-brand-800 dark:text-brand-300">{SPACING_LABELS[spacing]}</span>
        </div>
        <input
          id="cv-section-spacing"
          type="range"
          min={0}
          max={MAX_SECTION_SPACING}
          step={1}
          value={spacing}
          aria-valuetext={SPACING_LABELS[spacing]}
          onChange={(event) => onChange({ sectionSpacing: Number(event.target.value) })}
          className="w-full accent-brand-700"
        />
        <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span>Cerrado</span>
          <span>Ancho</span>
        </div>
      </div>

      <p className="rounded-md bg-brand-50 px-3 py-2 text-xs text-slate-700 dark:bg-brand-950/40 dark:text-slate-200">
        ¿Una sección quedó sola en otra página? Prueba «Compacto» o «Muy compacto», reduce el espacio antes de cada sección y, si aún no cabe, baja un paso el tamaño de letra.
      </p>
    </div>
  );
}
