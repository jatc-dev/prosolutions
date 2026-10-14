import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Building2, ExternalLink, FileText, MapPin, ShieldAlert, Tags } from "lucide-react";
import { PlatformLayout } from "../../../shared/components/PlatformLayout";
import { AdSlot } from "../../monetization/components/AdSlot";
import { UpgradeBanner } from "../../monetization/components/UpgradeBanner";
import { useSeo, organizationSchema } from "../../../shared/seo";
import { JobCard } from "../components/JobCard";
import { JobsErrorState, JobsSkeleton } from "../components/JobsStates";
import { useJobs } from "../hooks/useJobs";
import { MODALITY_LABELS, SENIORITY_LABELS } from "../types";

export function JobDetailPage() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const { jobs, loading, error, reload, source } = useJobs();

  const job = useMemo(() => jobs.find((item) => item.id === jobId), [jobs, jobId]);
  const related = useMemo(
    () =>
      job
        ? jobs
            .filter(
              (item) =>
                item.id !== job.id &&
                (item.company === job.company ||
                  item.technologies.some((tech) => job.technologies.includes(tech)) ||
                  item.modality === job.modality),
            )
            .slice(0, 3)
        : [],
    [jobs, job],
  );

  const seo = useMemo(() => {
    if (!job) {
      return {
        title: t("projobs.detailNotFoundTitle", "Vacante no encontrada"),
        description: t("projobs.detailNotFoundBody", "La vacante que buscas ya no está disponible."),
        path: `/projobs/${jobId ?? ""}`,
        noindex: true,
        jsonLd: [] as Array<Record<string, unknown>>,
      };
    }
    return {
      title: `${job.title} — ${job.company}`,
      description: t("projobs.detailDescription", "{{title}} en {{company}}. Modalidad {{modality}}, ubicación {{location}}.", {
        title: job.title,
        company: job.company,
        modality: MODALITY_LABELS[job.modality].toLowerCase(),
        location: job.location,
      }),
      path: `/projobs/${job.id}`,
      jsonLd: [
        organizationSchema(),
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: `${job.title} · ${job.company} · ${job.location}`,
          identifier: { "@type": "PropertyValue", name: job.company, value: job.id },
          hiringOrganization: { "@type": "Organization", name: job.company },
          jobLocation: { "@type": "Place", name: job.location },
          employmentType: "FULL_TIME",
          directApply: false,
          url: job.url,
        },
      ],
    };
  }, [job, jobId, t]);

  useSeo(seo);

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
      <article className="mx-auto max-w-3xl px-1 py-8">
        <Link
          to="/projobs"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-projobs-700 dark:text-slate-300 dark:hover:text-projobs-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("projobs.backToList", "Volver a las vacantes")}
        </Link>

        {loading ? <JobsSkeleton count={2} /> : null}
        {error ? <JobsErrorState onRetry={reload} /> : null}

        {!loading && !job ? (
          <div className="ui-empty-state mt-6" data-testid="job-detail-missing">
            <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
              {t("projobs.detailNotFoundTitle", "Vacante no encontrada")}
            </h1>
            <p className="mt-2 text-sm">{t("projobs.detailNotFoundBody", "La vacante que buscas ya no está disponible o el enlace cambió.")}</p>
            <Link
              to="/projobs"
              className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-projobs-600 px-4 py-2 text-sm font-bold text-white"
            >
              {t("projobs.backToList", "Volver a las vacantes")}
            </Link>
          </div>
        ) : null}

        {!loading && job ? (
          <>
            <header className="mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-projobs-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-projobs-700 dark:bg-projobs-950/60 dark:text-projobs-200">
                  {job.source}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {MODALITY_LABELS[job.modality]}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {SENIORITY_LABELS[job.seniority]}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-black leading-tight text-slate-900 dark:text-white md:text-3xl">{job.title}</h1>

              <dl className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <dt className="sr-only">{t("jobs.company", "Empresa")}</dt>
                  <dd className="font-semibold">{job.company}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <dt className="sr-only">{t("jobs.location", "Ubicación")}</dt>
                  <dd>{job.location}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-projobs-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-projobs-700"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {t("projobs.applyNow", "Postular en el sitio oficial")}
                </a>
                <Link
                  to="/procv/editor"
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t("projobs.ctaProcv", "Crear mi CV")}
                </Link>
              </div>
            </header>

            {job.technologies.length > 0 ? (
              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Tags className="h-4 w-4" aria-hidden="true" />
                  {t("jobs.technologies", "Tecnologías")}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {job.technologies.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mt-8 rounded-card border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t("projobs.aboutRole", "Sobre la vacante")}</h2>
              <p className="mt-2">
                {t(
                  "projobs.aboutRoleBody",
                  "ProJobs indexa vacantes de plataformas aliadas. Revisa el detalle completo, requisitos y proceso de selección en la publicación oficial.",
                )}
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t("projobs.sourceNote", "Fuente: {{source}}", { source: job.source })}
                {source === "snapshot" ? ` · ${t("projobs.snapshotNote", "listado de respaldo")}` : ""}
              </p>
            </section>

            <div className="mt-6">
              <UpgradeBanner featureKey="projobs_early_access" />
            </div>

            <div className="mt-6">
              <AdSlot placement="projobs-detail-bottom" />
            </div>

            {related.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("projobs.related", "Vacantes relacionadas")}</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {related.map((item) => (
                    <JobCard key={item.id} job={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </article>
    </PlatformLayout>
  );
}
