import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { Input, Button, ProHeader } from "@prosolutions/ui";
import { authApi } from "../services/api";
import { trackLandingFunnelEvent } from "../utils/funnelAnalytics";

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const language = i18n.language?.split("-")[0] || "en";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    trackLandingFunnelEvent("password_reset_requested");

    try {
      await authApi.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("auth.reset.errorSendingEmail");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    setIsSubmitted(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <ProHeader
        activeApp="procv"
        locale={language === "es" ? "es" : "en"}
        onLocaleChange={() => i18n.changeLanguage(language === "es" ? "en" : "es")}
      />

      <main className="relative flex-1">
        <section className="px-6 pt-8 pb-16">
          <div className="ui-container max-w-md mx-auto">
            <div className="text-center mb-8">
              <BrandLogo variant="hero" to="/" className="mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {t("auth.reset.title")}
              </h1>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                {isSubmitted
                  ? t("auth.reset.descriptionSubmitted")
                  : t("auth.reset.description")}
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30">
              {error && (
                <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200">
                  {error}
                </div>
              )}

              {isSubmitted ? (
                <div className="text-center space-y-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t("auth.reset.emailSentMessage", "If an account with that email exists, a reset link has been sent.")}
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
                  >
                    {t("auth.reset.sendAgain")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("auth.email")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      required
                      autoComplete="email"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting
                      ? t("auth.reset.sendingButton")
                      : t("auth.reset.sendButton")}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  {t("auth.reset.backToLogin")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 px-6 py-6 text-white dark:bg-slate-950">
        <div className="ui-container max-w-md mx-auto text-center">
          <div className="text-sm text-slate-300 dark:text-slate-400">
            {t("footer.description")}
          </div>
          <div className="mt-2 text-xs text-slate-300 dark:text-slate-400">
            {t("footer.engineering")}
            <a
              className="text-brand-300 transition-colors hover:text-brand-200 dark:text-brand-200 dark:hover:text-brand-100"
              href="https://jatc.dev"
              target="_blank"
              rel="noreferrer"
            >
              jatc.dev
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
