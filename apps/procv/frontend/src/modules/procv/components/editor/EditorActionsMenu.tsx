import { useRef, useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onExportXml: () => void;
  onExportJson: () => void;
  onImport: () => void;
  onSmartImport?: () => void;
  onVersions: () => void;
  onFileDrop?: (file: File) => void;
  isLoading?: {
    save?: boolean;
    exportPdf?: boolean;
    exportXml?: boolean;
    exportJson?: boolean;
    import?: boolean;
    smartImport?: boolean;
  };
}

export function EditorActionsMenu({
  isOpen,
  onClose,
  onSave,
  onExportPdf,
  onExportXml,
  onExportJson,
  onImport,
  onSmartImport,
  onVersions,
  onFileDrop,
  isLoading = {},
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Pequeño delay para evitar que se cierre inmediatamente al abrir
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          onClose();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ActionButton = ({
    onClick,
    children,
    loading = false,
    shortcut,
    icon
  }: {
    onClick: () => void;
    children: React.ReactNode;
    loading?: boolean;
    shortcut?: string;
    icon?: React.ReactNode;
  }) => (
    <button
      onClick={() => {
        onClick();
        if (!loading) onClose();
      }}
      disabled={loading}
      className="group flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">{icon}</span>}
        <span className={loading ? "animate-pulse" : ""}>{children}</span>
        {loading && (
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-200 animate-spin"></div>
        )}
      </div>
      {shortcut && (
        <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-300">
          {shortcut}
        </span>
      )}
    </button>
  );

  return (
    <div
      ref={ref}
      className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Acciones del Editor</h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-2">
        <div className="mb-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Acciones Rápidas
        </div>
        <ActionButton
          onClick={onSave}
          loading={isLoading.save}
          shortcut="Ctrl+S"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          }
        >
          Guardar Cambios
        </ActionButton>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700" />

      {/* Export Section */}
      <div className="p-2">
        <div className="mb-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Exportar
        </div>
        <ActionButton
          onClick={onExportPdf}
          loading={isLoading.exportPdf}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          PDF
        </ActionButton>
        <ActionButton
          onClick={onExportXml}
          loading={isLoading.exportXml}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          XML
        </ActionButton>
        <ActionButton
          onClick={onExportJson}
          loading={isLoading.exportJson}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        >
          JSON
        </ActionButton>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700" />

      {/* Import Section */}
      <div className="p-2">
        <div className="mb-1 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">
          Importar
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
              : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const files = e.dataTransfer.files;
            if (files.length > 0 && onFileDrop) {
              onFileDrop(files[0]);
            }
          }}
        >
          <svg className="mx-auto mb-2 h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            Arrastra archivos aquí o
          </p>
          <ActionButton
            onClick={onImport}
            loading={isLoading.import}
          >
            Importar JSON/XML
          </ActionButton>
          {onSmartImport ? (
            <div className="mt-2">
              <ActionButton
                onClick={onSmartImport}
                loading={isLoading.smartImport}
              >
                Importacion inteligente (PDF/DOCX/TXT)
              </ActionButton>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Formatos soportados: JSON/XML y PDF/DOCX/TXT
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700" />

      {/* History Section */}
      <div className="p-2">
        <ActionButton
          onClick={onVersions}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          Historial de Versiones
        </ActionButton>
      </div>

      {/* Footer */}
      <div className="rounded-b-lg border-t border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Usa Ctrl+S para guardar rápidamente
        </p>
      </div>
    </div>
  );
}
