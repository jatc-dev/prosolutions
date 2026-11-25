import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { identityRequest } from "../preferencesApi";
import { AdminShell, loadAdminPermissions } from "./AdminLayout";

type AuditEvent = { id: string; action: string; resource: string | null; resourceId: string | null; adminEmail: string | null; userId: string | null; ipAddress: string | null; createdAt: string; details: unknown };

const ACTION_GROUPS: Array<{ value: string; es: string; en: string }> = [
  { value: "", es: "Todas las acciones", en: "All actions" },
  { value: "admin.", es: "Acciones administrativas", en: "Administrative actions" },
  { value: "admin.user", es: "Cambios en usuarios", en: "User changes" },
  { value: "admin.role", es: "Roles", en: "Roles" },
  { value: "authorization.", es: "Acceso a módulos", en: "Module access" },
  { value: "authentication.", es: "Autenticación y sesiones", en: "Authentication and sessions" },
  { value: "account.", es: "Cuenta y privacidad", en: "Account and privacy" },
  { value: "maintenance.", es: "Mantenimiento automático", en: "Automatic maintenance" },
];

export function AuditAdminPage() {
  return <AdminShell>{({ english }) => <AuditTrail english={english} />}</AdminShell>;
}

function AuditTrail({ english }: { english: boolean }) {
  const t = (es: string, en: string) => (english ? en : es);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState(params.get("actor") ?? "");

  useEffect(() => { void loadAdminPermissions().then(setPermissions); }, []);

  const query = useCallback((extra: Record<string, string> = {}) => {
    const search = new URLSearchParams();
    for (const key of ["action", "actor", "userId", "from", "to", "page"]) {
      const value = params.get(key);
      if (!value) continue;
      if (key === "from") search.set(key, new Date(`${value}T00:00:00`).toISOString());
      else if (key === "to") search.set(key, new Date(`${value}T23:59:59`).toISOString());
      else search.set(key, value);
    }
    for (const [key, value] of Object.entries(extra)) search.set(key, value);
    return search;
  }, [params]);

  const load = useCallback(async () => {
    if (!permissions?.includes("identity.audit.read")) return;
    setLoading(true); setError(null);
    try {
      const response = await identityRequest(`/api/admin/audit-logs?${query({ limit: "50" })}`);
      if (response.status === 401) { navigate("/login", { replace: true }); return; }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || `Error ${response.status}`);
      setEvents(payload.events ?? []);
      setPagination(payload.pagination ?? { page: 1, pages: 0, total: 0 });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setLoading(false); }
  }, [navigate, permissions, query]);

  useEffect(() => { void load(); }, [load]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };

  const exportCsv = async () => {
    setError(null);
    const response = await identityRequest(`/api/admin/audit-logs?${query({ format: "csv" })}`);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.message || `Error ${response.status}`);
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(await response.blob());
    link.download = "prosolutions-auditoria.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (permissions && !permissions.includes("identity.audit.read")) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{t("Tu cuenta no tiene permiso para ver la auditoría.", "Your account cannot view the audit trail.")}</p>;
  }

  const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";
  const button = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("Auditoría de accesos", "Access audit")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(`${pagination.total} eventos de ProIdentity: inicios de sesión, cambios de cuentas, roles y módulos.`, `${pagination.total} ProIdentity events: sign-ins, account, role and module changes.`)}</p>
        </div>
        {permissions?.includes("identity.audit.export") ? <button type="button" onClick={() => void exportCsv()} className={button}>{t("Exportar CSV", "Export CSV")}</button> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label={t("Tipo de acción", "Action type")} value={params.get("action") ?? ""} onChange={(event) => setFilter("action", event.target.value)} className={input}>
          {ACTION_GROUPS.map((group) => <option key={group.value} value={group.value}>{english ? group.en : group.es}</option>)}
        </select>
        <form onSubmit={(event) => { event.preventDefault(); setFilter("actor", actor.trim()); }}>
          <input type="search" value={actor} onChange={(event) => setActor(event.target.value)} placeholder={t("Correo del responsable", "Actor email")} aria-label={t("Responsable", "Actor")} className={input} />
        </form>
        <label className="flex items-center gap-1 text-sm">{t("Desde", "From")}<input type="date" value={params.get("from") ?? ""} onChange={(event) => setFilter("from", event.target.value)} className={input} /></label>
        <label className="flex items-center gap-1 text-sm">{t("Hasta", "To")}<input type="date" value={params.get("to") ?? ""} onChange={(event) => setFilter("to", event.target.value)} className={input} /></label>
        {params.get("userId") ? <button type="button" onClick={() => setFilter("userId", "")} className={button}>{t("Quitar filtro de usuario", "Clear user filter")} ✕</button> : null}
      </div>
      {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr><th className="px-3 py-2">{t("Fecha", "Date")}</th><th className="px-3 py-2">{t("Acción", "Action")}</th><th className="px-3 py-2">{t("Responsable", "Actor")}</th><th className="px-3 py-2">{t("Recurso", "Resource")}</th><th className="px-3 py-2">IP</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">{t("Cargando eventos…", "Loading events…")}</td></tr>
              : events.length === 0 ? <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">{t("No hay eventos con estos filtros.", "No events match these filters.")}</td></tr>
              : events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{new Date(event.createdAt).toLocaleString(english ? "en-US" : "es-CO")}</td>
                  <td className="px-3 py-2"><code className="text-xs">{event.action}</code></td>
                  <td className="px-3 py-2 text-xs">{event.adminEmail ?? t("Sistema / usuario", "System / user")}</td>
                  <td className="px-3 py-2 text-xs">{event.resource ?? "—"}{event.resourceId ? <> · <button type="button" onClick={() => setFilter("userId", event.resourceId!)} className="underline">{event.resourceId.slice(0, 8)}…</button></> : null}</td>
                  <td className="px-3 py-2 text-xs">{event.ipAddress ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {pagination.pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" disabled={pagination.page <= 1} onClick={() => setFilter("page", String(pagination.page - 1))} className={button}>{t("Anterior", "Previous")}</button>
          <span>{t(`Página ${pagination.page} de ${pagination.pages}`, `Page ${pagination.page} of ${pagination.pages}`)}</span>
          <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setFilter("page", String(pagination.page + 1))} className={button}>{t("Siguiente", "Next")}</button>
        </div>
      ) : null}
    </>
  );
}
