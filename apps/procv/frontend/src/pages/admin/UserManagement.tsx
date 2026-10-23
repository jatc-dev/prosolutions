import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { identityAuthApiUrl } from "../../lib/identityUrl";
import { useAuth } from "../../stores/authStore";

type ModuleName =
  | "PROCV"
  | "PROJOBS"
  | "PROSKILLS"
  | "PROCAREER"
  | "PROINTERVIEW"
  | "PRORECRUIT";

interface ModuleGrant {
  module: ModuleName;
  active: boolean;
  grantedAt: string | null;
  expiresAt: string | null;
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
  modules: ModuleGrant[];
}

interface UsersResponse {
  users: IdentityUser[];
  availableModules: ModuleName[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const IDENTITY_BASE_URL = identityAuthApiUrl().replace(/\\/api\\/auth\\/?$/i, "");
const FALLBACK_MODULES: ModuleName[] = [
  "PROCV",
  "PROJOBS",
  "PROSKILLS",
  "PROCAREER",
  "PROINTERVIEW",
  "PRORECRUIT",
];

const MODULE_LABELS: Record<ModuleName, { es: string; en: string }> = {
  PROCV: { es: "ProCV · CV y perfil", en: "ProCV · CV and profile" },
  PROJOBS: { es: "ProJobs · Empleo", en: "ProJobs · Jobs" },
  PROSKILLS: { es: "ProSkills · Competencias", en: "ProSkills · Skills" },
  PROCAREER: { es: "ProCareer · Carrera", en: "ProCareer · Career" },
  PROINTERVIEW: { es: "ProInterview · Entrevistas", en: "ProInterview · Interviews" },
  PRORECRUIT: { es: "ProRecruit · Selección", en: "ProRecruit · Recruiting" },
};

export function UserManagement() {
  const { t, i18n } = useTranslation();
  const { accessToken, user: currentUser } = useAuth();
  const isSpanish = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase().startsWith("es");
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [modules, setModules] = useState<ModuleName[]>(FALLBACK_MODULES);
  const [pagination, setPagination] = useState<UsersResponse["pagination"] | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const text = useCallback((es: string, en: string) => (isSpanish ? es : en), [isSpanish]);

  const request = useCallback(async (
    path: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    if (!accessToken) throw new Error(text("No hay una sesión válida. Inicia sesión de nuevo.", "No active session. Please sign in again."));

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    if (options.method && !["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase())) {
      const csrfResponse = await fetch(`${IDENTITY_BASE_URL}/api/csrf-token`, {
        method: "GET",
        credentials: "include",
      });
      if (!csrfResponse.ok) {
        throw new Error(text("No se pudo preparar la solicitud segura.", "Unable to initialize a secure request."));
      }
      const csrfData = await csrfResponse.json().catch(() => ({}));
      if (typeof csrfData.csrfToken !== "string" || !csrfData.csrfToken) {
        throw new Error(text("Identity no devolvió el token CSRF.", "Identity did not return a CSRF token."));
      }
      headers.set("X-CSRF-Token", csrfData.csrfToken);
    }

    return fetch(`${IDENTITY_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  }, [accessToken, text]);

  const loadUsers = useCallback(async (targetPage: number, targetSearch: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
      });
      if (targetSearch.trim()) params.set("search", targetSearch.trim());
      const response = await request(`/api/modules/users?${params.toString()}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || text("No se pudieron cargar los usuarios de ProIdentity.", "Could not load ProIdentity users."));
      }
      const result = data as UsersResponse;
      setUsers(result.users || []);
      setModules(result.availableModules || FALLBACK_MODULES);
      setPagination(result.pagination || null);
      setPage(result.pagination?.page || targetPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text("Error desconocido.", "Unknown error."));
    } finally {
      setLoading(false);
    }
  }, [request, text]);

  useEffect(() => {
    void loadUsers(1, "");
  }, [loadUsers]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchInput);
    setPage(1);
    void loadUsers(1, searchInput);
  };

