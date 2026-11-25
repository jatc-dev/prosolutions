import React from "react";
import { Minus, Plus } from "lucide-react";
import { CV_FONTS, FONT_SCALE_STEPS, TEMPLATE_FONT, normalizeCvFont, normalizeFontScale } from "../../../fonts";

export type { CvFont as FontOption } from "../../../fonts";

const FONT_OPTIONS = [
  { value: TEMPLATE_FONT, label: "Según la plantilla", style: "Predeterminada", family: "inherit" },
  ...CV_FONTS,
];

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** One typeface for the whole CV: six options in a 3 × 2 grid. */
export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  const selected = normalizeCvFont(value);

  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {FONT_OPTIONS.map((font) => (
          <button
            key={font.value}
            type="button"
            onClick={() => onChange(font.value)}
            aria-pressed={selected === font.value}
            className={`flex min-w-0 flex-col items-center rounded-lg border-2 px-1 py-2 transition-all duration-150 ${
              selected === font.value
                ? "border-brand-700 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            }`}
            style={{ fontFamily: font.family }}
          >
            <span className="text-lg font-semibold leading-none text-slate-800 dark:text-slate-100">Aa</span>
            <span className="mt-1 max-w-full truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{font.label}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400" style={{ fontFamily: "inherit" }}>
              {font.style}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface FontSizeStepperProps {
  label: string;
  value: unknown;
  onChange: (value: number) => void;
}

/** − / + control over FONT_SCALE_STEPS, shown as a percentage of the template's size. */
export function FontSizeStepper({ label, value, onChange }: FontSizeStepperProps) {
  const current = normalizeFontScale(value);
  const index = FONT_SCALE_STEPS.indexOf(current as (typeof FONT_SCALE_STEPS)[number]);
  const percent = `${Math.round(current * 100)} %`;
  const step = (delta: number) => {
    const next = FONT_SCALE_STEPS[index + delta];
    if (next !== undefined) onChange(next);
  };
  const buttonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div role="group" aria-label={label}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => step(-1)} disabled={index <= 0} aria-label={`Reducir ${label.toLowerCase()}`}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={current === 1}
          title="Volver al tamaño de la plantilla"
          aria-label={`${label}: ${percent}. Volver al tamaño de la plantilla`}
          className="min-w-[4rem] rounded-md px-2 py-1 text-center text-sm font-semibold tabular-nums text-slate-800 hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {percent}
        </button>
        <button type="button" className={buttonClass} onClick={() => step(1)} disabled={index >= FONT_SCALE_STEPS.length - 1} aria-label={`Aumentar ${label.toLowerCase()}`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
