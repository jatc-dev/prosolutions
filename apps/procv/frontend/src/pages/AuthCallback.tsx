import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { useAuth } from "../stores/authStore";
import { ProHeader } from "@prosolutions/ui";
import { Button } from "@prosolutions/ui";

const IDENTITY_URL =
  import.meta.env.VITE_IDENTITY_URL ||
  "https://prosolutions.page/login";

export function AuthCallback() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithToken } = useAuth();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setErrorMessage(errorDescription || t("auth.identityError"));
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage(t("auth.noToken"));
      return;
    }

    setStatus("loading");

    // Guardar el token y sincronizar perfil
    signInWithToken(token)
      .then(() => {
        setStatus("success");
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        setStatus("error");
        setErrorMessage(t("auth.tokenExchangeFailed"));
      });
  }, [searchParams, signInWithToken, navigate, t]);

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <BrandLogo variant="large" className="mx-auto mb-8" />
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {t("auth.authenticating")}
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            {t("auth.syncingProfile")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="max-w-md w-full px-6">
          <BrandLogo variant="large" className="mx-auto mb-8" />
          <div className="rounded-3xl border border-red-100 dark:border-red-900/30 bg-white p-8 dark:bg-slate-900 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">
              {t("auth.loginFailed")}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-center mb-6">
              {errorMessage || t("auth.identityError")}
            </p>
            <Button
              type="button"
              onClick={() => {
                const redirectUri = encodeURIComponent(window.location.origin + "/auth/callback");
                window.location.href = `${IDENTITY_URL}?redirect_uri=${redirectUri}`;
              }}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
            >
              {t("auth.retryLogin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="text-center">
        <BrandLogo variant="large" className="mx-auto mb-8" />
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-800 dark:text-slate-100">
          {t("auth.authenticating")}
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          {t("auth.syncingProfile")}
        </p>
      </div>
    </div>
  );
}
