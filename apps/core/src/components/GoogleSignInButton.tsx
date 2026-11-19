import { useEffect, useState } from "react";
import { identityAuthApiUrl } from "../identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();

/** Shows "Continue with Google" only when ProIdentity has Google configured. */
export function GoogleSignInButton({
  next,
  privacyAccepted,
  disabled = false,
  label = "Continuar con Google",
}: {
  /** Absolute URL to return to after signing in (allow-listed by ProIdentity). */
  next: string;
  /** The user accepted the privacy policy (recorded if the account is new). */
  privacyAccepted: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${IDENTITY_API_URL}/providers`)
      .then((response) => (response.ok ? response.json() : { google: false }))
      .then((providers: { google?: boolean }) => {
        if (active) setAvailable(Boolean(providers.google));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  const href = `${IDENTITY_API_URL}/google/start?next=${encodeURIComponent(next)}${privacyAccepted ? "&privacy=1" : ""}`;
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      onClick={(event) => {
        if (disabled) event.preventDefault();
      }}
      className={`flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {label}
    </a>
  );
}

/** Message for ?oauth_error=<code> after a failed Google sign-in. */
export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const messages: Record<string, string> = {
    google_cancelled: "Cancelaste el inicio de sesión con Google.",
    email_not_verified: "Tu correo de Google no está verificado.",
    account_inactive: "Tu cuenta está inactiva. Contacta a soporte.",
    google_not_configured: "El inicio de sesión con Google no está disponible en este momento.",
  };
  return messages[code] ?? "No pudimos iniciar sesión con Google. Inténtalo de nuevo.";
}
