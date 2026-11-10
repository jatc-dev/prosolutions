import { useCallback, useEffect, useState } from "react";
import { identityRequest } from "../preferencesApi";

type Role = {
  key: string;
  name: string;
  description?: string | null;
  permissions: { key: string; description?: string | null }[];
};
type UserOption = { id: string; email: string; name?: string | null };
type Assignment = {
  id: string;
  user: UserOption;
  role: { key: string; name: string };
  module?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

const MODULES = ["PROCV", "PROJOBS", "PROSKILLS", "PROCAREER", "PROINTERVIEW", "PRORECRUIT"];

export function AdminRolesPanel({
  english,
  canManage,
  canAssignOwner,
}: {
  english: boolean;
  canManage: boolean;
  canAssignOwner: boolean;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState("");
  const [roleKey, setRoleKey] = useState("support_agent");
  const [module, setModule] = useState("PROCV");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const response = await identityRequest(path, init);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleResult, assignmentResult, userResult] = await Promise.all([
        call("/api/admin/roles"),
        call("/api/admin/role-assignments"),
        canManage ? call("/api/admin/users?limit=100") : Promise.resolve({ users: [] }),
      ]);
      setRoles(roleResult?.roles || []);
      setAssignments(assignmentResult?.assignments || []);
      setUsers(userResult?.users || []);
      if (!userId && userResult?.users?.[0]?.id) setUserId(userResult.users[0].id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (english ? "Unable to load roles." : "No se pudieron cargar los roles."));
    } finally {
      setLoading(false);
    }
  }, [call, canManage, english, userId]);

  useEffect(() => { void load(); }, [load]);

  const assign = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await call("/api/admin/role-assignments", {
        method: "POST",
        body: JSON.stringify({
          userId,
          roleKey,
          ...(roleKey === "module_admin" ? { module } : {}),
          ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        }),
      });
      setNotice(english ? "Administrative role assigned." : "Rol administrativo asignado.");
      setExpiresAt("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (english ? "Unable to assign role." : "No se pudo asignar el rol."));
    } finally { setBusy(false); }
  };

  const revoke = async (assignment: Assignment) => {
    const prompt = english
      ? `Revoke ${assignment.role.key} from ${assignment.user.email}?`
      : `¿Revocar ${assignment.role.key} a ${assignment.user.email}?`;
    if (!window.confirm(prompt)) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await call(`/api/admin/role-assignments/${encodeURIComponent(assignment.id)}`, { method: "DELETE" });
      setNotice(english ? "Role assignment revoked." : "Asignación de rol revocada.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (english ? "Unable to revoke role." : "No se pudo revocar el rol."));
    } finally { setBusy(false); }
  };

  const availableRoles = roles.filter((role) => canAssignOwner || role.key !== "platform_owner");
  return (
    <section className="mt-7 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{english ? "Administrative roles and permissions" : "Roles administrativos y permisos"}</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          {english
            ? "Administrative privileges are independent from user features. A role never grants permission to create, edit or inspect another user's CV."
            : "Los privilegios administrativos son independientes de las funciones de usuario. Un rol administrativo nunca concede permiso para crear, editar ni consultar las hojas de vida de otras personas."}
        </p>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</p>}
      {loading ? <p className="py-10 text-center text-slate-500">{english ? "Loading role catalog…" : "Cargando catálogo de roles…"}</p> : (
        <>
          {canManage && <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">{english ? "Assign an administrative role" : "Asignar un rol administrativo"}</h3>
            <p className="mt-1 text-sm text-slate-500">{english ? "Grant only the minimum access required. Module administrator assignments must be scoped to one module." : "Concede únicamente el acceso mínimo necesario. Las asignaciones de administrador de módulo deben limitarse a un módulo."}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">{english ? "User account" : "Cuenta de usuario"}
                <select value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950">
                  <option value="">{english ? "Select a user" : "Seleccionar usuario"}</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.email}{user.name ? ` · ${user.name}` : ""}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">{english ? "Role" : "Rol"}
                <select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950">
                  {availableRoles.filter((role) => role.key !== "user").map((role) => <option key={role.key} value={role.key}>{role.name} ({role.key})</option>)}
                </select>
              </label>
              {roleKey === "module_admin" && <label className="text-sm font-medium">{english ? "Module scope" : "Módulo autorizado"}
                <select value={module} onChange={(event) => setModule(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950">
                  {MODULES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>}
              <label className="text-sm font-medium">{english ? "Expires at (optional)" : "Vencimiento (opcional)"}
                <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950" />
              </label>
            </div>
            <button type="button" disabled={busy || !userId || !roleKey} onClick={() => void assign()} className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? (english ? "Saving…" : "Guardando…") : (english ? "Assign role" : "Asignar rol")}
            </button>
          </article>}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold">{english ? "Current assignments" : "Asignaciones actuales"}</h3>
            {assignments.length ? <div className="mt-4 space-y-2">{assignments.map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="min-w-0">
                <p className="font-medium">{assignment.role.name} <span className="font-mono text-xs text-slate-500">({assignment.role.key})</span></p>
                <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{assignment.user.email} · {assignment.module || (english ? "Platform-wide" : "Toda la plataforma")}</p>
                <p className="mt-1 text-xs text-slate-500">{assignment.expiresAt ? (english ? `Expires ${new Date(assignment.expiresAt).toLocaleString()}` : `Vence ${new Date(assignment.expiresAt).toLocaleString()}`) : (english ? "No expiry" : "Sin vencimiento")}</p>
              </div>
              {canManage && <button type="button" disabled={busy} onClick={() => void revoke(assignment)} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300">{english ? "Revoke" : "Revocar"}</button>}
            </div>)}</div> : <p className="mt-3 text-sm text-slate-500">{english ? "No administrative role assignments found." : "No se encontraron asignaciones administrativas."}</p>}
          </article>
          <div className="grid gap-3 md:grid-cols-2">
            {roles.map((role) => <article key={role.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{role.name}</h3><span className="font-mono text-xs text-slate-500">{role.key}</span></div>
              {role.description && <p className="mt-1 text-sm text-slate-500">{role.description}</p>}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{english ? "Permissions" : "Permisos"} · {role.permissions.length}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{role.permissions.map((permission) => <span key={permission.key} title={permission.description || undefined} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">{permission.key}</span>)}</div>
            </article>)}
          </div>
        </>
      )}
    </section>
  );
}
