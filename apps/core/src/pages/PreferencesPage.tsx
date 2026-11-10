import { useEffect, useState } from "react";
import { ProFooter, ProHeader, useTheme } from "@prosolutions/ui";
type ThemePreference = "light" | "dark" | "system";
import { useNavigate } from "react-router-dom";
import { useCoreLocale } from "../i18n";
import { identityRequest, loadUserPreferences, saveUserPreferences } from "../preferencesApi";

type Account = { name?: string | null; email: string };

export function PreferencesPage() {
  const { locale, setLocale } = useCoreLocale();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(preference);
  const [language, setLanguage] = useState<"es" | "en">(locale);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadUserPreferences(),
      identityRequest("/api/auth/me"),
    ]).then(async ([preferences, response]) => {
      if (!response.ok) throw new Error("No se pudo verificar la sesión.");
      const data = await response.json();
      if (!active) return;
      const nextTheme = preferences.theme || preference;
      const nextLanguage = preferences.locale || locale;
      setTheme(nextTheme);
      setLanguage(nextLanguage);
      setPreference(nextTheme);
      setLocale(nextLanguage);
      setAccount(data.user ? { name: data.user.name, email: data.user.email } : null);
    }).catch((reason: unknown) => {
      if (active) {
        const text = reason instanceof Error ? reason.message : "No se pudieron cargar las preferencias.";
        setError(text);
        if (/sesión expiró|verificar la sesión/i.test(text)) navigate("/login", { replace: true });
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locale, navigate, preference, setLocale, setPreference]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveUserPreferences({ theme, locale: language });
      setPreference(saved.theme || theme);
      setLocale(saved.locale || language);
      setMessage(locale === "es" ? "Preferencias guardadas en tu cuenta ProSolutions." : "Preferences saved to your ProSolutions account.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const english = locale === "en";
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ProHeader activeApp="core" locale={locale} onLocaleChange={() => { const next = language === "es" ? "en" : "es"; setLanguage(next); setLocale(next); void saveUserPreferences({ locale: next }).catch(() => undefined); }} profile={account ? { name: account.name, email: account.email } : null} settingsHref="/settings" securityHref="/security/sessions" onSignOut={async () => { await identityRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined); sessionStorage.removeItem("pro_identity_token"); window.location.assign("/login"); }} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8">
        <a href="/dashboard" className="text-sm font-semibold text-brand-700 underline dark:text-brand-300">← {english ? "Back to portal" : "Volver al portal"}</a>
        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-300">{english ? "Account preferences" : "Preferencias de cuenta"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{english ? "Settings" : "Configuración"}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{english ? "These preferences apply across ProSolutions applications." : "Estas preferencias se aplican en las aplicaciones de ProSolutions."}</p>
        </div>
        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">{english ? "Appearance" : "Apariencia"}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{english ? "Choose how the platform looks." : "Elige cómo se muestra la plataforma."}</p>
          <label className="mt-5 block text-sm font-medium" htmlFor="global-theme">{english ? "Theme" : "Tema"}</label>
          <select id="global-theme" value={theme} onChange={(event) => setTheme(event.target.value as ThemePreference)} className="mt-2 min-h-11 w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="system">{english ? "Use device settings" : "Usar configuración del dispositivo"}</option>
            <option value="light">{english ? "Light" : "Claro"}</option>
            <option value="dark">{english ? "Dark" : "Oscuro"}</option>
          </select>
        </section>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">{english ? "Language" : "Idioma"}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{english ? "Your language follows you between applications." : "Tu idioma se conserva al cambiar de aplicación."}</p>
          <label className="mt-5 block text-sm font-medium" htmlFor="global-language">{english ? "Preferred language" : "Idioma preferido"}</label>
          <select id="global-language" value={language} onChange={(event) => { const next = event.target.value as "es" | "en"; setLanguage(next); setLocale(next); }} className="mt-2 min-h-11 w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </section>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void save()} disabled={loading || saving} className="min-h-11 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{saving ? (english ? "Saving…" : "Guardando…") : (english ? "Save preferences" : "Guardar preferencias")}</button>
          <button type="button" onClick={() => navigate("/security/sessions")} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">{english ? "Security and sessions" : "Seguridad y sesiones"}</button>
        </div>
        {loading && <p role="status" className="mt-4 text-sm text-slate-500">{english ? "Loading your preferences…" : "Cargando tus preferencias…"}</p>}
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
