import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Building2, Clock3, ExternalLink, MapPin, Tags } from "lucide-react";
import { MODALITY_LABELS, SENIORITY_LABELS, type JobPosting } from "../types";

const MODALITY_STYLES: Record<JobPosting["modality"], string> = {
  remote: "bg-projobs-100 text-projobs-700 dark:bg-projobs-950/60 dark:text-projobs-200",
  hybrid: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  onsite: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

interface JobCardProps {
  job: JobPosting;
  /** Highlights the first result of a filtered search. */
  featured?: boolean;
}

export function JobCard({ job, featured = false }: JobCardProps) {
  const { t } = useTranslation();

  return (
    <article
      className="group rounded-card border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-panel focus-within:ring-2 focus-within:ring-projobs-500 dark:border-slate-700 dark:bg-slate-900"
      data-testid="job-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-projobs-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-projobs-700 dark:bg-projobs-950/60 dark:text-projobs-200">
          {job.source}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${MODALITY_STYLES[job.modality]}`}>
          {MODALITY_LABELS[job.modality]}
        </span>
        {job.seniority !== "unknown" ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {SENIORITY_LABELS[job.seniority]}
          </span>
        ) : null}
        {featured ? <span className="rounded-full bg-projobs-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-projobs-700 dark:bg-projobs-950/60 dark:text-projobs-200">{t("jobs.featured", "Destacada")}</span> : null}
      </div>

      <h3 className="mt-3 text-base font-bold leading-snug text-slate-900 dark:text-white">
        <Link
          to={`/projobs/${job.id}`}
          className="transition-colors hover:text-projobs-700 dark:hover:text-projobs-300"
        >
          {job.title}
        </Link>
      </h3>

      <dl className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <dt className="sr-only">{t("jobs.company", "Empresa")}</dt>
          <dd className="font-semibold">{job.company}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <dt className="sr-only">{t("jobs.location", "Ubicación")}</dt>
          <dd>{job.location}</dd>
        </div>
        {job.technologies.length > 0 ? (
          <div className="flex items-start gap-2">
            <Tags className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <dt className="sr-only">{t("jobs.technologies", "Tecnologías")}</dt>
            <dd className="flex flex-wrap gap-1">
              {job.technologies.slice(0, 5).map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {tech}
                </span>
              ))}
              {job.technologies.length > 5 ? (
                <span className="text-[11px] font-semibold text-slate-500">+{job.technologies.length - 5}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to={`/projobs/${job.id}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-projobs-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-projobs-700"
        >
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {t("jobs.viewDetail", "Ver detalle")}
        </Link>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t("jobs.applyExternal", "Postular")}
        </a>
      </div>
    </article>
  );
}
