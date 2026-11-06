import React from "react";
import { useTranslation } from "react-i18next";
import { useEntitlements } from "../../../../../shared/feature-flags";
import { CVTemplateOption, GUEST_FREE_TEMPLATES } from "../../../../../shared/utils/templateCatalog";
import { PremiumBadge } from "../../../../monetization/components/UpgradeBanner";

interface TemplateSelectorProps {
  templates: CVTemplateOption[];
  currentTemplate: string;
  isGuest: boolean;
  onTemplateSelect: (templateKey: string) => void;
  onLockedClick: () => void;
}

/** Compact, horizontally scrollable template picker. */
export function TemplateSelector({
  templates,
  currentTemplate,
  isGuest,
  onTemplateSelect,
  onLockedClick,
}: TemplateSelectorProps) {
  const { t } = useTranslation();
  const { can } = useEntitlements();
  const premiumUnlocked = can("procv_premium_templates");

  const isLocked = (tpl: CVTemplateOption) => {
    if (premiumUnlocked) return false;
    if (tpl.tier === "premium") return true;
    return isGuest && !GUEST_FREE_TEMPLATES.has(tpl.key);
  };

  return (
    <div className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 pr-1" role="group" aria-label={t("editor.templateSelector.title", "Plantillas de CV")}>
      {templates.map((tpl) => {
        const locked = isLocked(tpl);
        const selected = currentTemplate === tpl.key;
        return (
          <button
            key={tpl.key}
            type="button"
            onClick={() => locked ? onLockedClick() : onTemplateSelect(tpl.key)}
            aria-pressed={selected}
            title={locked ? t("paywall.lockedHint", "Requiere plan Premium") : t(`workspace.templates.${tpl.key}`, { defaultValue: tpl.label })}
            className={`relative inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              selected
                ? "border-brand-600 bg-brand-50 text-brand-800 shadow-sm dark:border-brand-400 dark:bg-brand-950/50 dark:text-brand-200"
                : locked
                ? "border-slate-200 bg-slate-50 text-slate-500 hover:border-amber-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-600 dark:hover:bg-slate-800"
            }`}
          >
            <svg className={`h-4 w-4 shrink-0 ${selected ? "text-brand-600 dark:text-brand-300" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3.75h7l5 5V20a1 1 0 01-1 1H7a1 1 0 01-1-1V4.75a1 1 0 011-1zM14 4v5h5M9 13h6M9 16.5h6" />
            </svg>
            <span className="whitespace-nowrap">{t(`workspace.templates.${tpl.key}`, { defaultValue: tpl.label })}</span>
            {tpl.atsFriendly ? <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">ATS</span> : null}
            {locked ? (
              <span className="inline-flex items-center gap-1">
                {tpl.tier === "premium" ? <PremiumBadge /> : <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">{t("templateSelector.proLabel", "Pro")}</span>}
                <span className="sr-only">{t("templateSelector.lockedHint", "Solo con cuenta")}</span>
              </span>
            ) : null}
            {selected ? <span className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
