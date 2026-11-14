import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ProHeader } from "@prosolutions/ui";
import { useParams } from "react-router-dom";
import { useAuth } from "../stores/authStore";
import { CompleteCVEditor } from "../modules/procv/components/editor/CompleteCVEditor";

const IDENTITY_URL =
  import.meta.env.VITE_IDENTITY_URL ||
  "https://prosolutions.page/login";

export function CVEditorPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  // Redirect to ProIdentity SSO when user tries to save to cloud without auth
  useEffect(() => {
    const handleSaveToCloud = () => {
      if (!isAuthenticated) {
        const redirectUri = encodeURIComponent(window.location.href);
        window.location.href = `${IDENTITY_URL}?redirect_uri=${redirectUri}`;
      }
    };

    // Expose save-to-cloud check to global scope for editor integration
    (window as any).__procvRequireAuth = handleSaveToCloud;

    return () => {
      delete (window as any).__procvRequireAuth;
    };
  }, [isAuthenticated]);

  return (
    <div className="ui-page min-h-screen bg-gradient-to-br from-brand-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} />
      {!isAuthenticated && (
        <div className="fixed top-4 left-4 right-4 max-w-md z-50 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-900/30 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                {"Guardar en la nube requiere autenticación"}
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {"Tu progreso se guarda localmente. Inicia sesión para sincronizar con ProJobs y guardar en la nube."}
              </p>
            </div>
          </div>
        </div>
      )}
      <CompleteCVEditor cvId={cvId} />
    </div>
  );
}
