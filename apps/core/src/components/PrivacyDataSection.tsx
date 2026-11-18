import { useEffect, useState } from "react";
import {
  deleteAccountEverywhere,
  loadAccountEmail,
  exportAllData,
  loadConsents,
  setConsent,
  type ConsentPurpose,
  type ConsentStatus,
} from "../accountApi";

const OPTIONAL_LABEL: Partial<Record<ConsentPurpose, { title: string; description: string }>> = {
  marketing_emails: {
    title: "Novedades y consejos por correo",
    description: "Ocasionalmente te contamos sobre nuevas funciones y guías para tu búsqueda de empleo.",
  },
  job_alert_emails: {
    title: "Alertas de empleo por correo",
    description: "Necesario para recibir las alertas que crees en ProJobs.",
  },
};

const sectionClass = "mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900";

/** Consents, data export and account erasure (Ley 1581 de 2012 / GDPR). */
export function PrivacyDataSection() {
  const [email, setEmail] = useState<string | null>(null);
  const [consents, setConsents] = useState<ConsentStatus[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadConsents().then(setConsents).catch((err: Error) => setError(err.message));
    loadAccountEmail().then(setEmail).catch(() => undefined);
  }, []);

  const toggle = async (purpose: ConsentPurpose, granted: boolean) => {
    setError(null);
    try {
      setConsents(await setConsent(purpose, granted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar tu decisión.");
    }
  };

  const download = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportAllData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prosolutions-mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Descargamos un archivo con todos tus datos de ProSolutions, ProCV y ProJobs.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron exportar tus datos.");
    } finally {
      setExporting(false);
    }
  };

  const erase = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccountEverywhere({ confirmEmail: confirmEmail.trim(), password });
      window.location.assign("/?cuenta=eliminada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta.");
      setDeleting(false);
    }
  };

  const optional = (consents ?? []).filter((consent) => !consent.required);
  const privacy = consents?.find((consent) => consent.purpose === "privacy_policy");
  const canDelete = Boolean(email) && confirmEmail.trim().toLowerCase() === email?.toLowerCase();

  return (
    <>
      <section className={sectionClass} aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="text-lg font-semibold">Privacidad y autorizaciones</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Tratamos tus datos según la Ley 1581 de 2012. Puedes cambiar estas autorizaciones cuando quieras.
        </p>
        {privacy && (
          <p className="mt-4 text-sm">
            Política de privacidad: {privacy.granted ? `aceptada (versión ${privacy.currentVersion})` : "pendiente de aceptar"}.
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {optional.map((consent) => {
            const copy = OPTIONAL_LABEL[consent.purpose];
            if (!copy) return null;
            return (
              <li key={consent.purpose}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consent.granted}
                    onChange={(event) => void toggle(consent.purpose, event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-400 text-brand-700 focus:ring-brand-700"
                  />
                  <span>
                    <span className="block text-sm font-medium">{copy.title}</span>
                    <span className="block text-sm text-slate-600 dark:text-slate-300">{copy.description}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={sectionClass} aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-lg font-semibold">Tus datos</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Descarga una copia de todo lo que guardamos sobre ti: cuenta, hojas de vida, postulaciones y alertas.
        </p>
        <button
          type="button"
          onClick={() => void download()}
          disabled={exporting}
          className="mt-4 min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {exporting ? "Preparando archivo…" : "Descargar mis datos"}
        </button>

        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Eliminar mi cuenta</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Borra de forma permanente tu cuenta, tus hojas de vida en ProCV y tus postulaciones, vacantes guardadas y alertas en
            ProJobs. Esta acción no se puede deshacer.
          </p>
          <div className="mt-4 grid max-w-md gap-3">
            <label className="text-sm font-medium" htmlFor="delete-email">
              Escribe tu correo ({email ?? "tu correo"}) para confirmar
            </label>
            <input
              id="delete-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <label className="text-sm font-medium" htmlFor="delete-password">
              Contraseña <span className="font-normal text-slate-500">(déjala vacía si entras con Google)</span>
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="button"
              onClick={() => void erase()}
              disabled={!canDelete || deleting}
              className="min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deleting ? "Eliminando…" : "Eliminar mi cuenta y mis datos"}
            </button>
          </div>
        </div>
        {message && <p role="status" className="mt-4 text-sm text-brand-800 dark:text-brand-300">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">{error}</p>}
      </section>
    </>
  );
}

/** Banner for accounts created before explicit consent was required. */
export function RequiredConsentBanner() {
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConsents()
      .then((consents) => setPending(consents.some((consent) => consent.actionRequired)))
      .catch(() => undefined);
  }, []);

  if (!pending) return null;
  return (
    <div role="region" aria-label="Autorización de datos" className="mx-auto mt-6 max-w-5xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <p>
        Actualizamos nuestra <a href="https://projobs.prosolutions.page/privacidad.html" className="font-semibold underline">política de privacidad</a>.
        Para seguir usando ProSolutions necesitamos tu autorización para tratar tus datos personales (Ley 1581 de 2012).
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          setSaving(true);
          setConsent("privacy_policy", true)
            .then(() => setPending(false))
            .finally(() => setSaving(false));
        }}
        className="mt-3 rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Acepto la política de privacidad"}
      </button>
    </div>
  );
}
