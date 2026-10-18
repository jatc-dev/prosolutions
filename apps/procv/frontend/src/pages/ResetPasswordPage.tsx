import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { Button, ProHeader } from "@prosolutions/ui";
import { authApi } from "../services/api";
import { trackLandingFunnelEvent } from "../utils/funnelAnalytics";

export function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.reset.passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.reset.passwordTooShort"));
      return;
    }

    if (!token) {
      setError(t("auth.reset.invalidToken"));
      return;
    }

    setIsSubmitting(true);
    trackLandingFunnelEvent("password_reset_confirmed");

    try {
      await authApi.resetPassword(token, password);
      setIsSuccess(true);
      trackLandingFunnelEvent("password_reset_success");
    } catch (err: any) {
      const message = err?.response?.data?.message || t("auth.reset.resetFailed");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
                {t("auth.reset.resetTitle")}
              </h1>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                {t("auth.reset.resetDescription")}
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30">
              {error && (
                <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200">
                  {error}
                </div>
              )}

              {isSuccess ? (
                <div className="text-center space-y-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t("auth.reset.successMessage")}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                  >
                    {t("auth.signIn")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("auth.password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth.passwordPlaceholder")}
                        required
                        autoComplete="new-password"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        aria-label={showPassword ? t("common.hide") : t("common.show")}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.085c-.239.026-.483.043-.724.043-.939.025-1.885-.118-2.77-.406m4.318-1.636c1.666-.632 2.922-2.033 3.276-3.816.086-.453 1.31-7.059-.274-9.855A11.553 11.553 0 0 0 12.066 3.99c-.184-.008-.37-.012-.555-.012-.399 0-.791.032-1.175.094C9.22 4.007 8.75 4.068 8.25 4.068c-.482 0-.947-.06-1.404-.168-.093.34-0.146.704-0.146 1.075 0 3.792 4.96 4.479 7.573 3.853.73.444 1.587.02 2.277-.357.24-.119.46-.293.655-1.005a4.83 4.83 0 0 0 3.125-3.558c.206-1.047.277-2.086.212-3.121" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.878 9.878c1.075 1.075 2.82.828 4.242-.592.848-.85 1.41-1.96 1.41-3.13A6.75 6.75 0 0 0 12 3C9.442 3 7.23.484 4.636 3.158 2.917 4.837 1.843 7.12.5 9.878C.426 10.046.391 10.225.391 10.404c0 .184.01 9.762 0 10.005" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("auth.reset.passwordRequirements")}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("auth.reset.confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("auth.reset.confirmPasswordPlaceholder")}
                        required
                        autoComplete="new-password"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        aria-label={showPassword ? t("common.hide") : t("common.show")}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.085c-.239.026-.483.043-.724.043-.939.025-1.885-.118-2.77-.406m4.318-1.636c1.666-.632 2.922-2.033 3.276-3.816.086-.453 1.31-7.059-.274-9.855A11.553 11.553 0 0 0 12.066 3.99c-.184-.008-.37-.012-.555-.012-.399 0-.791.032-1.175.094C9.22 4.007 8.75 4.068 8.25 4.068c-.482 0-.947-.06-1.404-.168-.093.34-.146.704-.146 1.075 0 3.792 4.96 4.479 7.573 3.853.73.444 1.587.02 2.277-.357.24-.119.46-.293.655-1.005a4.83 4.83 0 0 0 3.125-3.558c.206-1.047.277-2.086.212-3.121" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.878 9.878c1.075 1.075 2.82.828 4.242-.592.848-.85 1.41-1.96 1.41-3.13A6.75 6.75 0 0 0 12 3C9.442 3 7.23.484 4.636 3.158 2.917 4.837 1.843 7.12.5 9.878C.426 10.046.391 10.225.391 10.404c0 .184.01 9.762 0 10.005" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? t("auth.reset.sendingButton") : t("auth.reset.submitButton")}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  {t("auth.signIn")}
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
