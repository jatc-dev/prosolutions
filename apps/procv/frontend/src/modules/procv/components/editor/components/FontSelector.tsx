import React from "react";
import { CV_FONTS, TEMPLATE_FONT, normalizeCvFont } from "../../../fonts";

export type { CvFont as FontOption } from "../../../fonts";
interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  const selected = normalizeCvFont(value);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[{ value: TEMPLATE_FONT, label: "Según la plantilla", style: "Predeterminada", family: "inherit" }, ...CV_FONTS].map((font) => (
          <button
            key={font.value}
            type="button"
            onClick={() => onChange(font.value)}
            aria-pressed={selected === font.value}
            className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-150 ${
              selected === font.value
                ? "border-brand-700 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            }`}
            style={{ fontFamily: font.family }}
          >
            <span className="text-lg font-semibold leading-none text-slate-800 dark:text-slate-100">
              Aa
            </span>
            <span className="mt-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
              {font.label}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400" style={{ fontFamily: "inherit" }}>
              {font.style}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}