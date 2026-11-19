import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { identityAuthApiUrl } from "../identityApi";
import { ProFooter, ProHeader } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { saveUserPreferences } from "../preferencesApi";
import {
  accessFailureForStatus,
  errorMessage,
  expireAdminSession,
  hasPermission,
  performModuleMutation,
  requestAdminUsers,
  retryUnauthorizedResponse,
  SessionExpiredError,
  USER_MANAGE_PERMISSION,
  USER_READ_PERMISSION,
} from "./adminAccessPolicy";
import type { AdminAccessState } from "./adminAccessPolicy";
import {
  AdminAccessDeniedView,
  AdminAccessErrorView,
  AdminAccessHeader,
  AdminAccessLoadingView,
  AdminAccessModuleControl,
} from "./adminAccessViews";

const AUTH_API = identityAuthApiUrl();
const IDENTITY_API = AUTH_API.replace(/\/api\/auth$/i, "");
const ACCESS_TOKEN_KEY = "pro_identity_token";
const CSRF_TOKEN_KEY = "pro_identity_csrf_token";

const MODULES = [
  { key: "PROCV", label: "ProCV", description: "CV y análisis ATS" },
  { key: "PROJOBS", label: "ProJobs", description: "Búsqueda de empleo" },
  { key: "PROSKILLS", label: "ProSkills", description: "Aprendizaje y habilidades" },
  { key: "PROCAREER", label: "ProCareer", description: "Gestión de carrera" },
  { key: "PROINTERVIEW", label: "ProInterview", description: "Práctica de entrevistas" },
  { key: "PRORECRUIT", label: "ProRecruit", description: "Reclutamiento" },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];
interface IdentityUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  modules: ModuleKey[];
}
interface UserListResponse {
  users: IdentityUser[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

async function accessToken(forceRefresh = false): Promise<string> {
  const cached = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (cached && !forceRefresh) return cached;

  const response = await fetch(`${AUTH_API}/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 403) throw new Error("No tienes autorización para renovar esta sesión.");
  if (!response.ok) throw new Error(`No se pudo renovar la sesión (${response.status}).`);
  const result = await response.json();
  if (!result?.accessToken) throw new Error("Identity no devolvió un token de acceso.");
  sessionStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
  return result.accessToken as string;
}

async function getCsrfToken(forceRefresh = false): Promise<string> {
  const cached = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (cached && !forceRefresh) return cached;
  const response = await fetch(`${IDENTITY_API}/api/csrf-token`, { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo iniciar la protección CSRF.");
  const result = await response.json();
  if (!result?.csrfToken) throw new Error("Identity no devolvió el token CSRF.");
  const token = result.csrfToken as string;
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  return token;
}

async function identityFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  let token = await accessToken();
  let csrf = mutating ? await getCsrfToken() : null;

  const send = (bearer: string, csrfValue: string | null) => {
    const headers = new Headers(init.headers || {});
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${bearer}`);
    if (csrfValue) headers.set("X-CSRF-Token", csrfValue);
    return fetch(`${IDENTITY_API}${path}`, {
      ...init,
      method,
      credentials: "include",
      headers,
    });
  };

  let refreshedToken = token;
  let response = await retryUnauthorizedResponse(
    (afterRefresh) => {
      if (afterRefresh) token = refreshedToken;
      return send(token, csrf);
    },
    async () => { refreshedToken = await accessToken(true); },
  );
  if (response.status === 403 && mutating && await isCsrfFailure(response)) {
    csrf = await getCsrfToken(true);
    response = await send(token, csrf);
  }
  return response;
}

async function isCsrfFailure(response: Response): Promise<boolean> {
  const payload = await response.clone().json().catch(() => ({}));
  return typeof payload?.message === "string" && /csrf token (missing|mismatch)/i.test(payload.message);
}

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => ({}));
  return new Error(payload.message || `Solicitud fallida (${response.status})`);
}