  const toggleModule = async (targetUser: IdentityUser, module: ModuleName) => {
    const grant = targetUser.modules.find((item) => item.module === module);
    const currentlyActive = Boolean(grant?.active);
    const operation = currentlyActive ? "revoke" : "grant";
    const key = `${targetUser.id}:${module}`;

    if (targetUser.id === currentUser?.id && module === "PROCV" && currentlyActive) {
      toast.error(text(
        "No puedes revocarte ProCV desde el panel de administración que depende de ese módulo.",
        "You cannot revoke your own ProCV access from the administration panel that depends on it.",
      ));
      return;
    }

    try {
      setSavingKey(key);
      const response = await request(`/api/modules/${operation}`, {
        method: "POST",
        body: JSON.stringify({ userId: targetUser.id, module }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || text("No se pudo actualizar el permiso.", "Could not update module access."));

      toast.success(text(
        `${MODULE_LABELS[module].es.split(" · ")[0]}: ${currentlyActive ? "acceso revocado" : "acceso concedido"}.`,
        `${module}: access ${currentlyActive ? "revoked" : "granted"}.`,
      ));
      await loadUsers(page, search);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : text("Error al actualizar el permiso.", "Could not update access."));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
            ProIdentity · Access control
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            {text("Usuarios y acceso a módulos", "Users and module access")}
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">
            {text(
              "Gestiona permisos desde la fuente central. Las cuentas, contraseñas, verificación y sesiones pertenecen a ProIdentity; ProCV solo consume los permisos firmados en el token.",
              "Manage entitlements at the central source. Accounts, passwords, verification and sessions belong to ProIdentity; ProCV consumes the signed module grants in the access token.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers(page, search)}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {text("Actualizar", "Refresh")}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{text("Cuentas en Identity", "Identity accounts")}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{pagination?.total ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{text("Módulos disponibles", "Available modules")}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{modules.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{text("Página actual", "Current page")}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{pagination ? `${pagination.page} / ${Math.max(pagination.pages, 1)}` : "—"}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-100">
        {text(
          "Los cambios de permisos afectan los nuevos tokens. Las sesiones existentes reciben los permisos actualizados al renovar el token; los access tokens actuales duran hasta 15 minutos.",
          "Permission changes apply to newly issued tokens. Existing sessions receive the updated grants on refresh; current access tokens can remain valid for up to 15 minutes.",
        )}
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row dark:border-slate-700 dark:bg-slate-900">
        <label className="sr-only" htmlFor="identity-user-search">{text("Buscar usuario", "Search users")}</label>
        <input
          id="identity-user-search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={text("Buscar por nombre o correo electrónico", "Search by name or email")}
          className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
        />
        <button type="submit" className="min-h-11 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
          {text("Buscar", "Search")}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-100" role="alert">
          <p>{error}</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => void loadUsers(page, search)}>
            {text("Reintentar", "Try again")}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{text("Acceso por usuario", "Access by user")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text("Los permisos se gestionan en ProIdentity; los datos de CV permanecen en ProCV.", "Entitlements are managed in ProIdentity; CV data remains in ProCV.")}</p>
          </div>
          {loading && <span className="text-sm text-slate-500">{text("Cargando…", "Loading…")}</span>}
        </div>

        {!loading && users.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {text("No se encontraron cuentas.", "No accounts found.")}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {users.map((item) => (
              <article key={item.id} className="p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-all font-semibold text-slate-900 dark:text-white">{item.name || item.email}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.role === "admin" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                        {item.role === "admin" ? text("Administrador", "Administrator") : text("Usuario", "User")}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.emailVerified ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"}`}>
                        {item.emailVerified ? text("Correo verificado", "Email verified") : text("Correo pendiente", "Email pending")}
                      </span>
                      {!item.isActive && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
                          {text("Cuenta inactiva", "Inactive account")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">{item.email}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {text("ID Identity", "Identity ID")}: <code>{item.id}</code>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[min(100%,580px)] xl:grid-cols-3">
                    {modules.map((module) => {
                      const grant = item.modules.find((candidate) => candidate.module === module);
                      const active = Boolean(grant?.active);
                      const key = `${item.id}:${module}`;
                      const saving = savingKey === key;
                      const ownProcvGuard = item.id === currentUser?.id && module === "PROCV" && active;
                      return (
                        <button
                          key={module}
                          type="button"
                          aria-pressed={active}
                          disabled={loading || savingKey !== null || !item.isActive || ownProcvGuard}
                          onClick={() => void toggleModule(item, module)}
                          title={ownProcvGuard ? text("Conserva tu propio acceso administrativo a ProCV.", "Keep your own ProCV admin access.") : undefined}
                          className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold">{MODULE_LABELS[module][isSpanish ? "es" : "en"]}</span>
                            <span className="mt-0.5 block text-[11px] opacity-75">
                              {saving ? text("Guardando…", "Saving…") : active ? text("Acceso activo", "Access enabled") : text("Sin acceso", "No access")}
                            </span>
                          </span>
                          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pagination ? text(
              `${pagination.total} cuentas · ${pagination.limit} por página`,
              `${pagination.total} accounts · ${pagination.limit} per page`,
            ) : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || !pagination || page <= 1}
              onClick={() => { const nextPage = page - 1; setPage(nextPage); void loadUsers(nextPage, search); }}
              className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
            >
              {text("Anterior", "Previous")}
            </button>
            <button
              type="button"
              disabled={loading || !pagination || page >= pagination.pages}
              onClick={() => { const nextPage = page + 1; setPage(nextPage); void loadUsers(nextPage, search); }}
              className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
            >
              {text("Siguiente", "Next")}
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
