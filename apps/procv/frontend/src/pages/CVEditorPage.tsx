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
    <div className="ui-page min-h-screen bg-ui-bg">
      <ProHeader activeApp="procv" locale={language === "es" ? "es" : "en"} onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")} />
      <CompleteCVEditor cvId={cvId} />
    </div>
  );
}
