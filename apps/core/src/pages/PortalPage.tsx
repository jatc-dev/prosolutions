import { useCallback, useEffect, useRef, useState } from "react";
import { ProFooter, ProHeader } from "@prosolutions/ui";
import { useNavigate } from "react-router-dom";
import { useCoreLocale } from "../i18n";
import { saveUserPreferences } from "../preferencesApi";
import { identityAuthApiUrl } from "../identityApi";
import { RequiredConsentBanner } from "../components/PrivacyDataSection";

const IDENTITY_API_URL = identityAuthApiUrl();
const PROCV_APP_URL = (import.meta.env.VITE_PROCV_APP_URL || "https://procv.prosolutions.page").trim();
const ACCESS_TOKEN_KEY = "pro_identity_token";
interface PortalUser { id: string; name?: string | null; email: string; role?: string; modules?: string[]; }

const COPY = {
  es: {
    refreshFailed: "No se pudo renovar la sesión.",
    expired: "Tu sesión expiró. Vuelve a iniciar sesión.",
    profileFailed: "No se pudo cargar el perfil de usuario.",
    portalFailed: "No se pudo cargar el portal.",
    loading: "Cargando tu portal...",
    errorTitle: "No pudimos abrir tu portal",
    signInAgain: "Volver a iniciar sesión",
    eyebrow: "ProSolutions · Portal de trabajo",
    greeting: (name?: string | null) => `Hola${name ? `, ${name}` : ""}. ¿Qué quieres hacer hoy?`,
    intro: "Tu cuenta, tus herramientas profesionales. Elige uno de los módulos disponibles; podrás volver aquí cuando quieras.",
    manageAccess: "Administrar accesos",
    procvText: "Crea, edita y mejora tu hoja de vida profesional con herramientas optimizadas para filtros ATS.",
    procvCta: "Entrar a ProCV",
    projobsText: "Descubre oportunidades profesionales y explora vacantes de todos los sectores para tu próximo paso laboral.",
    projobsCta: "Entrar a ProJobs",
    noModules: "Tu cuenta no tiene módulos habilitados. Contacta con soporte para revisar tus permisos.",
    signedInAs: (email?: string) => `Sesión iniciada como ${email ?? ""}. La sesión se comparte de forma segura entre los módulos.`,
    security: "Seguridad y dispositivos",
  },
  en: {
    refreshFailed: "Your session could not be renewed.",
    expired: "Your session expired. Please sign in again.",
    profileFailed: "Your profile could not be loaded.",
    portalFailed: "The portal could not be loaded.",
    loading: "Loading your portal...",
    errorTitle: "We could not open your portal",
    signInAgain: "Sign in again",
    eyebrow: "ProSolutions · Work portal",
    greeting: (name?: string | null) => `Hi${name ? `, ${name}` : ""}. What would you like to do today?`,
    intro: "Your account, your career tools. Choose one of the available modules; you can come back here at any time.",
    manageAccess: "Manage access",
    procvText: "Create, edit and improve your CV with tools optimized for applicant tracking systems (ATS).",
    procvCta: "Open ProCV",
    projobsText: "Discover opportunities and browse job openings in every sector for your next career step.",
    projobsCta: "Open ProJobs",
    noModules: "Your account has no modules enabled. Contact support to review your permissions.",
    signedInAs: (email?: string) => `Signed in as ${email ?? ""}. Your session is shared securely across modules.`,
    security: "Security and devices",
  },
} as const;

async function fetchCurrentUser(token: string): Promise<Response> {
  return fetch(`${IDENTITY_API_URL}/me`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function PortalPage() {
  const { locale, setLocale } = useCoreLocale();
  const navigate = useNavigate();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const language = locale === "es" ? "es" : "en";
  const copy = COPY[language];
  // Error messages are produced inside the loader; keep the latest copy at hand.
  const copyRef = useRef(copy);
  copyRef.current = copy;

  useEffect(() => {
    let active = true;
    const load = async () => {
      let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      let response = token ? await fetchCurrentUser(token) : null;
      if (!response || !response.ok) {
        const refresh = await fetch(`${IDENTITY_API_URL}/refresh`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        });
        if (!refresh.ok) {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          if (active) navigate("/login", { replace: true });
          return;
        }
        const result = await refresh.json();
        token = result.accessToken;
        if (!token) throw new Error(copyRef.current.refreshFailed);
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
        response = await fetchCurrentUser(token);
      }
      if (!response.ok) throw new Error(copyRef.current.expired);
      const result = await response.json();
      if (!result?.user) throw new Error(copyRef.current.profileFailed);
      if (active) setUser(result.user);
    };
    load().catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : copyRef.current.portalFailed);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${IDENTITY_API_URL}/logout`, { method: "POST", credentials: "include" });
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.location.assign("/login");
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ProHeader activeApp="core" locale={language} onLocaleChange={() => { const next = locale === "es" ? "en" : "es"; setLocale(next); void saveUserPreferences({ locale: next }).catch(() => undefined); }} profile={user ? { name: user.name, email: user.email, modules: user.modules, isAdmin: user.role === "admin" } : null} onSignOut={user ? logout : undefined} settingsHref="/settings" securityHref="/security/sessions" />
      {user && <RequiredConsentBanner />}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8">
        {loading ? <div className="py-20 text-center text-slate-500">{copy.loading}</div> : error ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
            <h1 className="text-xl font-bold">{copy.errorTitle}</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <button type="button" onClick={() => navigate("/login", { replace: true })}
              className="mt-6 rounded-xl bg-brand-800 px-5 py-3 font-semibold text-white hover:bg-brand-900">{copy.signInAgain}</button>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-800 dark:text-brand-300">{copy.eyebrow}</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.greeting(user?.name)}</h1>
                <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{copy.intro}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user?.role === "admin" && <a href="/admin" className="rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-900 hover:bg-brand-50 dark:border-brand-950 dark:text-brand-200 dark:hover:bg-brand-950/40">{copy.manageAccess}</a>}

              </div>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {user?.modules?.includes("PROCV") && (<a href={PROCV_APP_URL} className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 3.75v4h4M8.5 12h7M8.5 15.5h7" /></svg>
                </div>
                <h2 className="mt-5 text-2xl font-bold">ProCV</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.procvText}</p>
                <span className="mt-7 inline-flex items-center gap-2 font-semibold text-brand-900 dark:text-brand-300">{copy.procvCta} <span aria-hidden="true">→</span></span>
              </a>)}
              {user?.modules?.includes("PROJOBS") && (<a href="https://projobs.prosolutions.page/" className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3.5" y="7" width="17" height="13" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3.5 12h17M10 12v2h4v-2" /></svg>
                </div>
                <h2 className="mt-5 text-2xl font-bold">ProJobs</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{copy.projobsText}</p>
                <span className="mt-7 inline-flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">{copy.projobsCta} <span aria-hidden="true">→</span></span>
              </a>)}
            </div>
            {(!user?.modules?.includes("PROCV") && !user?.modules?.includes("PROJOBS")) && (
              <p role="status" className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{copy.noModules}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400"><span>{copy.signedInAs(user?.email)}</span><a href="/security/sessions" className="font-semibold text-brand-900 underline underline-offset-4 dark:text-brand-300">{copy.security}</a></div>
          </>
        )}
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
