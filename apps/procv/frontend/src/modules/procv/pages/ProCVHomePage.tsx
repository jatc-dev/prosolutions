import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Briefcase, FileText, LayoutTemplate, Sparkles } from "lucide-react";
import { PlatformLayout } from "../../../shared/components/PlatformLayout";
import { AdSlot } from "../../monetization/components/AdSlot";
import { UpgradeBanner } from "../../monetization/components/UpgradeBanner";
import { useEntitlements } from "../../../shared/feature-flags";
import { useSeo, softwareApplicationSchema } from "../../../shared/seo";
import { MODULES } from "../../../shared/config/platform";
import { CURATED_CV_TEMPLATES } from "../../../shared/utils/templateCatalog";

/** Module landing: what ProCV does, how it works and the conversion paths. */
export function ProCVHomePage() {
  const { t } = useTranslation();
  const { isPremium } = useEntitlements();

  const seo = useMemo(
    () => ({
      title: t("procv.seoTitle", "ProCV — Crea tu CV profesional online"),
      description: t(
        "procv.seoDescription",
        "Editor de currículum en tiempo real con plantillas profesionales, optimización ATS y exportación a PDF, JSON y XML.",
      ),
      path: "/procv",
      keywords: ["crear CV online", "hoja de vida", "currículum profesional", "plantillas CV", "ATS"],
      jsonLd: [softwareApplicationSchema(MODULES.find((module) => module.id === "procv"))],
    }),
    [t],
  );

  useSeo(seo);

  const steps = [
    { titleKey: "procv.step1", bodyKey: "procv.step1Body" },
    { titleKey: "procv.step2", bodyKey: "procv.step2Body" },
    { titleKey: "procv.step3", bodyKey: "procv.step3Body" },
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
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-procv-200 bg-procv-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-procv-700 dark:border-procv-800 dark:bg-procv-950/40 dark:text-procv-200">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            ProSolutions · ProCV
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
            {t("procv.homeTitle", "Un CV que pase los filtros ATS, en minutos")}
          </h1>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            {t("procv.homeSubtitle", "Escribe, previsualiza al instante y exporta en PDF, JSON o XML. Sin instalaciones.")}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/procv/editor"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-procv-600 to-procv-500 px-6 py-3 text-sm font-bold text-white shadow-panel transition-transform hover:scale-[1.02]"
            >
              {t("procv.startFree", "Crear mi CV gratis")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/procv/templates"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
              {t("procv.viewTemplates", "Ver plantillas")}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-1 pb-6">
        <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.titleKey} className="rounded-card border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-procv-100 text-sm font-bold text-procv-700 dark:bg-procv-950 dark:text-procv-200">
                {index + 1}
              </span>
              <h2 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{t(step.titleKey, "")}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(step.bodyKey, "")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-1 pb-6">
        <div className="mx-auto max-w-4xl">
          <UpgradeBanner featureKey="procv_premium_templates" />
        </div>
      </section>

      <section className="px-1 pb-6">
        <div className="mx-auto max-w-4xl">
          <AdSlot placement="procv-editor-sidebar" />
        </div>
      </section>

      <section className="px-1 pb-12">
        <div className="mx-auto max-w-4xl rounded-panel border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("procv.alsoIn", "También en ProSolutions")}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t("procv.alsoInBody", "Con tu CV listo, revisa las vacantes tech que publicamos a diario.")}
          </p>
          <Link
            to="/projobs"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-projobs-300 px-4 py-2 text-sm font-bold text-projobs-700 transition-colors hover:bg-projobs-50 dark:border-projobs-700 dark:text-projobs-200 dark:hover:bg-projobs-950/40"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            {t("projobs.name", "ProJobs")}
          </Link>
        </div>
      </section>

      {!isPremium ? (
        <section className="px-1 pb-12">
          <div className="mx-auto max-w-4xl rounded-panel shell-gradient px-6 py-8 text-center text-white">
            <Sparkles className="mx-auto h-6 w-6" aria-hidden="true" />
            <h2 className="mt-3 text-xl font-bold">{t("upgrade.title", "Lleva tu perfil al siguiente nivel")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm opacity-90">
              {t("procv.premiumTeaser", "Desbloquea las {{count}} plantillas Premium y exporta sin marca de agua.", {
                count: CURATED_CV_TEMPLATES.length,
              })}
            </p>
            <Link
              to="/#premium"
              className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-white px-5 py-2 text-sm font-bold text-brand-700"
            >
              {t("upgrade.cta", "Ver planes")}
            </Link>
          </div>
        </section>
      ) : null}
    </PlatformLayout>
  );
}
