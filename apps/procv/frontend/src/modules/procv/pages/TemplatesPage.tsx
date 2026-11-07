import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, LayoutTemplate, Lock } from "lucide-react";
import { PlatformLayout } from "../../../shared/components/PlatformLayout";
import { AdSlot } from "../../monetization/components/AdSlot";
import { FeatureGate } from "../../monetization/components/FeatureGate";
import { PremiumBadge } from "../../monetization/components/UpgradeBanner";
import { useEntitlements } from "../../../shared/feature-flags";
import { useSeo, softwareApplicationSchema } from "../../../shared/seo";
import { CURATED_CV_TEMPLATES, CV_TEMPLATE_GROUPS, type CVTemplateGroup } from "../../../shared/utils/templateCatalog";

type Filter = "all" | CVTemplateGroup;

/** Public gallery: shows free vs premium templates and routes into the editor. */
export function TemplatesPage() {
  const { t } = useTranslation();
  const { isPremium, can } = useEntitlements();
  const [filter, setFilter] = useState<Filter>("all");

  const seo = useMemo(
    () => ({
      title: t("procv.templatesSeoTitle", "Plantillas de CV — ProCV"),
      description: t(
        "procv.templatesSeoDescription",
        "Explora las plantillas de currículum de ProCV: diseños modernos, ejecutivos y optimizados para sistemas ATS.",
      ),
      path: "/procv/templates",
      jsonLd: [softwareApplicationSchema()],
    }),
    [t],
  );

  useSeo(seo);

  const templates = useMemo(() => {
    if (filter !== "all") return CURATED_CV_TEMPLATES.filter((template) => template.group === filter);
    return CURATED_CV_TEMPLATES;
  }, [filter]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: t("procv.templatesAll", "Todas") },
    ...CV_TEMPLATE_GROUPS.map((group) => ({ id: group.id, label: group.label })),
  ];

  return (
    <PlatformLayout
      headerActions={
        <Link
          to="/procv/editor"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-procv-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-procv-700"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {t("procv.openEditor", "Abrir editor")}
        </Link>
      }
    >
      <section className="px-1 py-10">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
            ProCV
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
            {t("procv.templatesTitle", "Plantillas de CV")}
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {t("procv.templatesSubtitle", "Elige un diseño y edítalo en tiempo real. Las marcadas como Premium requieren plan.")}
          </p>
        </div>
      </section>

      <section className="px-1">
        <div className="mx-auto max-w-4xl">
          <div role="tablist" aria-label={t("procv.templatesFilter", "Filtrar plantillas")} className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  filter === item.id
                    ? "bg-procv-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-1 py-6">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const locked = template.tier === "premium" && !isPremium;
            return (
              <article
                key={template.key}
                className={`flex flex-col rounded-card border p-5 transition-all hover:-translate-y-0.5 hover:shadow-panel ${
                  locked
                    ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
                data-template={template.key}
                data-tier={template.tier}
                data-group={template.group}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t(`workspace.templates.${template.key}`, { defaultValue: template.label })}
                  </h2>
                  {template.tier === "premium" ? <PremiumBadge /> : null}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {CV_TEMPLATE_GROUPS.find((group) => group.id === template.group)?.label ?? template.group} ·{" "}
                  {template.atsFriendly ? t("procv.atsFriendly", "ATS friendly") : t("procv.notAts", "Diseño visual")}
                </p>

                <div className="mt-4 flex-1" aria-hidden="true">
                  <div className="h-24 rounded-lg border border-dashed border-slate-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-950">
                    <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="mt-2 h-1.5 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="mt-2 h-1.5 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>

                {locked ? (
                  <FeatureGate featureKey="procv_premium_templates" fallback="lock" origin="templates_gallery">
                    <span />
                  </FeatureGate>
                ) : (
                  <Link
                    to={`/procv/editor?template=${template.key}`}
                    className="mt-4 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-procv-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-procv-700"
                  >
                    {t("procv.useTemplate", "Usar plantilla")}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {!can("platform_no_ads") ? (
        <section className="px-1 pb-6">
          <div className="mx-auto max-w-4xl">
            <AdSlot placement="procv-after-download" />
          </div>
        </section>
      ) : null}

      <section className="px-1 pb-12">
        <div className="mx-auto max-w-4xl rounded-panel border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {t("procv.premiumTemplatesTitle", "Plantillas Premium")}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t("procv.premiumTemplatesBody", "Los diseños ejecutivo y extenso incluyen exportación sin marca de agua y paletas avanzadas.")}
          </p>
          <Link to="/#premium" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white">
            {t("upgrade.cta", "Ver planes")}
          </Link>
        </div>
      </section>
    </PlatformLayout>
  );
}
