import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface UpgradeTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeTemplateModal({ isOpen, onClose }: UpgradeTemplateModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateAccount = () => {
    // Los datos del invitado se conservan en localStorage (procv_guest_resume)
    // No se borra nada al redirigir al registro
    onClose();
    navigate("/auth");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-brand-600 to-blue-700 px-6 py-8 text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v7m0 0l-4-4m4 4l4-4M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-center text-xl font-bold">
            {t("upgradeTemplateModal.title", "Desbloquea todas las plantillas")}
          </h2>
          <p className="mt-2 text-center text-sm text-white/80">
            {t(
              "upgradeTemplateModal.subtitle",
              "Regístrate gratis y accede a diseños profesionales sin perder tu progreso."
            )}
          </p>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-6">
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            {t(
              "upgradeTemplateModal.description",
              "Tu CV actual se guardó automáticamente en tu navegador. Al crear tu cuenta, podrás continuar editando desde cualquier dispositivo."
            )}
          </p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {t("upgradeTemplateModal.cta", "Registrar gratis")}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {t("upgradeTemplateModal.cancel", "Seguir con plantilla actual")}
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            {t("upgradeTemplateModal.hint", "Tu información se mantiene segura. Sin tarjeta de crédito requerida.")}
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-white/70 hover:text-white focus:outline-none"
          aria-label={t("common.close", "Close")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}