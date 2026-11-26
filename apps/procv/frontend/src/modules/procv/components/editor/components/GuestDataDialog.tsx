import React, { useEffect } from "react";
import { CloudUpload, Download, LogOut, Trash2, X } from "lucide-react";

export type GuestDataDialogMode = "leave" | "clear";

interface GuestDataDialogProps {
  mode: GuestDataDialogMode;
  onClose: () => void;
  onDownload: () => void;
  /** Leave the editor keeping the draft (it still expires after 2 hours). */
  onLeave: () => void;
  /** Delete the CV from this browser (and leave, in "leave" mode). */
  onClear: () => void;
  signUpHref?: string;
}

const COPY: Record<GuestDataDialogMode, { title: string; body: string }> = {
  leave: {
    title: "Antes de salir",
    body: "Tu hoja de vida solo está guardada en este navegador y se borra sola tras 2 horas sin cambios. Descárgala o crea una cuenta gratis para guardarla en la nube. Si estás en un computador público, borra tus datos al salir.",
  },
  clear: {
    title: "Borrar tus datos de este navegador",
    body: "Se borrarán tu hoja de vida y tu carta de este equipo. Si quieres conservarlas, descárgalas o crea una cuenta gratis antes.",
  },
};

/** What a guest can do with a CV that only lives in this browser. */
export function GuestDataDialog({ mode, onClose, onDownload, onLeave, onClear, signUpHref = "/auth" }: GuestDataDialogProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = COPY[mode];
  const secondary =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-brand-700 bg-white px-3 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:border-brand-500 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-data-title"
        className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <h2 id="guest-data-title" className="pr-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.body}</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onDownload} className={secondary}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar PDF
          </button>
          <a
            href={signUpHref}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-800 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            <CloudUpload className="h-4 w-4" aria-hidden="true" />
            Crear cuenta gratis
          </a>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row sm:justify-between">
          {mode === "leave" ? (
            <>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Borrar mis datos y salir
              </button>
              <button
                type="button"
                onClick={onLeave}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Salir
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Borrar mis datos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
