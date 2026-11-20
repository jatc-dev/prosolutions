import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RESOURCE_URLS } from "@prosolutions/ui";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../stores/authStore";

/**
 * ProCV has no landing of its own: signed-in users go straight to their
 * workspace, guests to the public "create a CV" page on ProSolutions
 * (prerendered, indexable), which links to the guest editor.
 */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) navigate("/dashboard", { replace: true });
    else window.location.replace(RESOURCE_URLS.createCv);
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ui-bg text-ui-muted">
      <div className="text-center" role="status" aria-live="polite">
        <BrandLogo variant="large" className="mx-auto mb-4" />
        <p>{t("common.loading")}</p>
      </div>
    </div>
  );
}
