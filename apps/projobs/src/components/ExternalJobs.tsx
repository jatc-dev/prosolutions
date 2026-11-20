import { ExternalLink, Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ExternalJob, ExternalJobsResponse } from "../../server/src/contracts";
import { apiRequest } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { timeAgo } from "../lib/format";

/**
 * Offers from a partner feed (Careerjet), below ProJobs' own results. They
 * open the original offer on the partner site: no detail page, no sign-up
 * required, no JobPosting markup. Hidden while the integration is off.
 */
export function ExternalJobs({ q, location }: { q: string; location: string }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ExternalJob[]>([]);
  const baseQuery = new URLSearchParams({ q, location }).toString();
  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [baseQuery]);

  const key = `${baseQuery}&page=${page}`;
  const result = useAsync<ExternalJobsResponse>(key, (signal) => apiRequest(`/api/external-jobs?${key}`, { signal }));
  useEffect(() => {
    if (!result.data) return;
    setItems((current) => (page === 1 ? result.data!.items : [...current, ...result.data!.items.filter((job) => !current.some((item) => item.id === job.id))]));
  }, [result.data]);

  const data = result.data;
  if (!data?.enabled || !data.source || (items.length === 0 && !result.loading)) return null;
  const canLoadMore = items.length < data.total && page < 10 && data.items.length > 0;

  return (
    <section aria-labelledby="vacantes-externas" className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ui-border pb-3">
        <div>
          <h2 id="vacantes-externas" className="flex items-center gap-2 text-lg font-semibold text-ui-text">
            <Globe2 className="h-5 w-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            Más vacantes en la web
          </h2>
          <p className="text-sm text-ui-muted">Ofertas publicadas en otros portales. Te llevamos a la oferta original para postularte allí.</p>
        </div>
        <a href={data.source.url} target="_blank" rel="nofollow noopener noreferrer" className="text-xs text-ui-subtle hover:underline">
          Empleos por {data.source.name}
        </a>
      </div>
      <ul className="mt-3 space-y-3">
        {items.map((job) => (
          <li key={job.id} className="rounded-2xl border border-ui-border bg-ui-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug text-ui-text">{job.title}</h3>
                <p className="mt-0.5 text-sm text-ui-muted">{[job.company, job.location].filter(Boolean).join(" · ")}</p>
                {job.salary ? <p className="mt-1 text-sm font-medium text-ui-text">{job.salary}</p> : null}
                {job.snippet ? <p className="mt-2 line-clamp-2 text-sm text-ui-muted">{job.snippet}</p> : null}
                <p className="mt-2 text-xs text-ui-subtle">
                  Publicada en {data.source!.name}
                  {job.postedAt ? ` · ${timeAgo(job.postedAt)}` : ""}
                </p>
              </div>
              <a
                href={job.url}
                target="_blank"
                rel="nofollow noopener noreferrer sponsored"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-ui-border-strong px-3 text-sm font-semibold text-ui-text hover:bg-ui-soft"
              >
                Ver oferta
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(se abre en {data.source!.name})</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
      {canLoadMore ? (
        <div className="mt-4 text-center">
          <button type="button" disabled={result.loading} onClick={() => setPage((current) => current + 1)} className="inline-flex h-9 items-center rounded-lg border border-ui-border px-4 text-sm font-medium disabled:opacity-50">
            {result.loading ? "Cargando…" : "Ver más vacantes"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
