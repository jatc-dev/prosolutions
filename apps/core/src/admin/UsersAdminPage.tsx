import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { identityRequest } from "../preferencesApi";
import { AdminShell, loadAdminPermissions } from "./AdminLayout";

type Status = "active" | "suspended" | "scheduled";
type ContentSummary = Record<string, Record<string, number> | null>;
type AdminUser = {
  id: string; email: string; name: string | null; emailVerified: boolean; signInWithGoogle: boolean;
  status: Status; createdAt: string; lastLoginAt: string | null; deletionScheduledAt: string | null; mfaEnabledAt?: string | null;
  modules: string[]; adminRoles: Array<{ key: string; module: string | null }>; content?: ContentSummary;
};
type UserDetail = AdminUser & {
  moduleAccess: Array<{ module: string; grantedAt: string; expiresAt: string | null }>;
  adminRoleAssignments: Array<{ id: string; module: string | null; expiresAt: string | null; role: { key: string; name: string } }>;
  sessions: Array<{ id: string; lastAccessedAt: string; deviceName: string | null; userAgent: string | null; ipAddress: string | null }>;
  activity: Array<{ id: string; action: string; adminEmail: string | null; createdAt: string }>;
};
type Role = { key: string; name: string };

export const MODULES = [{ key: "PROCV", label: "ProCV" }, { key: "PROJOBS", label: "ProJobs" }, { key: "PRORECRUIT", label: "ProRecruit" }];
export const MODULE_ROLES = new Set(["module_admin", "module_moderator", "module_viewer"]);
export const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  platform_owner: { es: "Propietario", en: "Owner" },
  platform_admin: { es: "Administrador", en: "Administrator" },
  security_admin: { es: "Seguridad", en: "Security" },
  support_agent: { es: "Soporte", en: "Support" },
  content_manager: { es: "Contenido", en: "Content" },
  analytics_viewer: { es: "Analítica", en: "Analytics" },
  module_admin: { es: "Admin. de módulo", en: "Module admin" },
  module_moderator: { es: "Moderador de módulo", en: "Module moderator" },
  module_viewer: { es: "Lector de módulo", en: "Module viewer" },
};
const CONTENT_LABELS: Record<string, { es: string; en: string }> = {
  cvs: { es: "CV", en: "CVs" }, applications: { es: "Postulaciones", en: "Applications" }, savedJobs: { es: "Guardadas", en: "Saved" },
  alerts: { es: "Alertas", en: "Alerts" }, companyMemberships: { es: "Empresas", en: "Companies" },
};

/** "CV 3 · Postulaciones 2", "—" when empty, "?" when a module could not be read. */
export function contentLabel(content: ContentSummary | undefined, english: boolean): string {
  if (!content) return "—";
  const parts: string[] = [];
  let unknown = false;
  for (const counts of Object.values(content)) {
    if (counts === null) { unknown = true; continue; }
    for (const [key, value] of Object.entries(counts)) if (value > 0) parts.push(`${(CONTENT_LABELS[key] ?? { es: key, en: key })[english ? "en" : "es"]} ${value}`);
  }
  if (parts.length) return parts.join(" · ") + (unknown ? " · ?" : "");
  return unknown ? "?" : "—";
}

