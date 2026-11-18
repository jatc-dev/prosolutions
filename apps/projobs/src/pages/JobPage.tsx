import { ArrowLeft, SearchX } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import type { JobDetail, JobSummary } from "../../server/src/contracts";
import { JobDetailView } from "../components/JobDetailView";
import { EmptyState, ErrorNotice, Spinner } from "../components/primitives";
import { ApiError, errorMessage } from "../lib/api";
import { useMySkills, useSaveToggle } from "../lib/candidate";
import { useAsync } from "../lib/hooks";
import { useSession } from "../lib/session";
import { applyJobSeo } from "../lib/jobPosting";
import { WEB_URL } from "../lib/env";

export function JobPage() {
  const { slug = "" } = useParams();
  const { request } = useSession();
  const mySkills = useMySkills();
  const toggleSave = useSaveToggle();
  const { data, error, loading, reload, setData } = useAsync<{ job: JobDetail; similar: JobSummary[] }>(slug, (signal) =>
    request(`/api/jobs/${encodeURIComponent(slug)}`, { signal }),
  );

  useEffect(() => {
    if (data) document.title = `${data.job.title} en ${data.job.company.name} | ProJobs`;
    const restoreSeo = applyJobSeo(data?.job ?? null, WEB_URL);
    return () => {
      restoreSeo();
      document.title = "ProJobs — Empleos y postulación en un clic | ProSolutions";
    };
  }, [data]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ui-muted hover:text-ui-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a empleos
      </Link>
      {loading && !data ? (
        <Spinner label="Cargando vacante" />
      ) : error instanceof ApiError && error.status === 404 ? (
        <EmptyState icon={<SearchX className="h-10 w-10" />} title="Esta vacante no existe o ya no está disponible" action={<Link to="/" className="font-semibold text-brand-800 hover:underline">Ver vacantes abiertas</Link>} />
      ) : error ? (
        <ErrorNotice message={errorMessage(error)} onRetry={reload} />
      ) : data ? (
        <div className="rounded-2xl border border-ui-border bg-ui-surface p-6 shadow-card sm:p-8">
          <JobDetailView
            job={data.job}
            similar={data.similar}
            mySkills={mySkills}
            onToggleSave={(job) => toggleSave(job, (next) => setData((current) => current && { ...current, job: { ...current.job, viewer: next.viewer } }))}
            onChange={(patch) => setData((current) => current && { ...current, job: { ...current.job, ...patch } })}
          />
        </div>
      ) : null}
    </div>
  );
}
