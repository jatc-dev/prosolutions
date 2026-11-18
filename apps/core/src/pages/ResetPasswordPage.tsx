import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, ProHeader } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { identityAuthApiUrl } from "../identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();

export function ResetPasswordPage() {
  const { copy, locale, setLocale } = useCoreLocale();
  const language = locale === "es" ? "es" : "en";

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token de restablecimiento no válido o expirado.");
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${IDENTITY_API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || "No se pudo restablecer la contraseña.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("No se pudo restablecer la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <ProHeader
          activeApp="core"
          locale={language}
          onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
        />
        <div className="text-center px-6">
          <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center mx-auto mb-4 dark:bg-rose-500">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Enlace inválido</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            El enlace de restablecimiento no es válido o ha expirado.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => (window.location.href = "/forgot-password")}
              className="px-6 py-2 border border-brand-800 text-brand-900 rounded-lg hover:bg-brand-50 transition-colors font-medium dark:text-brand-300 dark:hover:bg-slate-800"
            >
              Solicitar un nuevo enlace
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/login")}
              className="px-6 py-2 bg-brand-800 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <ProHeader
        activeApp="core"
        locale={language}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
      />

      <main className="relative flex-1">
        <section className="px-6 pt-8 pb-16">
          <div className="ui-container max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-brand-800 flex items-center justify-center mx-auto mb-4 dark:bg-brand-700">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Restablecer contraseña
              </h1>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                Ingresa una nueva contraseña para tu cuenta.
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
                    Tu contraseña se ha restablecido correctamente.
                  </p>
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/login")}
                    className="px-6 py-2 bg-brand-800 text-white rounded-lg hover:bg-brand-900 transition-colors font-medium"
                  >
                    Iniciar sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu nueva contraseña"
                      required
                      autoComplete="new-password"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Confirmar contraseña
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirma tu nueva contraseña"
                      required
                      autoComplete="new-password"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Restableciendo..." : "Restablecer contraseña"}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  ¿Recuerdas tu contraseña?{" "}
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/login")}
                    className="font-medium text-brand-800 hover:underline dark:text-brand-300"
                  >
                    Inicia sesión
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
            El ecosistema de herramientas para tu carrera profesional
          </div>
        </div>
      </footer>
    </div>
  );
}
