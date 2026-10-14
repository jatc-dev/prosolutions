import { useEffect, useState } from "react";
import { api } from "../../services/api";

interface CVVersion {
  id: string;
  cvId: string;
  snapshot: string;
  createdAt: string;
}

interface Props {
  cvId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: unknown) => void;
}

export function VersionsModal({ cvId, isOpen, onClose, onRestore }: Props) {
  const [versions, setVersions] = useState<CVVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !cvId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/cvs/${cvId}/versions`)
      .then((res) => setVersions(res.data.versions ?? []))
      .catch((err) => setError(err?.response?.data?.message ?? "Error al cargar versiones"))
      .finally(() => setLoading(false));
  }, [isOpen, cvId]);

  const handleRestore = async (versionId: string) => {
    if (!cvId) return;
    setRestoringId(versionId);
    setError(null);
    try {
      const res = await api.post(`/cvs/${cvId}/versions/${versionId}/restore`);
      onRestore(res.data.cv?.data ?? {});
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Error al restaurar versión");
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Historial de versiones</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-6">
          {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}
          {error && <p className="mb-4 text-sm text-rose-500">{error}</p>}
          {!loading && versions.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay versiones anteriores.</p>
          )}
          <ul className="space-y-3">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {new Date(v.createdAt).toLocaleString("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => handleRestore(v.id)}
                  disabled={restoringId === v.id}
                  className="rounded-lg border border-brand-500 bg-white px-3 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40"
                >
                  {restoringId === v.id ? "Restaurando…" : "Restaurar"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
