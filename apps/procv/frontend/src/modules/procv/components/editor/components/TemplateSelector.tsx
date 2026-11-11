import React from "react";
import { useTranslation } from "react-i18next";
import { CV_TEMPLATE_GROUPS, type CVTemplateOption } from "../../../../../shared/utils/templateCatalog";

interface TemplateSelectorProps {
  templates: CVTemplateOption[];
  currentTemplate: string;
  onTemplateSelect: (templateKey: string) => void;
}

/** Template picker grouped by functional design family. */
export function TemplateSelector({ templates, currentTemplate, onTemplateSelect }: TemplateSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex w-full min-w-0 flex-col gap-3" role="group" aria-label={t("editor.templateSelector.title", "Plantillas de CV")}>
      {CV_TEMPLATE_GROUPS.map((group) => {
        const groupTemplates = templates.filter((template) => template.group === group.id);
        if (!groupTemplates.length) return null;
        return (
          <section key={group.id} className="min-w-0" aria-label={group.label}>
            <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{group.label}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{group.description}</p>
            </div>
            <div className="flex w-full min-w-0 flex-wrap gap-2">
              {groupTemplates.map((template) => {
                const selected = currentTemplate === template.key;
                return (
                  <button key={template.key} type="button" onClick={() => onTemplateSelect(template.key)} aria-pressed={selected}
                    title={t(`workspace.templates.${template.key}`, { defaultValue: template.label })}
                    className={`relative inline-flex min-h-9 max-w-full shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${selected ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm dark:border-brand-400 dark:bg-brand-950/50 dark:text-brand-200" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:bg-slate-800"}`}>
                    <svg className={`h-4 w-4 shrink-0 ${selected ? "text-brand-600 dark:text-brand-300" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3.75h7l5 5V20a1 1 0 01-1 1H7a1 1 0 01-1-1V4.75a1 1 0 011-1zM14 4v5h5M9 13h6M9 16.5h6" /></svg>
                    <span className="whitespace-nowrap">{t(`workspace.templates.${template.key}`, { defaultValue: template.label })}</span>
                    {template.atsFriendly ? <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">ATS</span> : null}
                    {selected ? <span className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
