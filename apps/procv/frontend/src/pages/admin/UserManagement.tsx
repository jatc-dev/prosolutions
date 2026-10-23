import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../stores/authStore";
import { identityAuthApiUrl } from "../../lib/identityUrl";

const IDENTITY_AUTH_URL = identityAuthApiUrl();
const IDENTITY_BASE_URL = IDENTITY_AUTH_URL.replace(/\/api\/auth\/?$/, "");

interface ModuleInfo {
  code: string;
  name: string;
  description?: string | null;
  baseUrl?: string | null;
  apiAudience: string;
  enabled: boolean;
  defaultForNewUsers: boolean;
  defaultForAdmins: boolean;
  displayOrder: number;
}

interface ModuleGrant {
  moduleCode: string;
  active: boolean;
  grantedAt: string;
  expiresAt: string | null;
  module: { code: string; name: string; enabled: boolean };
}

interface IdentityUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  moduleAccess: ModuleGrant[];
}

interface PaginatedUsers {
  users: IdentityUser[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

type Tab = "users" | "catalog";

async function requestIdentity(path: string, token: string, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch(`${IDENTITY_BASE_URL}/api/csrf-token`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!csrfResponse.ok) throw new Error("No se pudo preparar la validación de seguridad de la solicitud.");
    const csrf = await csrfResponse.json();
    if (typeof csrf.csrfToken !== "string" || !csrf.csrfToken) {
      throw new Error("ProIdentity no devolvió un token CSRF válido.");
    }
    headers.set("X-CSRF-Token", csrf.csrfToken);
  }

  const response = await fetch(`${IDENTITY_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.message === "string" ? payload.message : `ProIdentity respondió ${response.status}`);
  }
  return payload;
}

function hasActiveGrant(grant: ModuleGrant | undefined): boolean {
  return Boolean(grant?.active && (!grant.expiresAt || new Date(grant.expiresAt).getTime() > Date.now()));
}

function formatDate(value?: string | null): string {
  if (!value) return "Nunca";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-brand-900";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";
const buttonClass = "inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

export function UserManagement() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [catalog, setCatalog] = useState<ModuleInfo[]>([]);
  const [pagination, setPagination] = useState<PaginatedUsers["pagination"]>({ page: 1, limit: 25, total: 0, pages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newModule, setNewModule] = useState({
    code: "",
    name: "",
    description: "",
    baseUrl: "",
    apiAudience: "",
    displayOrder: "100",
  });

  const loadCatalog = useCallback(async () => {
    if (!accessToken) throw new Error("Tu sesión no contiene un token válido. Inicia sesión de nuevo.");
    const result = await requestIdentity("/api/modules/catalog", accessToken);
    setCatalog(Array.isArray(result.modules) ? result.modules : []);
  }, [accessToken]);

  const loadUsers = useCallback(async (requestedPage = page, requestedSearch = search) => {
    if (!accessToken) throw new Error("Tu sesión no contiene un token válido. Inicia sesión de nuevo.");
    const params = new URLSearchParams({ page: String(requestedPage), limit: "25" });
    if (requestedSearch.trim()) params.set("search", requestedSearch.trim());
    const result = await requestIdentity(`/api/modules/admin/users?${params.toString()}`, accessToken);
    setUsers(Array.isArray(result.users) ? result.users : []);
    if (result.pagination) setPagination(result.pagination);
  }, [accessToken, page, search]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCatalog(), loadUsers()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo consultar ProIdentity.");
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = searchDraft.trim();
      setPage(1);
      setSearch(normalized);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [catalog],
  );

  const withMutation = async (operation: () => Promise<unknown>, successMessage: string) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(successMessage);
      await Promise.all([loadCatalog(), loadUsers()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La operación no se pudo completar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAccess = async (user: IdentityUser, module: ModuleInfo) => {
    const grant = user.moduleAccess.find((entry) => entry.moduleCode === module.code);
    if (hasActiveGrant(grant)) {
      await withMutation(
        () => requestIdentity("/api/modules/revoke", accessToken!, {
          method: "POST",
          body: JSON.stringify({ userId: user.id, moduleCode: module.code }),
        }),
        `Se revocó ${module.name} para ${user.email}.`,
      );
      return;
    }
    if (!module.enabled) return;
    await withMutation(
      () => requestIdentity("/api/modules/grant", accessToken!, {
        method: "POST",
        body: JSON.stringify({ userId: user.id, moduleCode: module.code }),
      }),
      `Se concedió ${module.name} a ${user.email}.`,
    );
  };

  const createModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      code: newModule.code.trim().toUpperCase(),
      name: newModule.name.trim(),
      description: newModule.description.trim() || null,
      baseUrl: newModule.baseUrl.trim() || null,
      apiAudience: newModule.apiAudience.trim(),
      enabled: false,
      defaultForNewUsers: false,
      defaultForAdmins: false,
      displayOrder: Number(newModule.displayOrder),
    };
    await withMutation(
      () => requestIdentity("/api/modules/catalog", accessToken!, { method: "POST", body: JSON.stringify(payload) }),
      "Módulo registrado y creado deshabilitado. Actívalo cuando su aplicación esté lista.",
    );
    setNewModule({ code: "", name: "", description: "", baseUrl: "", apiAudience: "", displayOrder: "100" });
  };

  const patchModule = async (module: ModuleInfo, values: Partial<ModuleInfo>) => {
    await withMutation(
      () => requestIdentity(`/api/modules/catalog/${encodeURIComponent(module.code)}`, accessToken!, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
      `Se actualizaron los ajustes de ${module.name}.`,
    );
  };

  const changePage = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(pagination.pages || 1, nextPage));
    setPage(safePage);
    setLoading(true);
    setError(null);
    loadUsers(safePage, search)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo cargar la página."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">ProIdentity · Administración</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Usuarios y módulos</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Las cuentas, sesiones y permisos residen en ProIdentity. Desde aquí administras el acceso a cada módulo sin tocar credenciales locales de ProCV.
          </p>
        </div>
        <button type="button" onClick={() => void loadAll()} className={buttonClass} disabled={loading || saving}>Actualizar datos</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        <button type="button" onClick={() => setTab("users")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "users" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
          Acceso de usuarios
        </button>
        <button type="button" onClick={() => setTab("catalog")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "catalog" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"}`}>
          Catálogo de módulos ({catalog.length})
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Consultando el registro central de ProIdentity…</div>
      ) : tab === "users" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full max-w-md">
              <label htmlFor="user-search" className={labelClass}>Buscar por nombre o correo</label>
              <input id="user-search" className={inputClass} value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Buscar usuario…" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{pagination.total} cuentas en ProIdentity</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Cuenta</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4">Último acceso</th>
                    {sortedCatalog.map((module) => <th className="px-4 py-4 text-center" key={module.code}>{module.name}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{user.name || "Sin nombre"}</p>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">{user.email}</p>
                        <p className="mt-1 text-xs text-slate-400">{user.role === "admin" ? "Administrador" : "Usuario"} · Alta {formatDate(user.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.emailVerified && user.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                          {!user.isActive ? "Inactiva" : user.emailVerified ? "Verificada" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{formatDate(user.lastLoginAt)}</td>
                      {sortedCatalog.map((module) => {
                        const grant = user.moduleAccess.find((entry) => entry.moduleCode === module.code);
                        const active = hasActiveGrant(grant);
                        return (
                          <td className="px-4 py-4 text-center" key={module.code}>
                            <button type="button" disabled={saving || (!active && !module.enabled) || !user.isActive}
                              onClick={() => void toggleAccess(user, module)}
                              title={!module.enabled && !active ? "Activa el módulo en el catálogo antes de conceder acceso" : active ? "Revocar acceso" : "Conceder acceso"}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-rose-950/60" : "bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {active ? "Concedido" : "Conceder"}
                            </button>
                            {grant?.expiresAt && <p className="mt-1 text-[10px] text-slate-400">Hasta {formatDate(grant.expiresAt)}</p>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={3 + sortedCatalog.length} className="px-5 py-12 text-center text-slate-500">No se encontraron cuentas.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-800">
              <span className="text-slate-500">Página {pagination.page} de {Math.max(1, pagination.pages)}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1 || saving} onClick={() => changePage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Anterior</button>
                <button type="button" disabled={page >= pagination.pages || saving} onClick={() => changePage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Siguiente</button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Registrar un módulo</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Los módulos nuevos se crean deshabilitados y sin acceso predeterminado. Actívalos después de desplegar su frontend y API.</p>
            <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={createModule}>
              <div><label className={labelClass} htmlFor="module-code">Código</label><input id="module-code" required pattern="[A-Za-z][A-Za-z0-9_]{1,31}" className={inputClass} value={newModule.code} onChange={(event) => setNewModule({ ...newModule, code: event.target.value.toUpperCase() })} placeholder="PROANALYTICS" /></div>
              <div><label className={labelClass} htmlFor="module-name">Nombre</label><input id="module-name" required className={inputClass} value={newModule.name} onChange={(event) => setNewModule({ ...newModule, name: event.target.value })} placeholder="ProAnalytics" /></div>
              <div><label className={labelClass} htmlFor="module-audience">Audience JWT</label><input id="module-audience" required className={inputClass} value={newModule.apiAudience} onChange={(event) => setNewModule({ ...newModule, apiAudience: event.target.value })} placeholder="proanalytics-api" /></div>
              <div className="sm:col-span-2"><label className={labelClass} htmlFor="module-description">Descripción</label><input id="module-description" className={inputClass} value={newModule.description} onChange={(event) => setNewModule({ ...newModule, description: event.target.value })} /></div>
              <div><label className={labelClass} htmlFor="module-url">URL base</label><input id="module-url" type="url" className={inputClass} value={newModule.baseUrl} onChange={(event) => setNewModule({ ...newModule, baseUrl: event.target.value })} placeholder="https://proanalytics.prosolutions.page" /></div>
              <div><label className={labelClass} htmlFor="module-order">Orden en portal</label><input id="module-order" type="number" min="0" max="10000" required className={inputClass} value={newModule.displayOrder} onChange={(event) => setNewModule({ ...newModule, displayOrder: event.target.value })} /></div>
              <div className="flex items-end"><button className={buttonClass} type="submit" disabled={saving}>Crear módulo deshabilitado</button></div>
            </form>
          </div>

          <div className="space-y-3">
            {sortedCatalog.map((module) => (
              <article key={module.code} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[240px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{module.name}</h3>
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{module.code}</code>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${module.enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{module.enabled ? "Habilitado" : "Deshabilitado"}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{module.description || "Sin descripción."}</p>
                    <p className="mt-2 break-all text-xs text-slate-400">Audience: {module.apiAudience}{module.baseUrl ? ` · ${module.baseUrl}` : ""}</p>
                  </div>
                  <div className="flex min-w-[240px] flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={module.enabled} disabled={saving} onChange={(event) => void patchModule(module, { enabled: event.target.checked })} /> Habilitado en el portal y para nuevas sesiones</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={module.defaultForNewUsers} disabled={saving || !module.enabled} onChange={(event) => void patchModule(module, { defaultForNewUsers: event.target.checked })} /> Acceso predeterminado para usuarios nuevos</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={module.defaultForAdmins} disabled={saving || !module.enabled} onChange={(event) => void patchModule(module, { defaultForAdmins: event.target.checked })} /> Acceso predeterminado para administradores nuevos</label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
