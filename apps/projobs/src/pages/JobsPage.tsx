import { cn } from "@prosolutions/ui";
import { ArrowLeft, ArrowRight, Briefcase, MapPin, Search, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { JobDetail, JobSearchResponse, JobSummary } from "../../server/src/contracts";
import { FiltersPanel } from "../components/FiltersPanel";
import { JobCard, JobCardSkeleton } from "../components/JobCard";
import { JobDetailView } from "../components/JobDetailView";
import { EmptyState, ErrorNotice, Spinner } from "../components/primitives";
import { errorMessage } from "../lib/api";
import { PROCV_URL } from "../lib/env";
import { useMySkills, useSaveToggle } from "../lib/candidate";
import { useAsync, useDebouncedValue, useIsDesktop } from "../lib/hooks";
import { DEFAULT_FILTERS, activeFilterCount, filtersToParams, parseFilters, toApiQuery, type JobFilters } from "../lib/search-params";
import { useSession } from "../lib/session";

const PAGE_SIZE = 20;
const SORT_OPTIONS: Array<[JobFilters["sort"], string]> = [
  ["relevance", "Más relevantes"],
  ["recent", "Más recientes"],
  ["salary", "Mejor salario"],
  ["match", "Mayor afinidad"],
];

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const selectedSlug = params.get("vacante");
  const { request } = useSession();
  const mySkills = useMySkills();
  const toggleSave = useSaveToggle();
  const isDesktop = useIsDesktop();
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState(filters.q);
  const [location, setLocation] = useState(filters.location);
  const debouncedQuery = useDebouncedValue(query, 250);
  const debouncedLocation = useDebouncedValue(location, 350);
  const resultsRef = useRef<HTMLDivElement>(null);

  const update = useCallback(
    (patch: Partial<JobFilters>, options: { resetPage?: boolean } = { resetPage: true }) => {
      const next: JobFilters = { ...filters, ...patch, ...(options.resetPage ? { page: patch.page ?? 1 } : {}) };
      const nextParams = filtersToParams(next);
      if (selectedSlug && !options.resetPage) nextParams.set("vacante", selectedSlug);
      setParams(nextParams, { replace: patch.q !== undefined || patch.location !== undefined });
    },
    [filters, selectedSlug, setParams],
  );

  // Instant search: typing updates the URL (debounced) which triggers the query.
  useEffect(() => {
    if (debouncedQuery !== filters.q) update({ q: debouncedQuery });
  }, [debouncedQuery]);
  useEffect(() => {
    if (debouncedLocation !== filters.location) update({ location: debouncedLocation });
  }, [debouncedLocation]);
  useEffect(() => {
    setQuery(filters.q);
    setLocation(filters.location);
  }, [filters.q, filters.location]);

  const apiQuery = toApiQuery(filters, mySkills, PAGE_SIZE);
  const search = useAsync<JobSearchResponse>(apiQuery, (signal) => request(`/api/jobs?${apiQuery}`, { signal }));
  const results = search.data;

  // Desktop split view: keep a job selected (URL `vacante`), defaulting to the first result.
  const activeSlug = isDesktop ? selectedSlug ?? results?.items[0]?.slug ?? null : null;
  const detail = useAsync<{ job: JobDetail; similar: JobSummary[] }>(activeSlug, (signal) =>
    request(`/api/jobs/${encodeURIComponent(activeSlug!)}`, { signal }),
  );

  const selectJob = (job: JobSummary) => {
    const next = new URLSearchParams(params);
    next.set("vacante", job.slug);
    setParams(next, { replace: true });
  };

  const patchJob = (next: JobSummary) => {
    search.setData((current) => current && { ...current, items: current.items.map((item) => (item.id === next.id ? { ...item, ...next } : item)) });
    detail.setData((current) => (current && current.job.id === next.id ? { ...current, job: { ...current.job, viewer: next.viewer } } : current));
  };

  const goToPage = (page: number) => {
    update({ page }, { resetPage: false });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const totalPages = results ? Math.max(1, Math.ceil(results.total / PAGE_SIZE)) : 1;
  const filterCount = activeFilterCount(filters);
  // No results and no criteria at all: the catalog itself is empty (e.g. right after launch).
  const catalogEmpty = Boolean(results && results.total === 0 && filterCount === 0 && !filters.q.trim());
  const sortOptions = SORT_OPTIONS.filter(([value]) => value !== "match" || mySkills.length > 0);

  return (
    <>
      <section className="border-b border-ui-border bg-gradient-to-b from-brand-50/70 to-transparent dark:from-brand-500/5">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Encuentra tu próximo empleo tech</h1>
          <p className="mt-2 max-w-2xl text-ui-muted">
            Filtra por modalidad, salario y habilidades. Postúlate en un clic con tu CV de ProCV y descubre tu afinidad con cada vacante.
          </p>
          <form role="search" onSubmit={(event) => event.preventDefault()} className="mt-6 grid gap-2 rounded-2xl border border-ui-border bg-ui-surface p-2 shadow-panel sm:grid-cols-[1fr_minmax(0,16rem)]">
            <label className="flex items-center gap-2 rounded-xl px-3">
              <Search className="h-5 w-5 shrink-0 text-ui-muted" aria-hidden="true" />
              <span className="sr-only">Cargo, habilidad o empresa</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cargo, habilidad o empresa"
                maxLength={120}
                className="h-11 w-full bg-transparent text-base text-ui-text placeholder:text-ui-muted focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border-t border-ui-border px-3 sm:border-l sm:border-t-0">
              <MapPin className="h-5 w-5 shrink-0 text-ui-muted" aria-hidden="true" />
              <span className="sr-only">Ciudad</span>
              <input
                type="search"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ciudad"
                maxLength={80}
                className="h-11 w-full bg-transparent text-base text-ui-text placeholder:text-ui-muted focus:outline-none"
              />
            </label>
          </form>
          {mySkills.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-700 dark:text-brand-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Mostrando tu afinidad según las {mySkills.length} habilidades de tu CV en ProCV.
            </p>
          )}
        </div>
      </section>

      <div
        ref={resultsRef}
        className={cn(
          "mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-8",
          !catalogEmpty && "xl:grid-cols-[16rem_minmax(0,26rem)_minmax(0,1fr)]",
        )}
      >
        <aside className={cn("lg:block", showFilters ? "block" : "hidden")} aria-label="Filtros de búsqueda">
          <div className="rounded-2xl border border-ui-border bg-ui-surface p-4 lg:sticky lg:top-4">
            <FiltersPanel filters={filters} facets={results?.facets ?? null} onChange={(patch) => update(patch)} onReset={() => setParams(filtersToParams(DEFAULT_FILTERS))} />
          </div>
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm font-medium text-ui-muted" aria-live="polite">
              {search.loading && !results ? "Buscando…" : `${results?.total ?? 0} ${results?.total === 1 ? "vacante" : "vacantes"}`}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                aria-expanded={showFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ui-border px-3 text-sm font-medium lg:hidden"
              >
                {showFilters ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                Filtros{filterCount > 0 && ` (${filterCount})`}
              </button>
              <label className="sr-only" htmlFor="sort">Ordenar por</label>
              <select
                id="sort"
                value={filters.sort === "match" && !mySkills.length ? "relevance" : filters.sort}
                onChange={(event) => update({ sort: event.target.value as JobFilters["sort"] })}
                className="h-9 rounded-lg border border-ui-border bg-ui-surface px-3 text-sm"
              >
                {sortOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {search.error ? (
            <ErrorNotice message={errorMessage(search.error)} onRetry={search.reload} />
          ) : !results ? (
            <div className="space-y-3">{Array.from({ length: 5 }, (_, index) => <JobCardSkeleton key={index} />)}</div>
          ) : results.items.length === 0 && catalogEmpty ? (
            <EmptyState
              icon={<Briefcase className="h-10 w-10" />}
              title="Aún no hay vacantes publicadas"
              action={
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <a href={`${PROCV_URL}/dashboard`} className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                    Prepara tu CV en ProCV
                  </a>
                  <Link to="/empresa" className="text-sm font-semibold text-brand-600 hover:underline">
                    ¿Eres empresa? Publica tu primera vacante
                  </Link>
                </div>
              }
            >
              ProJobs acaba de abrir y las empresas están publicando sus primeras ofertas. Mientras tanto, deja listo tu CV para
              postularte en un clic en cuanto aparezcan.
            </EmptyState>
          ) : results.items.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-10 w-10" />}
              title="No encontramos vacantes con esos criterios"
              action={filterCount > 0 || filters.q ? (
                <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => setParams(new URLSearchParams())}>
                  Limpiar búsqueda y filtros
                </button>
              ) : undefined}
            >
              Prueba con menos filtros o con otra palabra clave.
            </EmptyState>
          ) : (
            <>
              <ul className={cn("space-y-3 transition-opacity", search.loading && "opacity-60")} aria-busy={search.loading}>
                {results.items.map((job) => (
                  <li key={job.id}>
                    <JobCard
                      job={job}
                      href={`/empleos/${job.slug}`}
                      selected={activeSlug === job.slug}
                      onSelect={isDesktop ? selectJob : undefined}
                      onToggleSave={(item) => toggleSave(item, patchJob)}
                    />
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <nav aria-label="Paginación" className="mt-6 flex items-center justify-between">
                  <button type="button" disabled={filters.page <= 1} onClick={() => goToPage(filters.page - 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ui-border px-3 text-sm disabled:opacity-40">
                    <ArrowLeft className="h-4 w-4" /> Anterior
                  </button>
                  <span className="text-sm text-ui-muted">Página {filters.page} de {totalPages}</span>
                  <button type="button" disabled={filters.page >= totalPages} onClick={() => goToPage(filters.page + 1)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ui-border px-3 text-sm disabled:opacity-40">
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </section>

        {isDesktop && !catalogEmpty && (
          <section aria-label="Detalle de la vacante" className="min-w-0">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-ui-border bg-ui-surface p-6 shadow-card">
              {detail.loading && !detail.data ? (
                <Spinner label="Cargando vacante" />
              ) : detail.error ? (
                <ErrorNotice message={errorMessage(detail.error)} onRetry={detail.reload} />
              ) : detail.data ? (
                <JobDetailView
                  compact
                  job={detail.data.job}
                  similar={detail.data.similar}
                  mySkills={mySkills}
                  onToggleSave={(job) => toggleSave(job, patchJob)}
                  onChange={(patch) => {
                    detail.setData((current) => current && { ...current, job: { ...current.job, ...patch } });
                    if (patch.viewer && detail.data) patchJob({ ...detail.data.job, viewer: patch.viewer });
                  }}
                />
              ) : (
                <p className="text-sm text-ui-muted">Selecciona una vacante para ver el detalle.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
