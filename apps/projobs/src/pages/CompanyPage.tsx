import { Building2, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { Company, JobSummary } from "../../server/src/contracts";
import { JobCard } from "../components/JobCard";
import { CompanyLogo, EmptyState, ErrorNotice, Spinner } from "../components/primitives";
import { ApiError, errorMessage } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { useSession } from "../lib/session";

export function CompanyPage() {
  const { slug = "" } = useParams();
  const { request } = useSession();
  const { data, error, loading, reload } = useAsync<{ company: Company; jobs: JobSummary[] }>(slug, (signal) =>
    request(`/api/companies/${encodeURIComponent(slug)}`, { signal }),
  );

  if (loading && !data) return <div className="mx-auto max-w-4xl px-4 py-10"><Spinner /></div>;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <EmptyState icon={<Building2 className="h-10 w-10" />} title="Empresa no encontrada" action={<Link to="/" className="font-semibold text-brand-800">Ver empleos</Link>} />
      </div>
    );
  }
  if (error || !data) return <div className="mx-auto max-w-4xl px-4 py-10"><ErrorNotice message={errorMessage(error)} onRetry={reload} /></div>;

  const { company, jobs } = data;
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-ui-border bg-ui-surface p-6 sm:flex-row sm:items-center">
        <CompanyLogo company={company} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          {company.tagline && <p className="mt-1 text-ui-muted">{company.tagline}</p>}
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-ui-muted">
            {company.industry && <span>{company.industry}</span>}
            {company.sizeRange && <span>{company.sizeRange} personas</span>}
            {company.headquarters && <span>{company.headquarters}</span>}
          </p>
        </div>
        {company.website && (
          <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline">
            Sitio web <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </header>
      {company.description && <p className="whitespace-pre-line text-ui-muted">{company.description}</p>}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Vacantes abiertas ({jobs.length})</h2>
        {jobs.length ? (
          <ul className="space-y-3">{jobs.map((job) => <li key={job.id}><JobCard job={job} href={`/empleos/${job.slug}`} /></li>)}</ul>
        ) : (
          <EmptyState title="Sin vacantes abiertas por ahora" />
        )}
      </section>
    </div>
  );
}
