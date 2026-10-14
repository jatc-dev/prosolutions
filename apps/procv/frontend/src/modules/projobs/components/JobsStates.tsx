import React from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../../shared/components/ui/skeleton";

/** Placeholder grid matching the JobCard geometry (prevents CLS). */
export function JobsSkeleton({ count = 6 }: { count?: number }) {
  const { t } = useTranslation();

  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4" data-testid="jobs-skeleton">
      <span className="sr-only">{t("common.loading", "Cargando...")}</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-2 h-4 w-2/5" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Friendly empty state instead of a blank page. */
export function JobsEmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="ui-empty-state" role="status" data-testid="jobs-empty">
      <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
        {t("jobs.emptyTitle", "No encontramos ofertas con esos filtros")}
      </p>
      <p className="mt-2 text-sm">{t("jobs.emptyBody", "Prueba con otra tecnología, amplía la modalidad o limpia la búsqueda.")}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-projobs-600 px-4 py-2 text-sm font-bold text-white"
      >
        {t("jobs.clearFilters", "Limpiar filtros")}
      </button>
    </div>
  );
}

/** Error state with a retry affordance. */
export function JobsErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="ui-error-state" role="alert" data-testid="jobs-error">
      <p className="font-semibold">{t("jobs.errorTitle", "No pudimos cargar las vacantes")}</p>
      <p className="mt-1 text-sm">{t("jobs.errorBody", "Estamos mostrando el último listado disponible. Reintenta en unos segundos.")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-projobs-700 px-4 py-2 text-sm font-bold text-white"
      >
        {t("common.retry", "Reintentar")}
      </button>
    </div>
  );
}
