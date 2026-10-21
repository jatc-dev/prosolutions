import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { Button, ProHeader } from "@prosolutions/ui";
import { authApi } from "../services/api";

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const language = i18n.language?.split("-")[0] || "en";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.register(email, password, name);
      setIsSuccess(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("auth.registerError");
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
                {t("auth.registerTitle")}
              </h1>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                {t("auth.registerDescription")}
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
                    {t("auth.registerSuccess", "Cuenta creada correctamente. Revisa tu correo y sigue el enlace de verificación antes de iniciar sesión.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
                  >
                    {t("auth.signIn")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("auth.name")}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("auth.namePlaceholder")}
                      required
                      autoComplete="name"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

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

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("auth.password")}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      required
                      autoComplete="new-password"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("auth.reset.passwordRequirements")}
                    </p>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? t("auth.creatingAccount") : t("auth.registerButton")}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t("auth.hasAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-300"
                  >
                    {t("auth.signIn")}
                  </button>
                </p>
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
        </div>
      </footer>
    </div>
  );
}
