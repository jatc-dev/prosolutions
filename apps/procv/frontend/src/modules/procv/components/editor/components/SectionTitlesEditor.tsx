import React from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_SECTION_TITLES,
  SECTION_TITLE_KEYS,
  SECTION_TITLE_MAX_LENGTH,
  type SectionTitleKey,
} from "../../../sectionTitles";

type Titles = Partial<Record<SectionTitleKey, string>>;

interface SectionTitlesEditorProps {
  value?: Titles;
  onChange: (titles: Titles) => void;
}

/** Lets the user rename the CV's section headings; empty means the standard title. */
export function SectionTitlesEditor({ value = {}, onChange }: SectionTitlesEditorProps) {
  const set = (key: SectionTitleKey, text: string) => {
    const next: Titles = { ...value, [key]: text.slice(0, SECTION_TITLE_MAX_LENGTH) };
    if (!next[key]) delete next[key];
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Títulos de las secciones</legend>
      <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
        Los títulos estándar ayudan a que los sistemas de selección (ATS) lean bien tu hoja de vida.
      </p>
      <div className="space-y-1.5">
        {SECTION_TITLE_KEYS.map((key) => {
          const custom = value[key] ?? "";
          const id = `section-title-${key}`;
          return (
            <div key={key} className="flex items-center gap-2">
              <label htmlFor={id} className="w-28 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                {DEFAULT_SECTION_TITLES[key]}
              </label>
              <input
                id={id}
                type="text"
                value={custom}
                maxLength={SECTION_TITLE_MAX_LENGTH}
                placeholder={DEFAULT_SECTION_TITLES[key]}
                onChange={(event) => set(key, event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => set(key, "")}
                disabled={!custom}
                aria-label={`Restaurar el título "${DEFAULT_SECTION_TITLES[key]}"`}
                title="Restaurar el título estándar"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:invisible dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
