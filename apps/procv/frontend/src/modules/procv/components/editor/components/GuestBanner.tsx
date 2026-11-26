import React, { useState } from "react";
import { ArrowRight, HardDrive, X } from "lucide-react";

export const GUEST_BANNER_DISMISSED_KEY = "procv.guestBannerDismissed";

function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(GUEST_BANNER_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * One slim line for guests: where their work is kept and how to keep it in
 * the cloud. It can be closed (for this browser session) so it never takes
 * space from the form, especially on phones.
 */
export function GuestBanner() {
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      window.sessionStorage.setItem(GUEST_BANNER_DISMISSED_KEY, "1");
    } catch {
      // Private mode: it just shows again on the next visit.
    }
  };

  return (
    <div
      role="status"
      data-testid="guest-banner"
      className="border-b border-brand-200 bg-brand-50/90 px-3 py-1.5 backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 sm:px-4"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 text-sm">
        <HardDrive className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-xs leading-snug text-slate-700 dark:text-slate-200 sm:text-sm">
          <strong className="font-semibold text-slate-900 dark:text-slate-100">Modo invitado:</strong>{" "}
          <span className="sm:hidden">se guarda en este navegador.</span>
          <span className="hidden sm:inline">tus cambios se guardan en este navegador.</span>
        </p>
        <a
          href="/auth"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-1"
        >
          <span className="sm:hidden">Guardar en la nube</span>
          <span className="hidden sm:inline">Guardar en la nube gratis</span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso de modo invitado"
          title="Cerrar"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-brand-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
