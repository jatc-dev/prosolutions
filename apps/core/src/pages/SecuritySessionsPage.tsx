import { useCallback, useEffect, useState, useRef } from "react";
import { ProFooter, ProHeader } from "@prosolutions/ui";
import { useNavigate } from "react-router-dom";
import { useCoreLocale } from "../i18n";
import { identityAuthApiUrl } from "../identityApi";
import { saveUserPreferences } from "../preferencesApi";

const API = identityAuthApiUrl();
const TOKEN_KEY = "pro_identity_token";
type Account = { name?: string | null; email: string };
type SessionItem = { id: string; createdAt: string; lastAccessedAt: string; expiresAt: string; rememberMe: boolean; deviceName?: string | null; userAgent?: string | null; ipAddress?: string | null; current: boolean };

const COPY = {
  es: {
    expired: "Tu sesión expiró.",
    refreshFailed: "No se pudo renovar la sesión.",
    closeFailed: "No se pudo cerrar esa sesión.",
    closeError: "Error al cerrar sesión.",
    back: "← Volver a configuración",
    eyebrow: "Seguridad de la cuenta",
    title: "Dispositivos y sesiones",
    intro: (minutes: number) => `Revisa dónde has iniciado sesión y cierra los accesos que no reconozcas. Las sesiones temporales dejan de ser válidas tras ${minutes} minutos sin actividad, aunque su expiración absoluta sea posterior.`,
    closing: "Cerrando...",
    closeOthers: "Cerrar todas las demás sesiones",
    idleSummary: (count: number, minutes: number) => `${count} sesión(es) inactivas por límite de ${minutes} minutos`,
    device: "Dispositivo",
    lastActivity: "Última actividad",
    idleNote: "Se muestran como inactivas; estos registros no se revocan ni eliminan al consultar la pantalla.",
    loading: "Cargando sesiones...",
    empty: "No hay sesiones activas registradas.",
    thisDevice: "Este equipo",
    unknownBrowser: "Navegador no identificado",
    notAvailable: "No disponible",
    started: "Inicio",
    remember: "Permanecer conectado (hasta 30 días)",
    temporary: "Sesión temporal",
    expires: "Expira",
    closeSession: "Cerrar sesión",
  },
  en: {
    expired: "Your session expired.",
    refreshFailed: "Your session could not be renewed.",
    closeFailed: "That session could not be closed.",
    closeError: "Error while closing the session.",
    back: "← Back to settings",
    eyebrow: "Account security",
    title: "Devices and sessions",
    intro: (minutes: number) => `Review where you are signed in and close any access you do not recognize. Temporary sessions stop being valid after ${minutes} minutes of inactivity, even if their absolute expiry is later.`,
    closing: "Closing...",
    closeOthers: "Close all other sessions",
    idleSummary: (count: number, minutes: number) => `${count} session(s) inactive after the ${minutes}-minute limit`,
    device: "Device",
    lastActivity: "Last activity",
    idleNote: "They are shown as inactive; viewing this page does not revoke or delete these records.",
    loading: "Loading sessions...",
    empty: "There are no active sessions.",
    thisDevice: "This device",
    unknownBrowser: "Unidentified browser",
    notAvailable: "Not available",
    started: "Started",
    remember: "Stay signed in (up to 30 days)",
    temporary: "Temporary session",
    expires: "Expires",
    closeSession: "Sign out",
  },
} as const;

