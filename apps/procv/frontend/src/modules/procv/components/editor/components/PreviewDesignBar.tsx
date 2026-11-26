import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, LayoutTemplate, SlidersHorizontal } from "lucide-react";
import type { CVTemplateOption } from "../../../../../shared/utils/templateCatalog";
import type { CVData, PersonalData } from "../../../../../shared/types";
import { TemplateSelector } from "./TemplateSelector";
import { CustomizerPanel, type CustomizerTab } from "./CustomizerPanel";

type Panel = "template" | "customize" | null;
const STORAGE_KEY = "procv.editor.design-panel";

interface PreviewDesignBarProps {
  templates: CVTemplateOption[];
  currentTemplate: string;
  onTemplateSelect: (key: string) => void;
  settings: NonNullable<CVData["settings"]>;
  onSettingsChange: (settings: NonNullable<CVData["settings"]>) => void;
  /** Each change folds the open panel (the user went back to the form). */
  closeSignal?: number;
  personal?: PersonalData;
  onPersonalChange?: (updates: Partial<PersonalData>) => void;
}

/** Opens "Personalizar" on a tab from anywhere (e.g. the photo field of the form). */
export const OPEN_CUSTOMIZER_EVENT = "procv:open-customizer";
export function openCustomizer(tab: CustomizerTab) {
  window.dispatchEvent(new CustomEvent(OPEN_CUSTOMIZER_EVENT, { detail: tab }));
}

function readPanel(): Panel {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "template" || value === "customize" ? value : null;
  } catch {
    return null;
  }
}

/**
 * One slim bar above the preview: the current template with previous/next
 * arrows (browse templates without opening anything) and two separate
 * panels, "Plantilla" and "Personalizar". Only one opens at a time and it
 * has a maximum height, so most of the preview stays visible.
 */
export function PreviewDesignBar({ templates, currentTemplate, onTemplateSelect, settings, onSettingsChange, closeSignal, personal, onPersonalChange }: PreviewDesignBarProps) {
  const [panel, setPanel] = useState<Panel>(readPanel);
  const [requestedTab, setRequestedTab] = useState<{ tab: CustomizerTab; at: number } | undefined>();
  useEffect(() => {
    const onOpen = (event: Event) => {
      const tab = (event as CustomEvent<CustomizerTab>).detail;
      setPanel("customize");
      setRequestedTab({ tab, at: Date.now() });
    };
    window.addEventListener(OPEN_CUSTOMIZER_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CUSTOMIZER_EVENT, onOpen);
  }, []);
  useEffect(() => {
    try {
      if (panel) window.localStorage.setItem(STORAGE_KEY, panel);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: the panel simply starts closed next time.
    }
  }, [panel]);

  const lastSignal = useRef(closeSignal);
  useEffect(() => {
    if (closeSignal === lastSignal.current) return;
    lastSignal.current = closeSignal;
    setPanel(null);
  }, [closeSignal]);

  const index = Math.max(0, templates.findIndex((template) => template.key === currentTemplate));
  const current = templates[index];
  const step = (delta: number) => onTemplateSelect(templates[(index + delta + templates.length) % templates.length].key);
  const toggle = (next: Exclude<Panel, null>) => setPanel((value) => (value === next ? null : next));

  const segment = "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700";
  const idle = "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
  const active = "bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200";

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 bg-slate-50/95 px-1 pb-2 pt-1 backdrop-blur dark:bg-slate-950/95">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={() => step(-1)} aria-label="Plantilla anterior" title="Plantilla anterior" className={`${segment} ${idle} px-2`}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => toggle("template")}
          aria-expanded={panel === "template"}
          aria-controls="preview-template-panel"
          title={current?.hint}
          className={`${segment} min-w-0 flex-1 justify-between ${panel === "template" ? active : idle}`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <LayoutTemplate className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">Plantilla:</span>
            <span className="truncate font-semibold">{current?.label ?? currentTemplate}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${panel === "template" ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => step(1)} aria-label="Plantilla siguiente" title="Plantilla siguiente" className={`${segment} ${idle} px-2`}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="mx-0.5 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
        <button
          type="button"
          onClick={() => toggle("customize")}
          aria-expanded={panel === "customize"}
          aria-controls="preview-customize-panel"
          aria-label="Personalizar"
          title="Personalizar: fuentes, colores y diseño"
          className={`${segment} ${panel === "customize" ? active : idle}`}
        >
          <SlidersHorizontal className="h-4 w-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
          {/* Icon only on phones, so the template name has room. */}
          <span className="hidden sm:inline">Personalizar</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${panel === "customize" ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>

      {panel === "template" ? (
        <div id="preview-template-panel" className="mt-2 max-h-[40vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <TemplateSelector templates={templates} currentTemplate={currentTemplate} onTemplateSelect={onTemplateSelect} />
        </div>
      ) : null}
      {panel === "customize" ? (
        <div id="preview-customize-panel" className="mt-2 max-h-[50vh] overflow-y-auto rounded-xl shadow-sm">
          <CustomizerPanel settings={settings} onSettingsChange={onSettingsChange} personal={personal} onPersonalChange={onPersonalChange} requestedTab={requestedTab} template={currentTemplate} />
        </div>
      ) : null}
    </div>
  );
}
