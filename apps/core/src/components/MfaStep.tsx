import { useState } from "react";

/** Reads (and removes) the Google sign-in MFA challenge from the URL fragment. */
export function takeMfaChallengeFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const match = /(?:^#|&)mfa=([^&]+)/.exec(window.location.hash);
  if (!match) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return decodeURIComponent(match[1]);
}

type Result = { accessToken?: string; next?: string };

/**
 * Second sign-in step: a 6-digit code from the authenticator app or a
 * recovery code. Calls onSignedIn with the session (password) or the
 * destination (Google).
 */
export function MfaStep({ apiUrl, challenge, english, onSignedIn, onRestart }: {
  apiUrl: string;
  challenge: string;
  english: boolean;
  onSignedIn: (result: Result) => void;
  onRestart: () => void;
}) {
  const t = (es: string, en: string) => (english ? en : es);
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${apiUrl}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challenge, code: code.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) { onSignedIn(data); return; }
      if (data.code === "mfa_challenge_expired") {
        setError(t("El paso de verificación expiró. Vuelve a iniciar sesión.", "The verification step expired. Sign in again."));
      } else if (response.status === 429) {
        setError(t("Demasiados intentos. Espera unos minutos.", "Too many attempts. Wait a few minutes."));
      } else {
        setError(t("El código no es válido. Revisa que la hora de tu teléfono sea correcta.", "The code is not valid. Check that your phone's clock is correct."));
      }
      setCode("");
    } catch {
      setError(t("No se pudo conectar. Inténtalo de nuevo.", "Could not connect. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={t("Verificación en dos pasos", "Two-step verification")}>
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t("Verificación en dos pasos", "Two-step verification")}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {useRecovery
            ? t("Escribe uno de tus códigos de respaldo. Cada código sirve una sola vez.", "Enter one of your recovery codes. Each code works once.")
            : t("Escribe el código de 6 dígitos de tu app de autenticación.", "Enter the 6-digit code from your authenticator app.")}
        </p>
      </div>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</p> : null}
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {useRecovery ? t("Código de respaldo", "Recovery code") : t("Código", "Code")}
        <input
          value={code}
          onChange={(event) => setCode(useRecovery ? event.target.value : event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode={useRecovery ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          required
          placeholder={useRecovery ? "XXXXX-XXXXX" : "123456"}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-widest dark:border-slate-600 dark:bg-slate-900"
        />
      </label>
      <button type="submit" disabled={busy || (!useRecovery && code.length !== 6)} className="w-full rounded-lg bg-brand-800 py-3 font-semibold text-white hover:bg-brand-900 disabled:opacity-60">
        {busy ? t("Verificando…", "Verifying…") : t("Verificar e ingresar", "Verify and sign in")}
      </button>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={() => { setUseRecovery((value) => !value); setCode(""); setError(null); }} className="text-brand-800 underline dark:text-brand-300">
          {useRecovery ? t("Usar la app de autenticación", "Use the authenticator app") : t("Usar un código de respaldo", "Use a recovery code")}
        </button>
        <button type="button" onClick={onRestart} className="text-slate-600 underline dark:text-slate-300">{t("Volver", "Back")}</button>
      </div>
    </form>
  );
}
