import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useConsent, useConsentPreferencesRequest } from "./consent.js";
import { LEGAL_URLS } from "./links.js";

/**
 * Cookie consent banner (CMP) shown until the user decides. Non-intrusive:
 * a bottom bar that never blocks reading; preferences open in a dialog.
 * "Rechazar" is as prominent as "Aceptar" (no dark patterns).
 */
export function ConsentBanner() {
  const { decided, consent, acceptAll, rejectNonEssential, save } = useConsent();
  const [mounted, setMounted] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const openPreferences = useCallback(() => {
    setAnalytics(Boolean(consent?.analytics));
    setAdvertising(Boolean(consent?.advertising));
    setPreferencesOpen(true);
  }, [consent]);
  useConsentPreferencesRequest(openPreferences);

  useEffect(() => {
    if (!preferencesOpen) return;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreferencesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preferencesOpen]);

  // Server-rendered HTML never contains the banner (decision lives in a cookie).
  if (!mounted) return null;

  const button = "inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus";

  return (
    <>
      {!decided && !preferencesOpen && (
        <div role="region" aria-label="Preferencias de cookies" className="fixed inset-x-0 bottom-0 z-[1400] border-t border-ui-border bg-ui-surface/95 shadow-floating backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-ui-muted">
              Usamos cookies necesarias para que la plataforma funcione y, solo si lo aceptas, cookies de publicidad de Google para
              financiar las herramientas gratuitas.{" "}
              <a href={LEGAL_URLS.cookies} className="font-medium text-ui-accent underline underline-offset-2">Política de cookies</a>
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={openPreferences} className={`${button} border border-ui-border-strong text-ui-text hover:bg-ui-soft`}>
                Configurar
              </button>
              <button type="button" onClick={rejectNonEssential} className={`${button} border border-ui-border-strong text-ui-text hover:bg-ui-soft`}>
                Rechazar no esenciales
              </button>
              <button type="button" onClick={acceptAll} className={`${button} bg-ui-accent text-ui-on-accent hover:bg-ui-accent-hover`}>
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}

      {preferencesOpen && (
        <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" onClick={() => setPreferencesOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-ui-xl border border-ui-border bg-ui-surface p-6 text-ui-text shadow-floating focus:outline-none"
          >
            <h2 id={titleId} className="text-lg font-semibold">Preferencias de cookies</h2>
            <p className="mt-1 text-sm text-ui-muted">Puedes cambiar tu decisión cuando quieras desde «Configurar cookies» en el pie de página.</p>
            <ul className="mt-5 space-y-4">
              <li className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold">Necesarias</span>
                  <span className="block text-sm text-ui-muted">Sesión, seguridad (CSRF) y esta preferencia. Siempre activas.</span>
                </span>
                <input type="checkbox" checked disabled aria-label="Cookies necesarias (siempre activas)" className="mt-1 h-4 w-4" />
              </li>
              <li className="flex items-start justify-between gap-4">
                <label htmlFor={`${titleId}-analytics`}>
                  <span className="block text-sm font-semibold">Analítica</span>
                  <span className="block text-sm text-ui-muted">Medición agregada de uso. Hoy no usamos herramientas de analítica de terceros.</span>
                </label>
                <input id={`${titleId}-analytics`} type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-700" />
              </li>
              <li className="flex items-start justify-between gap-4">
                <label htmlFor={`${titleId}-ads`}>
                  <span className="block text-sm font-semibold">Publicidad</span>
                  <span className="block text-sm text-ui-muted">Google AdSense puede usar cookies para mostrar y medir anuncios en guías, herramientas y listados.</span>
                </label>
                <input id={`${titleId}-ads`} type="checkbox" checked={advertising} onChange={(e) => setAdvertising(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-700" />
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { rejectNonEssential(); setPreferencesOpen(false); }} className={`${button} border border-ui-border-strong hover:bg-ui-soft`}>
                Rechazar no esenciales
              </button>
              <button type="button" onClick={() => { save({ analytics, advertising }); setPreferencesOpen(false); }} className={`${button} bg-ui-accent text-ui-on-accent hover:bg-ui-accent-hover`}>
                Guardar preferencias
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
