import React, { useCallback, useDeferredValue, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BellRing, FileText, RefreshCw, Sparkles } from "lucide-react";
import { PlatformLayout } from "../../../shared/components/PlatformLayout";
import { AdSlot } from "../../monetization/components/AdSlot";
import { UpgradeBanner } from "../../monetization/components/UpgradeBanner";
import { useEntitlements } from "../../../shared/feature-flags";
import { useSeo, organizationSchema } from "../../../shared/seo";
import { JobCard } from "../components/JobCard";
import { JobsToolbar } from "../components/JobsToolbar";
import { JobsEmptyState, JobsErrorState, JobsSkeleton } from "../components/JobsStates";
import { useJobs } from "../hooks/useJobs";
import { collectTechnologies, filterJobs } from "../lib/derive";
import { EMPTY_QUERY } from "../types";
import type { JobsQuery } from "../types";

/** Injects an in-feed ad unit every N results (keeps the board readable). */
const AD_EVERY = 8;

function formatUpdatedAt(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale || "es", { dateStyle: "long", timeStyle: "short" }).format(date);
}

export function JobsPage() {
  const { t, i18n } = useTranslation();
  const { jobs, source, updatedAt, loading, error, reload } = useJobs();
  const { can } = useEntitlements();
  // Keep filters in the URL so a search can be bookmarked or shared.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo<JobsQuery>(() => ({
    text: searchParams.get("q") ?? "",
    technology: searchParams.get("tech") ?? "",
    modality: searchParams.get("modality") ?? "",
    seniority: searchParams.get("seniority") ?? "",
  }), [searchParams]);

  // Keeps typing responsive on large boards by deferring the filtered list.
  const deferredQuery = useDeferredValue(query);
  const isFiltering = deferredQuery !== query;

  const technologies = useMemo(() => collectTechnologies(jobs), [jobs]);
  const results = useMemo(() => filterJobs(jobs, deferredQuery), [jobs, deferredQuery]);

  const updatedLabel = useMemo(() => formatUpdatedAt(updatedAt, i18n.language), [updatedAt, i18n.language]);

  const seo = useMemo(
    () => ({
      title: t("projobs.seoTitle", "Empleos tech remotos — ProJobs"),
      description: t(
        "projobs.seoDescription",
        "Vacantes tech actualizadas a diario: desarrollo, data, DevOps, diseño y producto. Busca por tecnología, modalidad y nivel.",
      ),
      path: "/projobs",
      keywords: ["empleos tech", "trabajo remoto", "vacantes programador", "desarrollo remoto", "ProJobs"],
      jsonLd: [
        organizationSchema(),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t("projobs.seoTitle", "Empleos tech remotos — ProJobs"),
          numberOfItems: results.length,
          itemListElement: results.slice(0, 20).map((job, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "JobPosting",
              title: job.title,
              hiringOrganization: { "@type": "Organization", name: job.company },
              jobLocation: { "@type": "Place", name: job.location },
              employmentType: "FULL_TIME",
              directApply: false,
              url: job.url,
            },
          })),
        },
      ],
    }),
    [results, t],
  );

  useSeo(seo);

  const handleChange = useCallback((next: JobsQuery) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      const values: Array<[string, string]> = [
        ["q", next.text],
        ["tech", next.technology],
        ["modality", next.modality],
        ["seniority", next.seniority],
      ];
      for (const [key, value] of values) {
        const normalized = value.trim();
        if (normalized) params.set(key, normalized);
        else params.delete(key);
      }
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const handleReset = useCallback(() => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      for (const key of ["q", "tech", "modality", "seniority"]) params.delete(key);
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const canReceiveAlerts = can("projobs_job_alerts");

  return (
    <PlatformLayout
      headerActions={
        <Link
          to="/procv/editor"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-procv-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-procv-700"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {t("projobs.ctaProcv", "Crear mi CV")}
        </Link>
      }
    >
      <section className="px-1 py-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-projobs-200 bg-projobs-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-projobs-700 dark:border-projobs-800 dark:bg-projobs-950/40 dark:text-projobs-200">
            {t("shell.beta", "Beta")} · {t("projobs.badge", "Actualizado a diario")}
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
            {t("projobs.title", "Empleos tech remotos")}
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 md:text-base">
            {t("projobs.subtitle", "Vacantes curadas de plataformas aliadas. Filtra por tecnología, modalidad y nivel.")}
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {source === "live"
              ? t("projobs.updatedLive", "Última actualización: {{date}}", { date: updatedLabel ?? "—" })
              : t("projobs.updatedSnapshot", "Mostrando el último listado disponible ({{count}} ofertas)", {
                  count: jobs.length,
                })}
          </p>
        </div>
      </section>

      <section className="px-1">
        <div className="mx-auto max-w-3xl">
          <JobsToolbar
            query={query}
            technologies={technologies}
            resultCount={results.length}
            onChange={handleChange}
            onReset={handleReset}
            busy={isFiltering}
          />
        </div>
      </section>

      <section className="px-1 py-5">
        <div className="mx-auto max-w-3xl">
          <UpgradeBanner featureKey="projobs_job_alerts" />
        </div>
      </section>

      <section className="px-1 pb-4">
        <div className="mx-auto max-w-3xl">
          {error ? <JobsErrorState onRetry={reload} /> : null}

          {loading ? (
            <JobsSkeleton />
          ) : results.length === 0 ? (
            <JobsEmptyState onReset={handleReset} />
          ) : (
            <div className="space-y-4">
              {results.map((job, index) => (
                <React.Fragment key={job.id}>
                  <JobCard job={job} featured={index === 0} />
                  {(index + 1) % AD_EVERY === 0 && index + 1 < results.length ? (
                    <AdSlot placement="projobs-list-between" />
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Job alerts: Premium benefit, gated by a feature flag. */}
      <section className="px-1 pb-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-card border border-dashed border-projobs-300 bg-projobs-50 p-5 dark:border-projobs-800 dark:bg-projobs-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <BellRing className="h-4 w-4 text-projobs-600 dark:text-projobs-300" aria-hidden="true" />
                  {t("projobs.alertsTitle", "Alertas de nuevas vacantes")}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {canReceiveAlerts
                    ? t("projobs.alertsEnabled", "Recibirás un correo cuando llegue una vacante que coincida con tus filtros.")
                    : t("projobs.alertsLocked", "Disponible en ProSolutions Premium: recibe las vacantes antes que nadie.")}
                </p>
              </div>
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-projobs-300 px-3 py-2 text-xs font-bold text-projobs-700 dark:border-projobs-700 dark:text-projobs-200">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {canReceiveAlerts ? t("projobs.alertsOn", "Activadas") : t("premium.badge", "Premium")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-1 pb-12">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={reload}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            {t("projobs.reload", "Actualizar vacantes")}
          </button>
        </div>
      </section>
    </PlatformLayout>
  );
}
