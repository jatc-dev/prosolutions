import { useEffect, useState } from "react";

/**
 * ProIdentity runs on Render's free plan and sleeps after 15 minutes without
 * traffic; the first request then waits while it starts (up to about a
 * minute). True once `active` has lasted longer than `delayMs`.
 */
export function useSlowRequest(active: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return slow;
}

/** Explains a slow sign-in instead of leaving the form looking frozen. */
export function SlowConnectionNotice({ active, english }: { active: boolean; english: boolean }) {
  const slow = useSlowRequest(active);
  if (!slow) return null;
  return (
    <p role="status" aria-live="polite" className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
      <span aria-hidden="true" className="mt-1 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-brand-700 border-t-transparent motion-reduce:animate-none dark:border-brand-300 dark:border-t-transparent" />
      <span>
        {english
          ? "Connecting to the accounts service. If it has not been used for a while it can take up to a minute; please keep this page open."
          : "Conectando con el servicio de cuentas. Si llevaba un rato sin uso puede tardar hasta un minuto; no cierres esta página."}
      </span>
    </p>
  );
}
