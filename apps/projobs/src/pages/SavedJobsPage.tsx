import { Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import type { JobSummary } from "../../server/src/contracts";
import { JobCard } from "../components/JobCard";
import { EmptyState, ErrorNotice, Spinner } from "../components/primitives";
import { errorMessage } from "../lib/api";
import { useSaveToggle } from "../lib/candidate";
import { useAsync } from "../lib/hooks";
import { useSession } from "../lib/session";

type SavedJob = JobSummary & { savedAt: string; open: boolean };

export function SavedJobsPage() {
  const { request } = useSession();
  const toggleSave = useSaveToggle();
  const { data, error, loading, reload, setData } = useAsync<{ jobs: SavedJob[] }>("saved", (signal) => request("/api/me/saved-jobs", { signal }));
  const jobs = data?.jobs ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Vacantes guardadas</h1>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice message={errorMessage(error)} onRetry={reload} />
      ) : jobs.length === 0 ? (
        <EmptyState icon={<Bookmark className="h-10 w-10" />} title="No tienes vacantes guardadas" action={<Link to="/" className="font-semibold text-brand-800 hover:underline">Explorar vacantes</Link>}>
          Guarda vacantes para compararlas y postularte después.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id} className={job.open ? undefined : "opacity-70"}>
              {!job.open && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ui-muted">Cerrada</p>}
              <JobCard
                job={{ ...job, viewer: { saved: true, applied: Boolean(job.viewer?.applied) } }}
                href={`/empleos/${job.slug}`}
                onToggleSave={(item) =>
                  toggleSave(item, (next) => {
                    if (!next.viewer?.saved) setData((current) => current && { jobs: current.jobs.filter((saved) => saved.id !== next.id) });
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
