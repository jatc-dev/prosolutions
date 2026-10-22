import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { ProHeader } from "@prosolutions/ui";
import { Button } from "@prosolutions/ui";
import { useAuth } from "../stores/authStore";

const IDENTITY_URL =
  import.meta.env.VITE_IDENTITY_URL ||
  "https://prosolutions.page/login";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  const handleIdentityLogin = () => {
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/callback");
    window.location.href = `${IDENTITY_URL}?redirect_uri=${redirectUri}`;
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <BrandLogo variant="large" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            {t("auth.welcomeBack")}
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            {t("auth.redirecting")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <ProHeader
        activeApp="procv"
        locale={language === "es" ? "es" : "en"}
        onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")}
      />

      <main className="relative py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column: Platform Presentation & Modules */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
                  {t("home.title")}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t("home.subtitle")}
                </p>
              </div>

              {/* Module 1: ProCV */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-6 dark:bg-slate-900 shadow-sm dark:shadow-black/20 hover:border-brand-500/50 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2-11-6z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                      {t("home.moduleProcv.title")}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {t("home.moduleProcv.badge")}
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                  {t("home.moduleProcv.description")}
                </p>
                <Link
                  to="/editor-free"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 border border-brand-600 dark:border-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  {t("home.moduleProcv.action")}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>

              {/* Module 2: ProJobs */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-6 dark:bg-slate-900 shadow-sm dark:shadow-black/20 hover:border-cyan-500/50 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                      {t("home.moduleProjobs.title")}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {t("home.moduleProjobs.badge")}
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                  {t("home.moduleProjobs.description")}
                </p>
                <a
                  href="https://projobs.prosolutions.page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-800 border border-cyan-600 dark:border-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                >
                  {t("home.moduleProjobs.action")}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Column: SSO Login Delegate */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-8 dark:bg-slate-900 shadow-lg dark:shadow-black/30 max-w-md w-full">
                <div className="text-center mb-8">
                  <BrandLogo variant="large" className="mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {t("auth.loginTitle")}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {t("auth.loginSubtitle")}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleIdentityLogin}
                  size="lg"
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {t("auth.signInWithProIdentity")}
                </Button>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {t("auth.noAccount")}
                  </p>
                  <Link
                    to="/register"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    {t("auth.createAccount")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
