import { ProHeader, ProFooter, Input, Button } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { useState } from "react";

const IDENTITY_API_URL =
  import.meta.env.VITE_IDENTITY_API_URL ||
  "https://identity.prosolutions.page/api/auth/login";

export function HomePage() {
  const { copy, locale } = useCoreLocale();
  const language = locale === "es" ? "es" : "en";

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch(IDENTITY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setLoginError(errorData.message || copy.auth.loginError);
        return;
      }

      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem(
          "procv_auth",
          JSON.stringify({ accessToken: data.accessToken }),
        );
        setIsSubmitting(false);
        window.location.href = `${window.location.origin}/dashboard`;
      } else {
        setLoginError(copy.auth.loginError);
      }
    } catch {
      setLoginError(copy.auth.loginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <ProHeader
        activeApp="core"
        locale={language === "es" ? "es" : "en"}
        onLocaleChange={() => {}}
      />

      <main className="relative py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column: Platform Presentation & Modules */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
                  {copy.home.title}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  {copy.home.subtitle}
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
                      {copy.home.moduleProcv.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {copy.home.moduleProcv.badge}
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                  {copy.home.moduleProcv.description}
                </p>
                <a
                  href="https://procv.prosolutions.page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 border border-brand-600 dark:border-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  {copy.home.moduleProcv.action}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
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
                      {copy.home.moduleProjobs.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {copy.home.moduleProjobs.badge}
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                  {copy.home.moduleProjobs.description}
                </p>
                <a
                  href="https://projobs.prosolutions.page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-cyan-600 dark:text-cyan-400 bg-white dark:bg-slate-800 border border-cyan-600 dark:border-cyan-400 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors"
                >
                  {copy.home.moduleProjobs.action}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-8 dark:bg-slate-900 shadow-lg dark:shadow-black/30 max-w-md w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    {copy.auth.loginTitle}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {copy.auth.loginSubtitle}
                  </p>
                </div>

                {loginError && (
                  <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {loginError}
                    </p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <Input
                    label={copy.auth.email}
                    type="email"
                    name="email"
                    placeholder={copy.auth.emailPlaceholder}
                    required
                  />

                  <Input
                    label={copy.auth.password}
                    type="password"
                    name="password"
                    placeholder={copy.auth.passwordPlaceholder}
                    required
                  />

                  <div className="flex justify-end mb-2">
                    <a
                      href="/forgot-password"
                      className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      {copy.auth.forgotPassword}
                    </a>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isSubmitting ? copy.auth.signingIn : copy.auth.signIn}
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {copy.auth.noAccount}
                  </p>
                  <a
                    href="/register"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    {copy.auth.createAccount}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ProFooter locale={language === "es" ? "es" : "en"} />
    </div>
  );
}
