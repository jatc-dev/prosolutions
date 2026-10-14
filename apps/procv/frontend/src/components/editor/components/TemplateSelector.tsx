import React from "react";
import { useTranslation } from "react-i18next";
import { CVTemplateOption } from "../../../utils/templateCatalog";

interface TemplateSelectorProps {
  templates: CVTemplateOption[];
  currentTemplate: string;
  isGuest: boolean;
  onTemplateSelect: (templateKey: string) => void;
  onLockedClick: () => void;
}

export function TemplateSelector({
  templates,
  currentTemplate,
  isGuest,
  onTemplateSelect,
  onLockedClick,
}: TemplateSelectorProps) {
  const { t } = useTranslation();

  // Plantillas básicas gratuitas para invitados
  const freeTemplatesForGuest = new Set(["minimal", "classic", "compact"]);

  const isFreeForGuest = (key: string) => freeTemplatesForGuest.has(key);

  const handleTemplateClick = (tpl: CVTemplateOption) => {
    if (isGuest && !isFreeForGuest(tpl.key)) {
      onLockedClick();
      return;
    }
    onTemplateSelect(tpl.key);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {templates.map((tpl) => {
        const isFree = isFreeForGuest(tpl.key);
        const isLocked = isGuest && !isFree;

        return (
          <button
            key={tpl.key}
            type="button"
            onClick={() => handleTemplateClick(tpl)}
            className={`relative flex flex-col items-center rounded-lg border-2 p-2 text-left transition-all ${
              currentTemplate === tpl.key
                ? "border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40"
                : isLocked
                ? "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-900/60"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            }`}
          >
            {isLocked && (
              <span className="absolute -top-1.5 right-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.25 text-[8px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v7m0 0l-4-4m4 4l4-4M5 13l4 4L19 7" />
                </svg>
                {t("templateSelector.proLabel", "Pro")}
              </span>
            )}
            {isGuest && isFree && (
              <span className="absolute -top-1.5 right-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.25 text-[8px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("templateSelector.free", "Gratis")}
              </span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mb-1.5">
              <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
              {t(`workspace.templates.${tpl.key}`, { defaultValue: tpl.label })}
            </span>
            {isLocked && (
              <span className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                {t("templateSelector.lockedHint", "Solo con cuenta")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}