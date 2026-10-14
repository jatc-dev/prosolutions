import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface GuestUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuestUpgradeModal({ isOpen, onClose }: GuestUpgradeModalProps) {
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

  const handleGoToRegister = () => {
    onClose();
    navigate("/auth");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v7m0 0l-4-4m4 4l4-4M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {t("guestUpgradeModal.title", "Plantilla Pro bloqueada")}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={t("common.close", "Close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {t(
            "guestUpgradeModal.description",
            "Esta plantilla solo está disponible con una cuenta gratuita. ¡Regístrate y sigue editando tu CV sin perder tu progreso!"
          )}
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleGoToRegister}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {t("guestUpgradeModal.cta", "Registrarme gratis")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="sm:w-32 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("guestUpgradeModal.cancel", "Seguir editando")}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t("guestUpgradeModal.hint", "Tu progreso actual se guardará automáticamente en tu navegador.")}
        </p>
      </div>
    </div>
  );
}