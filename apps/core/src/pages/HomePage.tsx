import { ProHeader, ProFooter, Input, Button } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { useState } from "react";
import { identityAuthApiUrl } from "../identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();

export function HomePage() {
  const { copy, locale, setLocale } = useCoreLocale();
  const language = locale === "es" ? "es" : "en";

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Preserve the requesting first-party module after central authentication.
  // Exact-origin allowlisting prevents open redirects to untrusted sites.
  const getPostLoginDestination = () => {
    const fallback = new URL("/dashboard", window.location.origin).toString();
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");

    // Same-origin relative paths are used by the public home login CTA.
    // Reject protocol-relative URLs and backslashes to prevent open redirects.
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")) {
      try {
        const destination = new URL(returnTo, window.location.origin);
        if (destination.origin === window.location.origin) return destination.toString();
      } catch {
        // Continue with the central module redirect or the dashboard fallback.
      }
    }

    // Preserve the requesting first-party module after central authentication.
    // Exact-origin allowlisting prevents open redirects to untrusted sites.
    const requested = params.get("redirect_uri");
    if (!requested) return fallback;

    try {
      const destination = new URL(requested);
      const allowedOrigins = new Set([
        "https://projobs.prosolutions.page",
        "https://procv.prosolutions.page",
      ]);
      if (destination.protocol !== "https:" || !allowedOrigins.has(destination.origin)) {
        return fallback;
      }
      return destination.toString();
    } catch {
      return fallback;
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setVerificationEmail(null);
    setResendMessage(null);
    setIsSubmitting(true);

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const response = await fetch(`${IDENTITY_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.message || copy.auth.loginError;
        setLoginError(message);
        if (response.status === 403 && /verif|verify|correo/i.test(message)) {
          setVerificationEmail(email);
        }
        return;
      }

      const data = await response.json();
      if (!data.accessToken) {
        setLoginError("La autenticación no devolvió una sesión válida. Intenta de nuevo.");
        return;
      }
      // Keep the short-lived access token in this origin's session only.
      // The refresh cookie is shared by the platform's first-party subdomains.
      sessionStorage.setItem("pro_identity_token", data.accessToken);
      window.location.assign(getPostLoginDestination());
    } catch {
      setLoginError(copy.auth.loginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    setIsResending(true);
    setResendMessage(null);
    try {
      const response = await fetch(`${IDENTITY_API_URL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = await response.json().catch(() => ({}));
      setResendMessage(response.ok
        ? "Si la cuenta existe y aún no está verificada, enviaremos un nuevo enlace. Revisa también el correo no deseado."
        : data.message || "No se pudo solicitar otro enlace. Espera un minuto e inténtalo de nuevo.");
    } catch {
      setResendMessage("No se pudo conectar con el servicio de correo. Inténtalo de nuevo.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <ProHeader
        activeApp="core"
        locale={language === "es" ? "es" : "en"}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
      />

      <main className="relative py-12 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex justify-center">
            {/* Product marketing belongs on the public landing page, not the login form. */}
            {/* Right Column: Login Form */}
            <div className="w-full max-w-md">
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
                    <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                  </div>
                )}
                {verificationEmail && (
                  <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <button type="button" onClick={handleResendVerification} disabled={isResending}
                      className="text-sm font-semibold text-amber-800 underline disabled:opacity-60 dark:text-amber-200">
                      {isResending ? "Enviando..." : "Reenviar correo de verificación"}
                    </button>
                    {resendMessage && <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{resendMessage}</p>}
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
