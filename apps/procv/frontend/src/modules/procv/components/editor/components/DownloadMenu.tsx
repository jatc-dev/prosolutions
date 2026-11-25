import React from "react";
import { Download, FileText, FileType2, Loader2 } from "lucide-react";
import { ActionMenu } from "./ActionMenu";

interface DownloadMenuProps {
  /** What is downloaded: the CV or the cover letter. */
  documentLabel: string;
  onPdf: () => void;
  onWord: () => void;
  busy: boolean;
}

/** One "Descargar" button; the format (PDF or Word) is chosen in its menu. */
export function DownloadMenu({ documentLabel, onPdf, onWord, busy }: DownloadMenuProps) {
  return (
    <ActionMenu
      label={busy ? "Generando…" : "Descargar"}
      ariaLabel={`Descargar ${documentLabel}`}
      title={`Descargar ${documentLabel} en PDF o Word`}
      icon={busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      menuLabel={`Formato de ${documentLabel}`}
      disabled={busy}
      buttonClassName="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-700 bg-white px-3 py-2 text-sm font-medium text-brand-900 shadow-sm hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:border-brand-500 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40 sm:px-4"
      items={[
        {
          label: "PDF",
          description: "Para enviar y postularte. Se ve igual en cualquier equipo.",
          icon: <FileText className="h-5 w-5 text-red-600" />,
          onSelect: onPdf,
        },
        {
          label: "Word (.docx)",
          description: "Editable, con el estilo de tu plantilla.",
          icon: <FileType2 className="h-5 w-5 text-blue-600" />,
          onSelect: onWord,
        },
      ]}
    />
  );
}
