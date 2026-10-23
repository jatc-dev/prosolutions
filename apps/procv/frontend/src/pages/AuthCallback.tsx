import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../stores/authStore";
import { Button } from "@prosolutions/ui";

const PROSOLUTIONS_URL =
  import.meta.env.VITE_PROSOLUTIONS_URL || "https://prosolutions.page";

export function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    // No access token or authorization code is accepted from the URL. Identity
    // establishes the shared HttpOnly refresh cookie; AuthProvider exchanges it
    // for a short-lived token and validates the resulting session.
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (loading) return;
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    } else {
      setStatus("error");
    }
  }, [loading, isAuthenticated, navigate]);

  const retryLogin = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    window.location.assign(
      `${PROSOLUTIONS_URL}/login?redirect_uri=${redirectUri}`,
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 px-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md text-center">
        <BrandLogo variant="large" className="mx-auto mb-8" />
        {status === "loading" ? (
          <>
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {t("auth.authenticating")}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              {t("auth.syncingProfile")}
            </p>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {t("auth.loginFailed")}
            </h1>
            <p className="my-4 text-slate-600 dark:text-slate-300">
              {t("auth.identityError")}
            </p>
            <Button type="button" onClick={retryLogin} className="w-full">
              {t("auth.retryLogin")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