const date = (value: string | null | undefined, english: boolean) => (value ? new Date(value).toLocaleDateString(english ? "en-US" : "es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—");
const chip = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
const STATUS_STYLE: Record<Status, string> = {
  active: "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200",
  suspended: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  scheduled: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
};
const button = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800";
const danger = "rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40";
const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";

export function UsersAdminPage() {
  return <AdminShell>{({ english }) => <UsersDirectory english={english} />}</AdminShell>;
}

function UsersDirectory({ english }: { english: boolean }) {
  const t = (es: string, en: string) => (english ? en : es);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(params.get("q") ?? "");
  const openUserId = params.get("user");

  const filters = useMemo(() => ({
    status: params.get("status") ?? "", module: params.get("module") ?? "", role: params.get("role") ?? "",
    sort: params.get("sort") ?? "created", page: Number(params.get("page") ?? "1") || 1, q: params.get("q") ?? "",
  }), [params]);
  const can = (permission: string) => Boolean(permissions?.includes(permission));

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const response = await identityRequest(path, init);
    if (response.status === 401) {
      sessionStorage.removeItem("pro_identity_token");
      navigate("/login", { replace: true });
      throw new Error(t("Tu sesión expiró.", "Your session expired."));
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Error ${response.status}`);
    return payload;
    // eslint-disable-next-line reactHooks/exhaustive-deps
  }, [navigate, english]);

  useEffect(() => { void loadAdminPermissions().then(setPermissions); }, []);

  const load = useCallback(async () => {
    if (!permissions || !permissions.includes("identity.users.read")) return;
    setLoading(true); setError(null);
    try {
      const query = new URLSearchParams({ page: String(filters.page), limit: "25", sort: filters.sort, withContent: "1" });
      if (filters.q) query.set("search", filters.q);
      if (filters.status) query.set("status", filters.status);
      if (filters.module) query.set("module", filters.module);
      if (filters.role) query.set("role", filters.role);
      const result = await call(`/api/admin/users?${query}`);
      setUsers(result.users ?? []);
      setPagination(result.pagination ?? { page: 1, pages: 0, total: 0 });
      setSelected(new Set());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("No se pudo cargar el directorio.", "The directory could not be loaded."));
    } finally { setLoading(false); }
    // eslint-disable-next-line reactHooks/exhaustive-deps
  }, [call, filters, permissions]);

  useEffect(() => { void load(); }, [load]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  const openUser = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("user", id); else next.delete("user");
    setParams(next);
  };

  const bulkSuspend = async () => {
    if (!window.confirm(t(`¿Suspender ${selected.size} cuenta(s)? Se cerrarán sus sesiones.`, `Suspend ${selected.size} account(s)? Their sessions will be closed.`))) return;
    let done = 0;
    const failures: string[] = [];
    for (const id of selected) {
      try { await call(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) }); done += 1; }
      catch (reason) { failures.push(reason instanceof Error ? reason.message : String(reason)); }
    }
    setNotice(t(`${done} cuenta(s) suspendida(s).`, `${done} account(s) suspended.`) + (failures.length ? ` ${t("Errores", "Errors")}: ${[...new Set(failures)].join("; ")}` : ""));
    await load();
  };

  const exportCsv = () => {
    const rows = users.filter((user) => selected.size === 0 || selected.has(user.id));
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = ["email,name,status,modules,roles,lastLogin,createdAt,content", ...rows.map((user) => [
      user.email, user.name, user.status, user.modules.join(" "), user.adminRoles.map((role) => role.module ? `${role.key}:${role.module}` : role.key).join(" "),
      user.lastLoginAt ?? "", user.createdAt, contentLabel(user.content, english),
    ].map(cell).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "prosolutions-usuarios.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (permissions && !permissions.includes("identity.users.read")) {
    return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{t("Tu cuenta no tiene permiso para ver el directorio de usuarios.", "Your account cannot view the user directory.")}</p>;
  }

  return (
    <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("Usuarios", "Users")}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(`${pagination.total} cuentas. Los cambios se aplican en ProIdentity y quedan en la auditoría.`, `${pagination.total} accounts. Changes apply in ProIdentity and are audited.`)}</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setFilter("q", search.trim()); }} className="flex gap-2">
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Buscar por nombre o correo", "Search by name or email")} aria-label={t("Buscar usuarios", "Search users")} className={`${input} w-64`} />
            <button type="submit" className={button}>{t("Buscar", "Search")}</button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <select aria-label={t("Estado", "Status")} value={filters.status} onChange={(event) => setFilter("status", event.target.value)} className={input}>
            <option value="">{t("Todos los estados", "All statuses")}</option>
            <option value="active">{t("Activos", "Active")}</option>
            <option value="suspended">{t("Suspendidos", "Suspended")}</option>
            <option value="scheduled">{t("Eliminación programada", "Deletion scheduled")}</option>
            <option value="unverified">{t("Correo sin verificar", "Email not verified")}</option>
          </select>
          <select aria-label={t("Módulo", "Module")} value={filters.module} onChange={(event) => setFilter("module", event.target.value)} className={input}>
            <option value="">{t("Todos los módulos", "All modules")}</option>
            {MODULES.map((module) => <option key={module.key} value={module.key}>{module.label}</option>)}
          </select>
          <select aria-label={t("Rol", "Role")} value={filters.role} onChange={(event) => setFilter("role", event.target.value)} className={input}>
            <option value="">{t("Cualquier rol", "Any role")}</option>
            <option value="none">{t("Sin rol administrativo", "No admin role")}</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label[english ? "en" : "es"]}</option>)}
          </select>
          <select aria-label={t("Ordenar", "Sort")} value={filters.sort} onChange={(event) => setFilter("sort", event.target.value)} className={input}>
            <option value="created">{t("Más recientes", "Newest")}</option>
            <option value="lastLogin">{t("Último acceso", "Last sign-in")}</option>
            <option value="name">{t("Nombre", "Name")}</option>
            <option value="email">{t("Correo", "Email")}</option>
          </select>
        </div>

        {selected.size > 0 ? (
          <div role="toolbar" aria-label={t("Acciones en bloque", "Bulk actions")} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm dark:border-brand-900 dark:bg-brand-950/30">
            <span className="font-semibold">{t(`${selected.size} seleccionada(s)`, `${selected.size} selected`)}</span>
            {can("identity.users.manage") ? <button type="button" onClick={() => void bulkSuspend()} className={danger}>{t("Suspender", "Suspend")}</button> : null}
            <button type="button" onClick={exportCsv} className={button}>{t("Exportar CSV", "Export CSV")}</button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-sm underline">{t("Quitar selección", "Clear selection")}</button>
          </div>
        ) : null}
        {notice ? <p role="status" className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900 dark:bg-brand-950/30">{notice}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p> : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="w-10 px-3 py-2"><input type="checkbox" aria-label={t("Seleccionar todos", "Select all")} checked={users.length > 0 && selected.size === users.length} onChange={(event) => setSelected(event.target.checked ? new Set(users.map((user) => user.id)) : new Set())} /></th>
                <th className="px-3 py-2">{t("Usuario", "User")}</th>
                <th className="px-3 py-2">{t("Estado", "Status")}</th>
                <th className="px-3 py-2">{t("Módulos", "Modules")}</th>
                <th className="px-3 py-2">{t("Roles", "Roles")}</th>
                <th className="px-3 py-2">{t("Contenido", "Content")}</th>
                <th className="px-3 py-2">{t("Último acceso", "Last sign-in")}</th>
                <th className="px-3 py-2"><span className="sr-only">{t("Acciones", "Actions")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">{t("Cargando usuarios…", "Loading users…")}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-slate-500">{t("No hay usuarios con estos filtros.", "No users match these filters.")}</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2"><input type="checkbox" aria-label={t(`Seleccionar ${user.email}`, `Select ${user.email}`)} checked={selected.has(user.id)} onChange={(event) => { const next = new Set(selected); if (event.target.checked) next.add(user.id); else next.delete(user.id); setSelected(next); }} /></td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => openUser(user.id)} className="text-left">
                      <span className="block font-semibold hover:underline">{user.name || t("Sin nombre", "No name")}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{user.email}{user.signInWithGoogle ? " · Google" : ""}{user.mfaEnabledAt ? ` · ${t("2 pasos", "2-step")}` : ""}{!user.emailVerified ? ` · ${t("sin verificar", "unverified")}` : ""}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2"><span className={`${chip} ${STATUS_STYLE[user.status]}`}>{{ active: t("Activo", "Active"), suspended: t("Suspendido", "Suspended"), scheduled: t("Se eliminará", "To be deleted") }[user.status]}</span></td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{user.modules.length ? user.modules.map((module) => <span key={module} className={`${chip} bg-slate-100 dark:bg-slate-800`}>{MODULES.find((item) => item.key === module)?.label ?? module}</span>) : <span className="text-slate-400">—</span>}</div></td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{user.adminRoles.length ? user.adminRoles.map((role, index) => <span key={index} className={`${chip} bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-200`}>{(ROLE_LABELS[role.key] ?? { es: role.key, en: role.key })[english ? "en" : "es"]}{role.module ? ` · ${role.module}` : ""}</span>) : <span className="text-slate-400">—</span>}</div></td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{contentLabel(user.content, english)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{date(user.lastLoginAt, english)}</td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => openUser(user.id)} className={button}>{t("Gestionar", "Manage")}</button></td>
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

      {openUserId ? (
        <UserDrawer userId={openUserId} english={english} permissions={permissions ?? []} call={call} onClose={() => openUser(null)} onChanged={(message) => { setNotice(message); void load(); }} />
      ) : null}
    </>
  );
}

type Call = (path: string, init?: RequestInit) => Promise<any>;

function UserDrawer({ userId, english, permissions, call, onClose, onChanged }: { userId: string; english: boolean; permissions: string[]; call: Call; onClose: () => void; onChanged: (message: string) => void }) {
  const t = (es: string, en: string) => (english ? en : es);
  const can = (permission: string) => permissions.includes(permission);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [roleModule, setRoleModule] = useState("PROCV");
  const [roleExpires, setRoleExpires] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, roleList] = await Promise.all([
        call(`/api/admin/users/${encodeURIComponent(userId)}`),
        can("identity.roles.read") ? call("/api/admin/roles").catch(() => ({ roles: [] })) : Promise.resolve({ roles: [] }),
      ]);
      setUser(detail.user);
      setName(detail.user.name ?? "");
      setRoles((roleList.roles ?? []).filter((role: Role) => role.key !== "user"));
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    // eslint-disable-next-line reactHooks/exhaustive-deps
  }, [call, userId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true); setError(null);
    try { await action(); onChanged(message); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  };
  const patch = (body: unknown) => call(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(body) });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={t("Ficha del usuario", "User details")} onClick={(event) => event.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{user?.name || user?.email || t("Cargando…", "Loading…")}</h2>
            {user ? <p className="truncate text-sm text-slate-500">{user.email} · {t("alta", "joined")} {date(user.createdAt, english)}</p> : null}
          </div>
          <button type="button" onClick={onClose} autoFocus aria-label={t("Cerrar", "Close")} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p> : null}

        {user ? (
          <div className="mt-6 space-y-6 text-sm">
            {user.status === "scheduled" ? (
              <div role="status" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                {t(`Se eliminará el ${date(user.deletionScheduledAt, english)} junto con sus datos.`, `Will be deleted on ${date(user.deletionScheduledAt, english)} with its data.`)}
                {can("identity.users.delete") ? <button type="button" disabled={busy} onClick={() => void run(() => call(`/api/admin/users/${encodeURIComponent(userId)}/restore`, { method: "POST" }), t("Eliminación cancelada.", "Deletion cancelled."))} className="ml-2 font-semibold underline">{t("Cancelar eliminación", "Cancel deletion")}</button> : null}
              </div>
            ) : null}

            <section aria-labelledby="perfil-usuario">
              <h3 id="perfil-usuario" className="font-semibold">{t("Perfil", "Profile")}</h3>
              <div className="mt-2 flex gap-2">
                <input value={name} onChange={(event) => setName(event.target.value)} aria-label={t("Nombre", "Name")} disabled={!can("identity.users.manage")} className={`${input} flex-1`} />
                {can("identity.users.manage") ? <button type="button" disabled={busy || name === (user.name ?? "")} onClick={() => void run(() => patch({ name }), t("Nombre actualizado.", "Name updated."))} className={button}>{t("Guardar", "Save")}</button> : null}
              </div>
            </section>

            <section aria-labelledby="estado-usuario">
              <h3 id="estado-usuario" className="font-semibold">{t("Estado y acceso", "Status and access")}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{user.mfaEnabledAt ? t(`Verificación en dos pasos activa desde ${date(user.mfaEnabledAt, english)}.`, `Two-step verification on since ${date(user.mfaEnabledAt, english)}.`) : t("Sin verificación en dos pasos.", "No two-step verification.")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {can("identity.users.manage") && user.status === "active" ? <button type="button" disabled={busy} onClick={() => window.confirm(t("¿Suspender esta cuenta? Se cerrarán sus sesiones y no podrá entrar.", "Suspend this account? Its sessions will be closed and it will not be able to sign in.")) && void run(() => patch({ isActive: false }), t("Cuenta suspendida.", "Account suspended."))} className={danger}>{t("Suspender", "Suspend")}</button> : null}
                {can("identity.users.manage") && user.status === "suspended" ? <button type="button" disabled={busy} onClick={() => void run(() => patch({ isActive: true }), t("Cuenta reactivada.", "Account reactivated."))} className={button}>{t("Reactivar", "Reactivate")}</button> : null}
                {can("identity.sessions.revoke") ? <button type="button" disabled={busy || user.sessions.length === 0} onClick={() => void run(() => call(`/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke`, { method: "POST" }), t("Sesiones cerradas.", "Sessions closed."))} className={button}>{t(`Cerrar sesiones (${user.sessions.length})`, `Close sessions (${user.sessions.length})`)}</button> : null}
                {can("identity.security.manage") && user.mfaEnabledAt ? <button type="button" disabled={busy} onClick={() => window.confirm(t("¿Reiniciar la verificación en dos pasos? Se cerrarán sus sesiones y podrá entrar solo con su contraseña hasta que la vuelva a activar.", "Reset two-step verification? Its sessions will be closed and it will sign in with its password only until it is turned on again.")) && void run(() => call(`/api/admin/users/${encodeURIComponent(userId)}/mfa/reset`, { method: "POST" }), t("Verificación en dos pasos reiniciada.", "Two-step verification reset."))} className={button}>{t("Reiniciar verificación en dos pasos", "Reset two-step verification")}</button> : null}
                {can("identity.users.delete") && user.status !== "scheduled" ? <button type="button" disabled={busy} onClick={() => setDeleting(true)} className={danger}>{t("Eliminar…", "Delete…")}</button> : null}
              </div>
            </section>

            <section aria-labelledby="contenido-usuario">
              <h3 id="contenido-usuario" className="font-semibold">{t("Contenido en los módulos", "Content in modules")}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{contentLabel(user.content, english)}</p>
              {Object.values(user.content ?? {}).some((value) => value === null) ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t("? = no se pudo consultar ese módulo.", "? = that module could not be read.")}</p> : null}
            </section>

            <section aria-labelledby="modulos-usuario">
              <h3 id="modulos-usuario" className="font-semibold">{t("Módulos", "Modules")}</h3>
              <div className="mt-2 flex flex-wrap gap-3">
                {MODULES.map((module) => {
                  const enabled = user.moduleAccess.some((access) => access.module === module.key);
                  return (
                    <label key={module.key} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={enabled} disabled={busy || !can("identity.users.manage")} onChange={() => void run(() => call(`/api/modules/${enabled ? "revoke" : "grant"}`, { method: "POST", body: JSON.stringify({ userId, module: module.key }) }), `${module.label}: ${enabled ? t("acceso retirado", "access revoked") : t("acceso concedido", "access granted")}.`)} />
                      {module.label}
                    </label>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="roles-usuario">
              <h3 id="roles-usuario" className="font-semibold">{t("Roles administrativos", "Administrative roles")}</h3>
              <ul className="mt-2 space-y-1">
                {user.adminRoleAssignments.length ? user.adminRoleAssignments.map((assignment) => (
                  <li key={assignment.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <span>{(ROLE_LABELS[assignment.role.key] ?? { es: assignment.role.name, en: assignment.role.name })[english ? "en" : "es"]}{assignment.module ? ` · ${assignment.module}` : ""}{assignment.expiresAt ? ` · ${t("vence", "expires")} ${date(assignment.expiresAt, english)}` : ""}</span>
                    {can("identity.roles.manage") ? <button type="button" disabled={busy} onClick={() => window.confirm(t("¿Retirar este rol?", "Revoke this role?")) && void run(() => call(`/api/admin/role-assignments/${encodeURIComponent(assignment.id)}`, { method: "DELETE" }), t("Rol retirado.", "Role revoked."))} className="text-xs font-semibold text-rose-700 underline dark:text-rose-300">{t("Retirar", "Revoke")}</button> : null}
                  </li>
                )) : <li className="text-slate-500">{t("Sin roles administrativos.", "No administrative roles.")}</li>}
              </ul>
              {can("identity.roles.manage") && roles.length ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <select aria-label={t("Rol", "Role")} value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className={input}>
                    <option value="">{t("Asignar rol…", "Assign role…")}</option>
                    {roles.map((role) => <option key={role.key} value={role.key}>{(ROLE_LABELS[role.key] ?? { es: role.name, en: role.name })[english ? "en" : "es"]}</option>)}
                  </select>
                  {MODULE_ROLES.has(roleKey) ? (
                    <select aria-label={t("Módulo del rol", "Role module")} value={roleModule} onChange={(event) => setRoleModule(event.target.value)} className={input}>
                      {MODULES.filter((module) => module.key !== "PRORECRUIT").map((module) => <option key={module.key} value={module.key}>{module.label}</option>)}
                    </select>
                  ) : null}
                  {roleKey !== "platform_owner" ? <input type="date" aria-label={t("Vence (opcional)", "Expires (optional)")} value={roleExpires} onChange={(event) => setRoleExpires(event.target.value)} className={input} /> : null}
                  <button type="button" disabled={busy || !roleKey} onClick={() => void run(() => call("/api/admin/role-assignments", { method: "POST", body: JSON.stringify({ userId, roleKey, ...(MODULE_ROLES.has(roleKey) ? { module: roleModule } : {}), ...(roleExpires ? { expiresAt: new Date(`${roleExpires}T23:59:59`).toISOString() } : {}) }) }).then(() => { setRoleKey(""); setRoleExpires(""); }), t("Rol asignado.", "Role assigned."))} className={button}>{t("Asignar", "Assign")}</button>
                </div>
              ) : null}
            </section>

            <section aria-labelledby="sesiones-usuario">
              <h3 id="sesiones-usuario" className="font-semibold">{t("Sesiones activas", "Active sessions")}</h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {user.sessions.length ? user.sessions.map((session) => <li key={session.id}>{session.deviceName || session.userAgent || t("Dispositivo", "Device")} · {session.ipAddress ?? "—"} · {date(session.lastAccessedAt, english)}</li>) : <li>{t("Ninguna.", "None.")}</li>}
              </ul>
            </section>

            <section aria-labelledby="actividad-usuario">
              <h3 id="actividad-usuario" className="font-semibold">{t("Actividad reciente", "Recent activity")}</h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {user.activity.length ? user.activity.map((entry) => <li key={entry.id}><code>{entry.action}</code>{entry.adminEmail ? ` · ${entry.adminEmail}` : ""} · {date(entry.createdAt, english)}</li>) : <li>{t("Sin actividad registrada.", "No recorded activity.")}</li>}
              </ul>
            </section>
          </div>
        ) : null}

        {deleting && user ? (
          <DeleteDialog user={user} english={english} onCancel={() => setDeleting(false)} onConfirm={(body) => run(async () => {
            await call(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE", body: JSON.stringify(body) });
            setDeleting(false);
            if (body.mode === "now") onClose();
          }, body.mode === "now" ? t("Cuenta eliminada.", "Account deleted.") : t(`Eliminación programada en ${body.days} días.`, `Deletion scheduled in ${body.days} days.`))} busy={busy} />
        ) : null}
      </aside>
    </div>
  );
}

type DeleteBody = { mode: "now"; confirmEmail: string } | { mode: "scheduled"; days: number; confirmEmail: string };

export function DeleteDialog({ user, english, busy, onCancel, onConfirm }: { user: Pick<UserDetail, "email" | "content">; english: boolean; busy: boolean; onCancel: () => void; onConfirm: (body: DeleteBody) => void }) {
  const t = (es: string, en: string) => (english ? en : es);
  const [mode, setMode] = useState<"now" | "scheduled">("scheduled");
  const [days, setDays] = useState(30);
  const [confirm, setConfirm] = useState("");
  const matches = confirm.trim().toLowerCase() === user.email.toLowerCase();
  return (
    <div role="alertdialog" aria-modal="true" aria-label={t("Eliminar cuenta", "Delete account")} className="mt-6 rounded-xl border border-rose-300 p-4 text-sm dark:border-rose-900">
      <h3 className="font-semibold text-rose-800 dark:text-rose-200">{t("Eliminar cuenta", "Delete account")}</h3>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{t("Se borrarán la cuenta y sus datos en los módulos:", "The account and its module data will be erased:")} <strong>{contentLabel(user.content, english)}</strong>. {t("La auditoría se conserva anonimizada.", "The audit trail is kept, anonymised.")}</p>
      <fieldset className="mt-3 space-y-2">
        <label className="flex items-center gap-2"><input type="radio" name="delete-mode" checked={mode === "scheduled"} onChange={() => setMode("scheduled")} />{t("Suspender ahora y eliminar en", "Suspend now and delete in")}<input type="number" min={1} max={90} value={days} onChange={(event) => setDays(Math.min(90, Math.max(1, Number(event.target.value) || 1)))} aria-label={t("Días", "Days")} className={`${input} w-20 py-1`} />{t("días (se puede cancelar)", "days (can be cancelled)")}</label>
        <label className="flex items-center gap-2"><input type="radio" name="delete-mode" checked={mode === "now"} onChange={() => setMode("now")} />{t("Eliminar ahora (irreversible)", "Delete now (irreversible)")}</label>
      </fieldset>
      <label className="mt-3 block">{t(`Escribe ${user.email} para confirmar`, `Type ${user.email} to confirm`)}<input value={confirm} onChange={(event) => setConfirm(event.target.value)} className={`${input} mt-1 w-full`} autoComplete="off" /></label>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy || !matches} onClick={() => onConfirm(mode === "now" ? { mode, confirmEmail: confirm } : { mode, days, confirmEmail: confirm })} className="rounded-lg bg-rose-700 px-3 py-1.5 font-semibold text-white hover:bg-rose-800 disabled:opacity-50">{mode === "now" ? t("Eliminar ahora", "Delete now") : t("Programar eliminación", "Schedule deletion")}</button>
        <button type="button" onClick={onCancel} className={button}>{t("Cancelar", "Cancel")}</button>
      </div>
    </div>
  );
}