export function AdminAccessPage() {
  const navigate = useNavigate();
  const { locale, setLocale } = useCoreLocale();
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name?: string | null; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [accessState, setAccessState] = useState<AdminAccessState>("loading");

  const expireSession = useCallback(() => {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    expireAdminSession(
      () => sessionStorage.removeItem(ACCESS_TOKEN_KEY),
      () => navigate("/login", { replace: true }),
    );
  }, [navigate]);

  const loadUsers = useCallback(async (search = activeQuery, requestedPage = 1) => {
    setLoading(true);
    setError(null);
    setAccessState("loading");
    try {
      const meResponse = await identityFetch("/api/auth/me");
      const meFailure = accessFailureForStatus(meResponse.status);
      if (meFailure === "session-expired") {
        expireSession();
        return;
      }
      if (meFailure === "denied") {
        setCanManageUsers(false);
        setAccessState("denied");
        return;
      }
      if (!meResponse.ok) throw await responseError(meResponse);
      const me = await meResponse.json();
      if (me?.user) setProfile({ name: me.user.name, email: me.user.email });
      const permissions = Array.isArray(me?.user?.permissions) ? me.user.permissions as string[] : [];
      if (!hasPermission(permissions, USER_READ_PERMISSION)) {
        setUsers([]);
        setTotal(0);
        setCanManageUsers(false);
        setAccessState("denied");
        return;
      }
      setCanManageUsers(hasPermission(permissions, USER_MANAGE_PERMISSION));

      const params = new URLSearchParams({ page: String(requestedPage), limit: "50" });
      if (search.trim()) params.set("search", search.trim());
      const response = await requestAdminUsers(permissions, params.toString(), identityFetch);
      if (!response) {
        setCanManageUsers(false);
        setAccessState("denied");
        return;
      }
      const usersFailure = accessFailureForStatus(response.status);
      if (usersFailure === "session-expired") {
        expireSession();
        return;
      }
      if (usersFailure === "denied") {
        setCanManageUsers(false);
        setAccessState("denied");
        return;
      }
      if (!response.ok) throw await responseError(response);
      const result = (await response.json()) as UserListResponse;
      setUsers(result.users);
      setTotal(result.pagination.total);
      setCurrentPage(result.pagination.page);
      setPages(Math.max(1, result.pagination.pages));
      setAccessState("authorized");
    } catch (reason) {
      if (reason instanceof SessionExpiredError) {
        expireSession();
        return;
      }
      const message = errorMessage(reason, "No se pudieron cargar las cuentas.");
      setError(message);
      setAccessState("error");
    } finally {
      setLoading(false);
    }
  }, [activeQuery, expireSession]);

  useEffect(() => { void loadUsers(activeQuery, currentPage); }, [loadUsers, activeQuery, currentPage]);

  if (accessState === "denied") return <AdminAccessDeniedView />;
  if (accessState === "error") return <AdminAccessErrorView message={error || "No se pudieron cargar las cuentas."} onRetry={() => void loadUsers(activeQuery, currentPage)} />;
  if (accessState === "loading") return <AdminAccessLoadingView />;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setActiveQuery(query);
    setCurrentPage(1);
  };

  const toggleModule = async (user: IdentityUser, module: ModuleKey, enabled: boolean) => {
    const key = `${user.id}:${module}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const result = await performModuleMutation(
        () => identityFetch(`/api/modules/${enabled ? "grant" : "revoke"}`, {
          method: "POST",
          body: JSON.stringify({ userId: user.id, module }),
        }),
        async () => {
          setNotice(`${MODULES.find((item) => item.key === module)?.label}: permiso ${enabled ? "activado" : "revocado"} para ${user.email}.`);
          await loadUsers(activeQuery, currentPage);
        },
      );
      if (result.kind === "session-expired") {
        expireSession();
        return;
      }
      if (result.kind === "denied") {
        throw new Error("No tienes permiso para gestionar accesos de módulos.");
      }
      if (result.kind === "error") throw await responseError(result.response);
    } catch (reason) {
      if (reason instanceof SessionExpiredError) {
        expireSession();
        return;
      }
      setError(errorMessage(reason, "No se pudo actualizar el permiso."));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <ProHeader activeApp="core" locale={locale} onLocaleChange={() => { const next = locale === "es" ? "en" : "es"; setLocale(next); void saveUserPreferences({ locale: next }).catch(() => undefined); }} profile={profile} settingsHref="/settings" securityHref="/security/sessions" />
    <nav className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto flex max-w-7xl flex-wrap gap-2"><Link to="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Panel de administración</Link><Link to="/admin/access" aria-current="page" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Usuarios y accesos</Link><Link to="/settings" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Configuración</Link><Link to="/security/sessions" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">Seguridad y sesiones</Link></div></nav>
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AdminAccessHeader />
          <Link to="/dashboard" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Volver al portal</Link>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="identity-user-search">Buscar cuentas</label>
            <input id="identity-user-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 dark:border-slate-700 dark:bg-slate-950" />
            <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-brand-800 px-5 py-2 font-semibold text-white hover:bg-brand-900 disabled:opacity-60">Buscar cuentas</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{total} cuenta(s) encontradas · página {currentPage} de {pages}</span>
            <span>Los cambios se aplican en ProIdentity.</span>
          </div>
        </section>

        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">{notice}</div>}

        <section aria-label="Cuentas de Identity" className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">Cargando cuentas y permisos…</div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">No hay cuentas para mostrar.</div>
          ) : users.map((user) => (
            <article key={user.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{user.name || "Sin nombre"}</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">ID: {user.id}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${user.role === "admin" ? "bg-brand-100 text-brand-950 dark:bg-brand-950/50 dark:text-brand-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{user.role}</span>
                  <span className={`rounded-full px-3 py-1 ${user.isActive ? "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200" : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200"}`}>{user.isActive ? "Cuenta activa" : "Cuenta desactivada"}</span>
                  <span className={`rounded-full px-3 py-1 ${user.emailVerified ? "bg-brand-100 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"}`}>{user.emailVerified ? "Correo verificado" : "Correo pendiente"}</span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODULES.map((module) => {
                  const checked = user.modules.includes(module.key);
                  const key = `${user.id}:${module.key}`;
                  return (
                    <AdminAccessModuleControl
                      key={module.key}
                      label={module.label}
                      description={module.description}
                      checked={checked}
                      isActive={user.isActive}
                      canManage={canManageUsers}
                      busy={busyKey === key}
                      onChange={(enabled) => void toggleModule(user, module.key, enabled)}
                    />
                  );
                })}
              </div>
            </article>
          ))}
          {!loading && pages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Anterior</button>
              <span className="text-sm text-slate-500 dark:text-slate-400">Página {currentPage} / {pages}</span>
              <button type="button" disabled={currentPage >= pages} onClick={() => setCurrentPage((value) => Math.min(pages, value + 1))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700">Siguiente</button>
            </div>
          )}
        </section>
      </div>
    </main>
    <ProFooter locale={locale} />
    </div>
  );
}
