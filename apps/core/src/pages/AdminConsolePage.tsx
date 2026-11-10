import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ProFooter, ProHeader } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { identityRequest } from "../preferencesApi";

type Tab = "overview" | "users" | "roles" | "platform" | "landing" | "audit";
type Account = { name?: string | null; email: string; role: string };
type Setting = { id?: string; key: string; value: string; type?: string; category?: string; description?: string; isSecret?: boolean };
type AuditEntry = { id: string; userId?: string | null; action?: string; resourceType?: string; resourceId?: string | null; ipAddress?: string | null; createdAt: string; details?: unknown };

const labels: Record<Tab, { es: string; en: string }> = {
  overview: { es: "Resumen", en: "Overview" },
  users: { es: "Usuarios y accesos", en: "Users and access" },
  roles: { es: "Roles y permisos", en: "Roles and permissions" },
  platform: { es: "Plataforma", en: "Platform settings" },
  landing: { es: "Contenido público", en: "Public content" },
  audit: { es: "Auditoría", en: "Audit" },
};

export function AdminConsolePage() {
  const { locale, setLocale } = useCoreLocale();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const english = locale === "en";
  const requestedTab = params.get("section") as Tab | null;
  const [tab, setTab] = useState<Tab>(requestedTab && requestedTab in labels ? requestedTab : "overview");
  const [account, setAccount] = useState<Account | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [charts, setCharts] = useState<Record<string, { labels: string[]; data: number[] }>>({});
  const [settings, setSettings] = useState<Setting[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const response = await identityRequest(path, init);
    if (response.status === 401) {
      sessionStorage.removeItem("pro_identity_token");
      navigate("/login", { replace: true });
      throw new Error(english ? "Your session expired." : "Tu sesión expiró.");
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return response.json();
  }, [english, navigate]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const me = await call("/api/auth/me");
      if (me?.user?.role !== "admin") {
        setError(english ? "This area is restricted to platform administrators." : "Esta sección está reservada para administradores de la plataforma.");
        return;
      }
      setAccount({ name: me.user.name, email: me.user.email, role: me.user.role });
      const [statsResult, chartsResult, settingsResult, auditResult] = await Promise.all([
        call("/api/admin/procv/stats").catch(() => null),
        call("/api/admin/procv/charts?days=30").catch(() => null),
        call("/api/admin/procv/settings").catch(() => []),
        call("/api/admin/procv/audit-logs?page=1&limit=20").catch(() => ({ logs: [] })),
      ]);
      setStats(statsResult?.stats || {});
      setCharts(chartsResult?.charts || {});
      setSettings(Array.isArray(settingsResult) ? settingsResult : []);
      setAudit(Array.isArray(auditResult?.logs) ? auditResult.logs : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (english ? "Unable to load administration." : "No se pudo cargar la administración."));
    } finally {
      setLoading(false);
    }
  }, [call, english]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (requestedTab && requestedTab in labels) setTab(requestedTab); }, [requestedTab]);

  const visibleSettings = useMemo(() => settings.filter((setting) => !setting.isSecret), [settings]);
  const platformSettings = visibleSettings.filter((setting) => !setting.key.startsWith("landing_"));
  const landingSettings = visibleSettings.filter((setting) => setting.key.startsWith("landing_"));

  const selectTab = (next: Tab) => {
    setTab(next);
    setParams(next === "overview" ? {} : { section: next });
  };

  const saveSetting = async (key: string, value: string) => {
    setBusyKey(key); setError(null); setNotice(null);
    try {
      await call(`/api/admin/procv/settings/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify({ value }) });
      setEditing(null);
      setNotice(english ? "Setting saved." : "Configuración guardada.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (english ? "Unable to save setting." : "No se pudo guardar la configuración."));
    } finally { setBusyKey(null); }
  };

  const logout = async () => {
    await identityRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    sessionStorage.removeItem("pro_identity_token");
    window.location.assign("/login");
  };

  const nav = (["overview", "users", "roles", "platform", "landing", "audit"] as Tab[]);
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ProHeader activeApp="core" locale={locale} onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")} profile={account ? { name: account.name, email: account.email } : null} onSignOut={logout} settingsHref="/settings" securityHref="/security/sessions" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-300">ProSolutions · Administración central</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{english ? "Platform administration" : "Administración de la plataforma"}</h1><p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{english ? "Manage users, modules, platform settings, public content and audit from one place." : "Gestiona usuarios, módulos, configuración, contenido público y auditoría desde un único lugar."}</p></div>
          <Link to="/dashboard" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">{english ? "Back to portal" : "Volver al portal"}</Link>
        </div>
        <nav aria-label={english ? "Platform administration" : "Administración de la plataforma"} className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-800">
          {nav.map((item) => <button key={item} type="button" onClick={() => selectTab(item)} aria-current={tab === item ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === item ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{labels[item][locale]}</button>)}
        </nav>
        {error && <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
        {notice && <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</p>}
        {loading ? <p role="status" className="py-16 text-center text-slate-500">{english ? "Loading administration…" : "Cargando administración…"}</p> : (
          <>
            {tab === "overview" && <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{english ? "CVs created" : "Hojas de vida creadas"}</p><p className="mt-2 text-3xl font-bold tabular-nums">{stats.totalCVs ?? "—"}</p></article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{english ? "CV owners" : "Usuarios con CV"}</p><p className="mt-2 text-3xl font-bold tabular-nums">{stats.cvOwnerCount ?? "—"}</p></article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-500">{english ? "Recent audit events" : "Eventos recientes de auditoría"}</p><p className="mt-2 text-3xl font-bold tabular-nums">{audit.length}</p></article>
              <div className="sm:col-span-2 lg:col-span-3 grid gap-4 md:grid-cols-2">{(["cvCreation", "cvOwnerActivity"] as const).map((key) => { const series = charts[key]; const total = series?.data.reduce((sum, value) => sum + value, 0) || 0; return <article key={key} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{key === "cvCreation" ? (english ? "CV creation · last 30 days" : "Creación de CV · últimos 30 días") : (english ? "Active CV owners · last 30 days" : "Usuarios con CV · últimos 30 días")}</h2><span className="text-xl font-bold tabular-nums">{total}</span></div><div className="mt-4 flex h-24 items-end gap-1">{(series?.data || []).slice(-30).map((value, index) => { const max = Math.max(1, ...(series?.data || [])); return <div key={index} title={String(value)} className="min-w-0 flex-1 rounded-t bg-brand-500/80" style={{ height: `${Math.max(3, (value / max) * 100)}%` }} />; })}</div></article>; })}</div>
              <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">{english ? "Administration areas" : "Áreas administrativas"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><button onClick={() => selectTab("users")} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-400 dark:border-slate-700"><strong>{english ? "Users and access" : "Usuarios y accesos"}</strong><p className="mt-1 text-sm text-slate-500">{english ? "Accounts and module grants" : "Cuentas y permisos de módulos"}</p></button><button onClick={() => selectTab("roles")} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-400 dark:border-slate-700"><strong>{english ? "Roles and permissions" : "Roles y permisos"}</strong><p className="mt-1 text-sm text-slate-500">{english ? "Current model and capability design" : "Modelo actual y diseño de capacidades"}</p></button><button onClick={() => selectTab("platform")} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-400 dark:border-slate-700"><strong>{english ? "Platform settings" : "Configuración"}</strong><p className="mt-1 text-sm text-slate-500">{english ? "Safe editable platform values" : "Valores editables y no secretos"}</p></button><button onClick={() => selectTab("landing")} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-400 dark:border-slate-700"><strong>{english ? "Public content" : "Contenido público"}</strong><p className="mt-1 text-sm text-slate-500">{english ? "Landing page and modules" : "Landing y módulos visibles"}</p></button><button onClick={() => selectTab("audit")} className="rounded-xl border border-slate-200 p-4 text-left hover:border-brand-400 dark:border-slate-700"><strong>{english ? "Audit" : "Auditoría"}</strong><p className="mt-1 text-sm text-slate-500">{english ? "Administrative activity" : "Actividad administrativa"}</p></button></div></div>
            </section>}
            {tab === "users" && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-semibold">{english ? "Users and module access" : "Usuarios y accesos a módulos"}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{english ? "Identity remains the source of truth for accounts and module permissions." : "Identity conserva la autoridad sobre cuentas y permisos de módulos."}</p><Link to="/admin/access" className="mt-5 inline-flex rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">{english ? "Open user and access management" : "Abrir gestión de usuarios y accesos"}</Link></section>}
            {tab === "platform" && <section className="mt-7 space-y-4"><article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-semibold">{english ? "Verified platform controls" : "Controles operativos verificados"}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{english ? "The legacy ProCV settings form defines many values that are not read by runtime services. They are intentionally not editable here until their behavior is implemented and tested." : "El formulario antiguo de ProCV define muchos valores que los servicios no consumen en ejecución. No se habilitan aquí hasta implementar y probar su comportamiento."}</p><ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-200"><li>{english ? "Account preferences (language and theme) are stored centrally in ProIdentity." : "Las preferencias de cuenta (idioma y tema) se almacenan en ProIdentity."}</li><li>{english ? "Session management is handled by ProIdentity and its session policy." : "La gestión de sesiones corresponde a ProIdentity y su política de sesiones."}</li><li>{english ? "Email delivery uses Identity environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS), not legacy database settings." : "El correo utiliza variables de entorno de Identity (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS), no los ajustes antiguos de la base de datos."}</li><li>{english ? "Backup scheduling and several legacy limits have no verified runtime consumer in the current code." : "La programación de copias y varios límites antiguos no tienen un consumidor operativo verificado en el código actual."}</li><li>{english ? "CV metrics are read-only analytics from the ProCV service." : "Las métricas de CV son analítica de solo lectura del servicio ProCV."}</li></ul><div className="mt-5 flex flex-wrap gap-3"><Link to="/settings" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">{english ? "Account preferences" : "Preferencias de cuenta"}</Link><Link to="/security/sessions" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">{english ? "Security and sessions" : "Seguridad y sesiones"}</Link></div></article><article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><strong>{english ? "Legacy settings audit" : "Auditoría de ajustes heredados"}</strong><p className="mt-1">{english ? "The former screen lists 86 default keys. Code search found the bilingual landing content as the active database-backed settings path; the rest must be implemented in their owning services or retired, not presented as working controls." : "La pantalla anterior enumera 86 claves por defecto. La búsqueda de código confirmó el contenido bilingüe de la landing como ruta activa respaldada por base de datos; el resto debe implementarse en sus servicios responsables o retirarse, no mostrarse como controles funcionales."}</p></article></section>}
            {tab === "landing" && <section className="mt-7 space-y-3"><p className="text-sm text-slate-600 dark:text-slate-300">{english ? "Temporary compatibility editor: bilingual source arrays remain in ProCV until the dedicated ProSolutions catalog has been migrated, reconciled and tested. Edit each locale independently; do not pair items by array index." : "Editor temporal de compatibilidad: los arreglos bilingües siguen en ProCV hasta migrar, reconciliar y probar el catálogo dedicado de ProSolutions. Edita cada idioma por separado; no emparejes elementos por índice."}</p>{landingSettings.map((setting) => <article key={setting.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">{setting.key}</h2><p className="mt-1 text-sm text-slate-500">{setting.description || setting.category}</p>{editing === setting.key ? <><textarea value={editValue} onChange={(event) => setEditValue(event.target.value)} rows={8} className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950" /><div className="mt-3 flex gap-2"><button disabled={busyKey === setting.key} onClick={() => { try { JSON.parse(editValue); void saveSetting(setting.key, editValue); } catch { setError(english ? "The value must be valid JSON." : "El valor debe ser JSON válido."); } }} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{english ? "Save JSON" : "Guardar JSON"}</button><button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">{english ? "Cancel" : "Cancelar"}</button></div></> : <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><pre className="max-h-32 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950">{setting.value}</pre><button onClick={() => { setEditing(setting.key); setEditValue(setting.value || ""); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700">{english ? "Edit JSON" : "Editar JSON"}</button></div>}</article>)}{landingSettings.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">{english ? "No public content settings are configured yet." : "Aún no hay configuraciones de contenido público."}</p>}</section>}
            {tab === "roles" && <section className="mt-7 space-y-4"><article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-semibold">{english ? "Current authorization model" : "Modelo actual de autorización"}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{english ? "Identity stores a single global admin role and ordinary user role. All Identity admin routes require role=admin; ProCV admin routes additionally require the PROCV module entitlement. Module access is separate from the platform role." : "Identity almacena un único rol global admin y el rol user. Todas las rutas administrativas de Identity exigen role=admin; las rutas de ProCV además exigen el módulo PROCV. El acceso a módulos es independiente del rol de plataforma."}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><strong>admin</strong><p className="mt-1 text-sm text-slate-500">{english ? "Broad platform administration; no capability-level separation yet." : "Administración amplia de la plataforma; todavía sin separación por capacidades."}</p></div><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><strong>user</strong><p className="mt-1 text-sm text-slate-500">{english ? "Standard account; module entitlements are independently granted." : "Cuenta estándar; los permisos de módulos se conceden de forma independiente."}</p></div></div></article><article className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold">{english ? "Recommended capability model" : "Modelo de capacidades recomendado"}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{english ? "Replace the all-or-nothing admin role with server-enforced capabilities, while retaining a break-glass platform owner. Suggested capabilities:" : "Sustituir el rol administrativo de todo o nada por capacidades verificadas en servidor y conservar un propietario de plataforma de emergencia. Capacidades sugeridas:"}</p><ul className="mt-4 grid gap-2 sm:grid-cols-2">{["platform.users.read","platform.users.manage","platform.modules.manage","platform.catalog.manage","platform.settings.manage","platform.audit.read","platform.analytics.read","platform.security.manage"].map((capability) => <li key={capability} className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs dark:bg-slate-950">{capability}</li>)}</ul><p className="mt-4 text-sm text-slate-500">{english ? "This screen is informational. No roles or permissions have been changed; capability enforcement requires a separate migration and negative/positive authorization tests." : "Esta pantalla es informativa. No se han cambiado roles ni permisos; aplicar capacidades requiere una migración separada y pruebas de autorización positivas y negativas."}</p></article></section>}
            {tab === "audit" && <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-200 p-4 dark:border-slate-800"><h2 className="font-semibold">{english ? "Recent ProCV administration events" : "Eventos administrativos recientes de ProCV"}</h2></div>{audit.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">{english ? "Action" : "Acción"}</th><th className="px-4 py-3">{english ? "Resource" : "Recurso"}</th><th className="px-4 py-3">{english ? "Actor" : "Responsable"}</th><th className="px-4 py-3">{english ? "Date" : "Fecha"}</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-3 font-medium">{entry.action || "—"}</td><td className="px-4 py-3">{entry.resourceType || "—"}</td><td className="px-4 py-3">{entry.userId ? `Identity · ${entry.userId.slice(0, 8)}…` : "Sistema"}</td><td className="px-4 py-3 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-500">{english ? "No audit events are available." : "No hay eventos de auditoría disponibles."}</p>}</section>}
          </>
        )}
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
