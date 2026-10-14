import React from "react";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { MODALITY_LABELS, SENIORITY_LABELS, EMPTY_QUERY, type JobsQuery } from "../types";
interface JobsToolbarProps {
  query: JobsQuery;
  /** Technologies actually present in the dataset (intersection order). */
  technologies: string[];
  resultCount: number;
  onChange: (next: JobsQuery) => void;
  onReset: () => void;
  busy: boolean;
}

const selectClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors focus:border-projobs-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

/** Search + facets for the board. Fully controlled by the page. */
export function JobsToolbar({ query, technologies, resultCount, onChange, onReset, busy }: JobsToolbarProps) {
  const { t } = useTranslation();
  const isFiltered = query !== EMPTY_QUERY && (query.text !== "" || query.technology !== "" || query.modality !== "" || query.seniority !== "");

  const techOptions = React.useMemo(() => {
    const union = new Set<string>(technologies);
    return [...union].sort((a, b) => a.localeCompare(b));
  }, [technologies]);

  return (
    <section
      className="rounded-card border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900"
      aria-label={t("jobs.filters", "Filtros de empleos")}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={query.text}
          onChange={(event) => onChange({ ...query, text: event.target.value })}
          placeholder={t("jobs.searchPlaceholder", "Buscar por puesto, empresa o tecnología (ej. React, Senior, Python)")}
          aria-label={t("jobs.search", "Buscar empleos")}
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-projobs-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("jobs.technology", "Tecnología")}
          </span>
          <select
            className={selectClass}
            value={query.technology}
            onChange={(event) => onChange({ ...query, technology: event.target.value })}
          >
            <option value="">{t("jobs.allTechnologies", "Todas")}</option>
            {techOptions.map((tech) => (
              <option key={tech} value={tech}>
                {tech}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("jobs.modality", "Modalidad")}
          </span>
          <select
            className={selectClass}
            value={query.modality}
            onChange={(event) => onChange({ ...query, modality: event.target.value })}
          >
            <option value="">{t("jobs.allModalities", "Todas")}</option>
            {Object.entries(MODALITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("jobs.seniority", "Experiencia")}
          </span>
          <select
            className={selectClass}
            value={query.seniority}
            onChange={(event) => onChange({ ...query, seniority: event.target.value })}
          >
            <option value="">{t("jobs.allLevels", "Todos")}</option>
            {Object.entries(SENIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          {busy
            ? t("jobs.filtering", "Filtrando...")
            : t("jobs.resultsCount", "{{count}} ofertas encontradas", { count: resultCount })}
        </p>
        {isFiltered ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {t("jobs.clearFilters", "Limpiar filtros")}
          </button>
        ) : null}
      </div>
    </section>
  );
}


