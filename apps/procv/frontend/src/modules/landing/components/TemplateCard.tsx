import React from "react";
import { CVTemplateOption } from "../../../utils/templateCatalog";
import { getTemplateColorOptions } from "../../../utils/templateColorPresets";

export interface TemplateCardProps {
  template: CVTemplateOption;
  /** Whether this template is selected */
  selected?: boolean;
  /** Optional click handler */
  onSelect?: (template: CVTemplateOption) => void;
}

/**
 * Renders a single CV template card with mini-preview, category badge,
 * tier indicator, and color preset preview.
 */
export function TemplateCard({
  template,
  selected = false,
  onSelect,
}: TemplateCardProps) {
  const colorOptions = getTemplateColorOptions(template.key);
  const isPremium = template.category === "premium";

  const handleClick = () => {
    if (onSelect) {
      onSelect(template);
    }
  };

  return (
    <article
      className={`group relative rounded-xl border p-4 transition-all duration-200 ${
        selected
          ? "border-brand-500 dark:border-brand-400 shadow-md shadow-brand-500/20 bg-brand-50/30 dark:bg-brand-900/10"
          : "border-slate-200 dark:border-slate-700 hover:border-brand-400/50"
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Category badge */}
      <span
        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium uppercase tracking-tighter ${
          template.atsFriendly
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-50 text-slate-700"
        }`}
      >
        {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
      </span>

      {/* Premium tag if applicable */}
      {isPremium && (
        <span className="absolute top-4 right-4 inline-flex items-center px-2 py-1 rounded-md text-xs font-medium uppercase tracking-tighter bg-amber-50 text-amber-700">
          Premium
        </span>
      )}

      {/* Mini-preview placeholder */}
      <div className="mt-4 aspect-video rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full flex items-center justify-center" style={{ background: colorOptions[0]?.value || "#0f172a" }}>
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: isPremium ? "#f59e0b" : "#0f766e" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L12 14.586l4.586-4.586a2 2 0 012.828 0L12 14.586l4.586-4.586a2 2 0 012.828 0L12 14.586l4.586-4.586a2 2 0 012.828 0L12 14.586"
            />
          </svg>
        </div>
        <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          {template.label}
        </span>
      </div>

      <div className="mt-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {template.label}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 19l-6-6 4.243-4.243L9 10.586l6.243-6.243L21 13l-6.243 6.243L9 19z"
                fill="currentColor"
              />
            </svg>
            {template.supportsPhoto ? "Con foto" : "Sin foto"}
          </span>
          {template.atsFriendly && (
            <span className="flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5z"
                />
              </svg>
              ATS
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5z" />
            </svg>
            {colorOptions.length} estilos
          </span>
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute inset-0 rounded-xl border border-brand-500/50 shadow-[0_0_0_1px_var(--ui-procv-accent)]" />
      )}
    </article>
  );
}