export function SecuritySessionsPage() {
  const { locale, setLocale } = useCoreLocale();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [idleExpiredSessions, setIdleExpiredSessions] = useState<SessionItem[]>([]);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const language = locale === "es" ? "es" : "en";
  const copy = COPY[language];
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const send = (token: string) => fetch(`${API}${path}`, {
      ...init, credentials: "include",
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      const refresh = await fetch(`${API}/refresh`, { method: "POST", credentials: "include" });
      if (!refresh.ok) { navigate("/login", { replace: true }); throw new Error(copyRef.current.expired); }
      const data = await refresh.json();
      token = data.accessToken;
      if (!token) throw new Error(copyRef.current.refreshFailed);
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    let response = await send(token);
    if (response.status === 401) {
      const refresh = await fetch(`${API}/refresh`, { method: "POST", credentials: "include" });
      if (!refresh.ok) { sessionStorage.removeItem(TOKEN_KEY); navigate("/login", { replace: true }); throw new Error(copyRef.current.expired); }
      const data = await refresh.json();
      token = data.accessToken;
      if (!token) throw new Error(copyRef.current.refreshFailed);
      sessionStorage.setItem(TOKEN_KEY, token);
      response = await send(token);
    }
    return response;
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [response, profileResponse] = await Promise.all([request("/sessions"), request("/me")]);
      if (!response.ok) throw new Error("No se pudieron consultar las sesiones.");
      const data = await response.json();
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.user) setAccount({ name: profileData.user.name, email: profileData.user.email });
      }
      setSessions(data.sessions || []);
      setIdleExpiredSessions(data.idleExpiredSessions || []);
      setIdleTimeoutMinutes(data.policy?.idleTimeoutMinutes || 30);
    } catch (e) { setError(e instanceof Error ? e.message : "Error al cargar sesiones."); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  const closeSession = async (id: string) => {
    setBusy(id); setError(null);
    try {
      const response = await request(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(copyRef.current.closeFailed);
      const result = await response.json();
      if (result.currentSession) {
        sessionStorage.removeItem(TOKEN_KEY);
        window.location.assign("/login");
        return;
      }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : copyRef.current.closeError); }
    finally { setBusy(null); }
  };

  const closeOthers = async () => {
    setBusy("others"); setError(null);
    try {
      const response = await request("/sessions/revoke-others", { method: "POST", body: JSON.stringify({}) });
      if (!response.ok) throw new Error("No se pudieron cerrar las otras sesiones.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al cerrar sesiones."); }
    finally { setBusy(null); }
  };

  const logout = async () => {
    try { await fetch(`${API}/logout`, { method: "POST", credentials: "include" }); }
    finally { sessionStorage.removeItem(TOKEN_KEY); window.location.assign("/login"); }
  };

  return <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <ProHeader activeApp="core" locale={language} onLocaleChange={() => { const next = locale === "es" ? "en" : "es"; setLocale(next); void saveUserPreferences({ locale: next }).catch(() => undefined); }} profile={account ? { name: account.name, email: account.email } : null} settingsHref="/settings" securityHref="/security/sessions" onSignOut={logout} />
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
      <a href="/settings" className="text-sm font-semibold text-brand-900 underline dark:text-brand-300">{copy.back}</a>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-brand-800">{copy.eyebrow}</p><h1 className="mt-2 text-3xl font-bold">{copy.title}</h1><p className="mt-2 text-slate-600 dark:text-slate-300">{copy.intro(idleTimeoutMinutes)}</p></div>
        <button onClick={closeOthers} disabled={busy !== null || sessions.filter(s => !s.current).length === 0} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40">{busy === "others" ? copy.closing : copy.closeOthers}</button>
      </div>
      {error && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
      {idleExpiredSessions.length > 0 && !loading && <details className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><summary className="cursor-pointer text-sm font-semibold">{copy.idleSummary(idleExpiredSessions.length, idleTimeoutMinutes)}</summary><ul className="mt-3 space-y-2">{idleExpiredSessions.map(session => <li key={session.id} className="border-t border-slate-100 pt-2 text-sm dark:border-slate-800"><strong>{session.deviceName || copy.device}</strong><span className="ml-2 text-slate-500">{copy.lastActivity}: {new Date(session.lastAccessedAt).toLocaleString()}</span></li>)}</ul><p className="mt-3 text-xs text-slate-500">{copy.idleNote}</p></details>}
      {loading ? <p className="py-16 text-center text-slate-500">{copy.loading}</p> : sessions.length === 0 ? <p className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">{copy.empty}</p> :
        <div className="mt-8 space-y-4">{sessions.map(session => <article key={session.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{session.deviceName || copy.device}</h2>{session.current && <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{copy.thisDevice}</span>}</div><p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{session.userAgent || copy.unknownBrowser}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">IP: {session.ipAddress || copy.notAvailable} · {copy.started}: {new Date(session.createdAt).toLocaleString()} · {copy.lastActivity}: {new Date(session.lastAccessedAt).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.rememberMe ? copy.remember : copy.temporary} · {copy.expires}: {new Date(session.expiresAt).toLocaleString()}</p></div>
          <button onClick={() => closeSession(session.id)} disabled={busy !== null} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300">{busy === session.id ? copy.closing : copy.closeSession}</button></div>
        </article>)}</div>}
    </main><ProFooter locale={locale} />
  </div>;
}
