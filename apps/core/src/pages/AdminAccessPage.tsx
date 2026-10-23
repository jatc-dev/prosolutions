import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { identityAuthApiUrl } from "../identityApi";

const AUTH_API = identityAuthApiUrl();
const IDENTITY_API = AUTH_API.replace(/\/api\/auth$/i, "");
const ACCESS_TOKEN_KEY = "pro_identity_token";

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

let csrfToken: string | null = null;

async function accessToken(forceRefresh = false): Promise<string> {
  const cached = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (cached && !forceRefresh) return cached;

  const response = await fetch(`${AUTH_API}/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("La sesión expiró. Inicia sesión de nuevo.");
  const result = await response.json();
  if (!result?.accessToken) throw new Error("Identity no devolvió un token de acceso.");
  sessionStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
  return result.accessToken as string;
}

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) return csrfToken;
  const response = await fetch(`${IDENTITY_API}/api/csrf-token`, { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo iniciar la protección CSRF.");
  const result = await response.json();
  if (!result?.csrfToken) throw new Error("Identity no devolvió el token CSRF.");
  csrfToken = result.csrfToken;
  return csrfToken;
}

async function identityFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  let token = await accessToken();
  let csrf = mutating ? await getCsrfToken() : null;

  const send = (bearer: string, csrfValue: string | null) => fetch(`${IDENTITY_API}${path}`, {
    ...init,
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${bearer}`,
      ...(csrfValue ? { "X-CSRF-Token": csrfValue } : {}),
    },
  });

  let response = await send(token, csrf);
  if (response.status === 401) {
    token = await accessToken(true);
    response = await send(token, csrf);
  }
  if (response.status === 403 && mutating) {
    csrf = await getCsrfToken(true);
    response = await send(token, csrf);
  }
  return response;
}

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => ({}));
  return new Error(payload.message || `Solicitud fallida (${response.status})`);
}

export function AdminAccessPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadUsers = useCallback(async (search = activeQuery) => {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await identityFetch("/api/auth/me");
      if (!meResponse.ok) throw await responseError(meResponse);
      const me = await meResponse.json();
      if (me?.user?.role !== "admin") {
        setUsers([]);
        setTotal(0);
        setError("Esta sección está reservada para administradores de ProIdentity.");
        return;
      }

      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (search.trim()) params.set("search", search.trim());
      const response = await identityFetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) throw await responseError(response);
      const result = (await response.json()) as UserListResponse;
      setUsers(result.users);
      setTotal(result.pagination.total);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "No se pudieron cargar las cuentas.";
      setError(message);
      if (message.toLowerCase().includes("sesión expiró")) {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        navigate("/login", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [activeQuery, navigate]);

  useEffect(() => { void loadUsers(""); }, [loadUsers]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setActiveQuery(query);
    void loadUsers(query);
  };

  const toggleModule = async (user: IdentityUser, module: ModuleKey, enabled: boolean) => {
    const key = `${user.id}:${module}`;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const response = await identityFetch(`/api/modules/${enabled ? "grant" : "revoke"}`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id, module }),
      });
      if (!response.ok) throw await responseError(response);
      setNotice(`${MODULES.find((item) => item.key === module)?.label}: permiso ${enabled ? "activado" : "revocado"} para ${user.email}.`);
      await loadUsers(activeQuery);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar el permiso.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-300">ProIdentity · Administración</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Cuentas y permisos de módulos</h1>
            <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">Gestiona el acceso central de ProCV, ProJobs y los módulos futuros. Los permisos se guardan en ProIdentity; cada API los vuelve a validar.</p>
          </div>
          <Link to="/dashboard" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Volver al portal</Link>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="identity-user-search">Buscar cuentas</label>
            <input id="identity-user-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo" className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950" />
            <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">Buscar cuentas</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{total} cuenta(s) encontradas · mostrando hasta 50</span>
            <span>Los cambios se aplican en ProIdentity.</span>
          </div>
        </section>

        {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}

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
                  <span className={`rounded-full px-3 py-1 ${user.role === "admin" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{user.role}</span>
                  <span className={`rounded-full px-3 py-1 ${user.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200"}`}>{user.isActive ? "Cuenta activa" : "Cuenta desactivada"}</span>
                  <span className={`rounded-full px-3 py-1 ${user.emailVerified ? "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"}`}>{user.emailVerified ? "Correo verificado" : "Correo pendiente"}</span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MODULES.map((module) => {
                  const checked = user.modules.includes(module.key);
                  const key = `${user.id}:${module.key}`;
                  return (
                    <label key={module.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30" : "border-slate-200 dark:border-slate-800"} ${busyKey === key ? "opacity-60" : ""}`}>
                      <input type="checkbox" checked={checked} disabled={busyKey !== null || !user.isActive} onChange={(event) => void toggleModule(user, module.key, event.target.checked)} className="mt-1 h-4 w-4 accent-brand-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{module.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{module.description}</span>
                        <span className="mt-1 block text-xs font-medium">{checked ? "Acceso habilitado" : "Sin acceso"}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
