import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { Input, Button, ProHeader } from "@prosolutions/ui";
import { authApi, VERIFICATION_RESEND_COOLDOWN_SECONDS } from "../services/api";
import { useAuthStore } from "../stores/authStore";

const RESEND_COOLDOWN_KEY = "procv_verification_resend_until";

function readStoredCooldown(): number {
  try {
    const until = Number(localStorage.getItem(RESEND_COOLDOWN_KEY));
    if (!until || Number.isNaN(until)) return 0;
    const remaining = Math.ceil((until - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

function storeCooldown(seconds: number): void {
  try {
    localStorage.setItem(RESEND_COOLDOWN_KEY, String(Date.now() + seconds * 1000));
  } catch {
    // Storage unavailable: the in-memory countdown still works.
  }
}

export function EmailVerificationPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const signInWithToken = useAuthStore((state) => state.signInWithToken);

  const language = i18n.language?.split("-")[0] || "en";

  const query = new URLSearchParams(location.search);
  const token = query.get("token") || "";
  const email = query.get("email") || "";

  const [status, setStatus] = useState<"loading" | "checking" | "verified" | "error" | "resend">("loading");
  const [error, setError] = useState<string | null>(null);
  // An email was just sent when landing here (e.g. right after registration):
  // prefill the address and start the countdown from the stored deadline.
  const [resendEmail, setResendEmail] = useState(email);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(readStoredCooldown);

  useEffect(() => {
    if (token) {
      setStatus("checking");
      authApi.verifyEmail(token)
        .then(async (response) => {
          setStatus("verified");
          // Verification issues the session: sign in and go straight to the
          // dashboard. Older responses without a token fall back to login.
          const accessToken = (response.data as { accessToken?: string })?.accessToken;
          if (accessToken) {
            try {
              await signInWithToken(accessToken);
            } catch {
              // Fall back to the login screen if the follow-up request fails.
            }
            setTimeout(() => navigate("/dashboard"), 1500);
          } else {
            setTimeout(() => navigate("/"), 2000);
          }
        })
        .catch((err: any) => {
          const message = err?.response?.data?.message || t("auth.verification.errorExpired");
          setError(message);
          setStatus("error");
        });
    } else {
      setStatus("resend");
      // Server-side source of truth for the cooldown: a verification email was
      // just sent (registration), so the countdown must start here even if the
      // localStorage seed did not reach this client.
      if (email) {
        authApi
          .verificationCooldown(email)
          .then((response) => {
            const seconds = Number((response.data as { retryAfterSeconds?: number })?.retryAfterSeconds) || 0;
            if (seconds > 0) {
              setCooldown(seconds);
              storeCooldown(seconds);
            }
          })
          .catch(() => {
            // Fall back to the localStorage seed if the lookup fails.
          });
      }
    }
  }, [token, navigate, t, signInWithToken, email]);

  // Countdown before another verification email can be requested.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (cooldown > 0 || isSubmitting) return;
      setIsSubmitting(true);
      setError(null);
      setResendSuccess(false);

      try {
        const response = await authApi.resendVerification(resendEmail);
        setResendSuccess(true);
        const retryAfter = (response.data as { retryAfterSeconds?: number })?.retryAfterSeconds;
        const seconds =
          typeof retryAfter === "number" && retryAfter > 0
            ? retryAfter
            : VERIFICATION_RESEND_COOLDOWN_SECONDS;
        setCooldown(seconds);
        storeCooldown(seconds);
      } catch (err: any) {
        // Cooldown response (429): show the remaining time instead of an error.
        const retryAfter = err?.response?.data?.retryAfterSeconds;
        if (err?.response?.status === 429 && typeof retryAfter === "number") {
          const seconds = retryAfter > 0 ? retryAfter : VERIFICATION_RESEND_COOLDOWN_SECONDS;
          setCooldown(seconds);
          storeCooldown(seconds);
          return;
        }
        const message = err?.response?.data?.message || t("auth.verification.resendError");
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [cooldown, isSubmitting, resendEmail, t]
  );

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

              {status === "checking" && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {t("auth.verification.checking")}
                  </h1>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">
                    {t("auth.verification.subtitle")}
                  </p>
                </>
              )}

              {status === "verified" && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {t("auth.verification.verifiedTitle")}
                  </h1>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">
                    {t("auth.verification.verifiedMessage")}
                  </p>
                </>
              )}

              {(status === "error" || status === "resend") && (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {t("auth.verification.title")}
                  </h1>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">
                    {email
                      ? `${t("auth.verification.description")} ${email}`
                      : t("auth.verification.enterEmail")}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30">
              {error && (
                <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200">
                  {error}
                </div>
              )}

              {resendSuccess || (cooldown > 0 && status === "resend") ? (
                <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
                  {t("auth.verification.resendSuccess")}
                </div>
              ) : null}

              {status === "resend" && (
                <form onSubmit={handleResend} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t("auth.email")}
                    </label>
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      required
                      autoComplete="email"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || cooldown > 0}
                    className="w-full"
                  >
                    {cooldown > 0
                      ? t("auth.verification.resendCooldown", { seconds: cooldown })
                      : t("auth.verification.resendButton")}
                  </Button>
                </form>
              )}

              <div className="mt-6 text-center">
                <Link
                  to="/"
                  className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  {t("auth.verification.backToLogin")}
                </Link>
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
