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

/**
 * Template picker with the unified access rule:
 *   Premium plan      -> every template
 *   Free plan         -> templates flagged `tier: "free"`
 *   Guest (no account)-> only `GUEST_FREE_TEMPLATES`
 */
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

  const handleTemplateClick = (tpl: CVTemplateOption) => {
    if (isLocked(tpl)) {
      onLockedClick();
      return;
    }
    onTemplateSelect(tpl.key);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {templates.map((tpl) => {
        const locked = isLocked(tpl);

        return (
          <button
            key={tpl.key}
            type="button"
            onClick={() => handleTemplateClick(tpl)}
            title={locked ? t("paywall.lockedHint", "Requiere plan Premium") : undefined}
            className={`relative flex flex-col items-center rounded-lg border-2 p-2 text-left transition-all ${
              currentTemplate === tpl.key
                ? "border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40"
                : locked
                ? "border-slate-200 bg-slate-50 opacity-75 dark:border-slate-700 dark:bg-slate-900/60"
                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
            }`}
          >
            {locked && (
              <span className="absolute -top-1.5 right-1.5">
                {tpl.tier === "premium" ? (
                  <PremiumBadge />
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.25 text-[8px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    {t("templateSelector.proLabel", "Pro")}
                  </span>
                )}
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
            {locked && (
              <span className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                {tpl.tier === "premium"
                  ? t("templateSelector.premiumHint", "Plan Premium")
                  : t("templateSelector.lockedHint", "Solo con cuenta")}
              </span>
            )}
            {tpl.atsFriendly ? (
              <span className="mt-0.5 text-[9px] font-semibold text-projobs-600 dark:text-projobs-300">ATS</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
