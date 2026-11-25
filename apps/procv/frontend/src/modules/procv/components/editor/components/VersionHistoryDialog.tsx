import React, { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import { api } from "../../../../../shared/services/api";
import { normalizeLoadedCVData } from "../../../../../stores/cvEditorStore";
import type { CVData } from "../../../../../types";

interface VersionItem {
  id: string;
  createdAt: string;
}

interface VersionHistoryDialogProps {
  cvId: string;
  onClose: () => void;
  /** Renders a CV the same way as the editor preview. */
  renderPreview: (data: CVData) => React.ReactNode;
  /** Saves pending edits, restores the version and reloads the editor. */
  onRestore: (versionId: string) => Promise<void>;
}

const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/** "hace 5 minutos", "hace 3 horas", "hace 2 días". */
export function relativeTime(date: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.round(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

/**
 * Version history: a version is kept at most every 30 minutes of editing and
 * the last 10 are listed. Restoring keeps the current content as a version,
 * so it can be undone from here as well.
 */
export function VersionHistoryDialog({ cvId, onClose, renderPreview, onRestore }: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<VersionItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<CVData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get(`/cvs/${cvId}/versions`)
      .then((response) => {
        if (!active) return;
        const list: VersionItem[] = response.data?.versions ?? [];
        setVersions(list);
        if (list[0]) setSelected(list[0].id);
      })
      .catch(() => active && setError("No se pudo cargar el historial. Inténtalo de nuevo."));
    return () => {
      active = false;
    };
  }, [cvId]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoadingPreview(true);
    setPreview(null);
    api
      .get(`/cvs/${cvId}/versions/${selected}`)
      .then((response) => active && setPreview(normalizeLoadedCVData(response.data?.version?.data ?? {})))
      .catch(() => active && setError("No se pudo abrir esta versión."))
      .finally(() => active && setLoadingPreview(false));
    return () => {
      active = false;
    };
  }, [cvId, selected]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !restoring) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, restoring]);

  const restore = async () => {
    if (!selected) return;
    const item = versions?.find((version) => version.id === selected);
    const when = item ? dateFormat.format(new Date(item.createdAt)) : "";
    if (!window.confirm(`¿Restaurar la versión del ${when}? Tu contenido actual se guardará en el historial, así que también podrás volver a él.`)) return;
    setRestoring(true);
    try {
      await onRestore(selected);
      onClose();
    } catch {
      setError("No se pudo restaurar la versión.");
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 sm:p-8" onClick={() => !restoring && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="relative flex w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 id="version-history-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <History className="h-5 w-5" aria-hidden="true" />
              Historial de versiones
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Guardamos una versión cada 30 minutos de edición y conservamos las últimas 10.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={restoring}
            autoFocus
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {error ? <p role="alert" className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

        {versions === null && !error ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Cargando historial…</p>
        ) : versions && versions.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-600 dark:text-slate-300">
            Aún no hay versiones anteriores. Aparecerán a medida que edites tu hoja de vida.
          </p>
        ) : versions ? (
          <div className="grid min-h-0 gap-4 p-5 md:grid-cols-[16rem_1fr]">
            <ul className="space-y-1" aria-label="Versiones">
              {versions.map((version, index) => {
                const date = new Date(version.createdAt);
                const isSelected = version.id === selected;
                return (
                  <li key={version.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(version.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                        isSelected
                          ? "bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-200 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-800"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="block font-medium">{dateFormat.format(date)}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {relativeTime(date)}{index === 0 ? " · la más reciente" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="min-w-0">
              <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                {loadingPreview || !preview ? (
                  <p className="py-10 text-center text-sm text-slate-500">Cargando vista previa…</p>
                ) : (
                  <div className="pointer-events-none origin-top select-none" aria-label="Vista previa de la versión">
                    {renderPreview(preview)}
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={restoring}
                  className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void restore()}
                  disabled={!preview || restoring}
                  className="inline-flex min-h-10 items-center rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {restoring ? "Restaurando…" : "Restaurar esta versión"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
