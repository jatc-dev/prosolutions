import React from "react";
import { useTranslation } from "react-i18next";

export interface FontOption {
  value: string;
  label: string;
  family: string;
}

export const GOOGLE_FONTS: FontOption[] = [
  { value: "inter", label: "Inter", family: "Inter, system-ui, sans-serif" },
  { value: "roboto", label: "Roboto", family: "Roboto, system-ui, sans-serif" },
  { value: "lato", label: "Lato", family: "Lato, system-ui, sans-serif" },
  { value: "montserrat", label: "Montserrat", family: "Montserrat, system-ui, sans-serif" },
  { value: "open-sans", label: "Open Sans", family: "Open Sans, system-ui, sans-serif" },
  { value: "source-sans", label: "Source Sans Pro", family: "'Source Sans Pro', system-ui, sans-serif" },
  { value: "raleigh", label: "Raleway", family: "Raleway, system-ui, sans-serif" },
  { value: "poppins", label: "Poppins", family: "Poppins, system-ui, sans-serif" },
  { value: "merriweather", label: "Merriweather", family: "Merriweather, Georgia, serif" },
  { value: "playfair", label: "Playfair Display", family: "'Playfair Display', Georgia, serif" },
  { value: "jetbrains", label: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { value: "system", label: "Sistema", family: "system-ui, -apple-system, sans-serif" },
];

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function FontSelector({ label, value, onChange }: FontSelectorProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {GOOGLE_FONTS.map((font) => (
          <button
            key={font.value}
            type="button"
            onClick={() => onChange(font.value)}
            className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-150 ${
              value === font.value
                ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/40"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            }`}
            style={{ fontFamily: font.family }}
          >
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              Aa
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {font.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}