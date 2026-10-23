import { useCallback, useEffect, useState } from "react";
import { ProFooter, ProHeader } from "@prosolutions/ui";
import { useNavigate } from "react-router-dom";
import { useCoreLocale } from "../i18n";
import { identityAuthApiUrl } from "../identityApi";

const IDENTITY_API_URL = identityAuthApiUrl();
const IDENTITY_BASE_URL = IDENTITY_API_URL.replace(/\/api\/auth\/?$/, "");
const ACCESS_TOKEN_KEY = "pro_identity_token";

interface PortalUser {
  id: string;
  name?: string | null;
  email: string;
  role?: string;
  modules?: string[];
}

interface ModuleCatalogItem {
  code: string;
  name: string;
  description?: string | null;
  baseUrl?: string | null;
  apiAudience: string;
  enabled: boolean;
  displayOrder: number;
}

async function fetchCurrentUser(token: string): Promise<Response> {
  return fetch(`${IDENTITY_API_URL}/me`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function fetchCatalog(token: string): Promise<ModuleCatalogItem[]> {
  const response = await fetch(`${IDENTITY_BASE_URL}/api/modules/catalog`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("No se pudo cargar el catálogo central de módulos.");
  }
  const payload = await response.json();
  return Array.isArray(payload?.modules) ? payload.modules : [];
}

function moduleInitials(code: string): string {
  const words = code.replace(/^PRO/, "").replace(/([A-Z])/g, " $1").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join("") : code.slice(0, 2)).toUpperCase();
}

export function PortalPage() {
  const { locale, setLocale } = useCoreLocale();
  const navigate = useNavigate();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [modules, setModules] = useState<ModuleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const language = locale === "es" ? "es" : "en";

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
      let response = token ? await fetchCurrentUser(token) : null;

      if (!response || !response.ok) {
        const refresh = await fetch(`${IDENTITY_API_URL}/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!refresh.ok) {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          navigate("/login", { replace: true });
          return;
        }
        const result = await refresh.json();
        token = typeof result.accessToken === "string" ? result.accessToken : null;
        if (!token) throw new Error("No se pudo renovar la sesión.");
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
        response = await fetchCurrentUser(token);
      }

      if (!response.ok) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const result = await response.json();
      if (!result?.user) throw new Error("No se pudo cargar el perfil central de usuario.");

      const catalog = await fetchCatalog(token!);
      setUser(result.user);
      setModules(catalog.filter((module) => module.enabled && module.baseUrl && (result.user.modules || []).includes(module.code))
        .sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar el portal.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadPortal();
  }, [loadPortal]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${IDENTITY_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.location.assign("/login");
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ProHeader activeApp="core" locale={language} onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8">
        {loading ? (
          <div className="py-20 text-center text-slate-500" role="status">Cargando tu portal y los permisos de tus módulos...</div>
        ) : error ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
            <h1 className="text-xl font-bold">No pudimos abrir tu portal</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => void loadPortal()}
                className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">Reintentar</button>
              <button type="button" onClick={logout}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cerrar sesión</button>
            </div>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-600 dark:text-brand-300">ProSolutions · Portal de trabajo</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Hola{user?.name ? `, ${user.name}` : ""}. ¿Qué quieres hacer hoy?</h1>
                <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">Tu cuenta y tus permisos se administran desde ProIdentity. Aquí aparecen únicamente los módulos habilitados para tu cuenta.</p>
              </div>
              <button type="button" onClick={logout}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Cerrar sesión</button>
            </div>

            {modules.length > 0 ? (
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((module) => (
                  <a key={module.code} href={module.baseUrl!}
                    className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold tracking-wide text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                      {moduleInitials(module.code)}
                    </div>
                    <h2 className="mt-5 text-xl font-bold">{module.name}</h2>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{module.description || `Accede a las herramientas de ${module.name}.`}</p>
                    <span className="mt-6 inline-flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">Abrir módulo <span aria-hidden="true">→</span></span>
                  </a>
                ))}
              </div>
            ) : (
              <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-xl font-bold">Todavía no tienes módulos disponibles</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">Tu cuenta está activa, pero actualmente no hay módulos habilitados que coincidan con tus permisos. Contacta con un administrador de ProSolutions.</p>
              </section>
            )}
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">Sesión iniciada como {user?.email}. El acceso a cada módulo lo valida su propio backend con los permisos emitidos por ProIdentity.</p>
          </>
        )}
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
