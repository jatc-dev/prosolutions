import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CV_TEMPLATE_GROUPS, type CVTemplateGroup, type CVTemplateOption } from "../../../../../shared/utils/templateCatalog";

interface TemplateSelectorProps {
  templates: CVTemplateOption[];
  currentTemplate: string;
  onTemplateSelect: (templateKey: string) => void;
}

type Filter = CVTemplateGroup | "all";

/**
 * Template picker. One group at a time (tabs) so it takes two or three rows
 * instead of the whole height above the preview; it opens on the group of the
 * current template. "Todas" lists every group.
 */
export function TemplateSelector({ templates, currentTemplate, onTemplateSelect }: TemplateSelectorProps) {
  const { t } = useTranslation();
  const currentGroup = templates.find((template) => template.key === currentTemplate)?.group;
  const [filter, setFilter] = useState<Filter>(currentGroup ?? "all");
  const groups = CV_TEMPLATE_GROUPS.filter((group) => templates.some((template) => template.group === group.id));
  const tabs: Array<{ id: Filter; label: string }> = [{ id: "all", label: "Todas" }, ...groups.map((group) => ({ id: group.id as Filter, label: group.label }))];
  const shownGroups = filter === "all" ? groups : groups.filter((group) => group.id === filter);
  const label = (template: CVTemplateOption) => t(`workspace.templates.${template.key}`, { defaultValue: template.label });

  return (
    <div className="flex w-full min-w-0 flex-col gap-3" aria-label={t("editor.templateSelector.title", "Plantillas de CV")}>
      <div role="tablist" aria-label="Tipo de plantilla" className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${active ? "bg-brand-800 text-white dark:bg-brand-500 dark:text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {shownGroups.map((group) => {
        const groupTemplates = templates.filter((template) => template.group === group.id);
        return (
          <section key={group.id} className="min-w-0" aria-label={group.label}>
            {filter === "all" ? <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{group.label}</h3> : null}
            <p className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">{group.description}</p>
            <div className="flex w-full min-w-0 flex-wrap gap-2">
              {groupTemplates.map((template) => {
                const selected = currentTemplate === template.key;
                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => onTemplateSelect(template.key)}
                    aria-pressed={selected}
                    title={template.hint ?? label(template)}
                    className={`inline-flex min-h-8 max-w-full shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${selected ? "border-brand-800 bg-brand-50 text-brand-950 shadow-sm dark:border-brand-400 dark:bg-brand-950/50 dark:text-brand-200" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-800 dark:hover:bg-slate-800"}`}
                  >
                    <span className="whitespace-nowrap">{label(template)}</span>
                    {selected ? <span className="h-1.5 w-1.5 rounded-full bg-brand-800 dark:bg-brand-400" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Todas son legibles por los sistemas de selección (ATS): el PDF incluye tu texto real.
      </p>
    </div>
  );
}
