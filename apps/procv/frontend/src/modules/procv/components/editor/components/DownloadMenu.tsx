import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText, FileType2, Loader2 } from "lucide-react";

interface DownloadMenuProps {
  /** What is downloaded: the CV or the cover letter. */
  documentLabel: string;
  onPdf: () => void;
  onWord: () => void;
  busy: boolean;
}

/** One "Descargar" button; the format (PDF or Word) is chosen in its menu. */
export function DownloadMenu({ documentLabel, onPdf, onWord, busy }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  const item =
    "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-brand-50 focus:bg-brand-50 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Descargar ${documentLabel}`}
        title={`Descargar ${documentLabel} en PDF o Word`}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-transparent bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:px-4"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        <span className="hidden sm:inline">{busy ? "Generando…" : "Descargar"}</span>
        {!busy ? <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /> : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Formato de ${documentLabel}`}
          onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <button ref={firstItemRef} type="button" role="menuitem" className={item} onClick={() => choose(onPdf)}>
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">PDF</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Para enviar y postularte. Se ve igual en cualquier equipo.</span>
            </span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => choose(onWord)}>
            <FileType2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
            <span>
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Word (.docx)</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Editable, con el estilo de tu plantilla.</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
