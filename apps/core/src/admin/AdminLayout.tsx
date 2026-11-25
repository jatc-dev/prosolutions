import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ProFooter, ProHeader } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { identityRequest, saveUserPreferences } from "../preferencesApi";

/**
 * Navigation of the administration module. One place for every admin area;
 * personal account items (preferences, own devices and sessions) live only in
 * the user menu of the header, never here.
 */
type NavItem = { to: string; es: string; en: string; any: string[] };
type NavGroup = { es: string; en: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  { es: "General", en: "General", items: [{ to: "/admin", es: "Resumen", en: "Overview", any: [] }] },
  {
    es: "Personas", en: "People", items: [
      { to: "/admin/usuarios", es: "Usuarios", en: "Users", any: ["identity.users.read"] },
      { to: "/admin?section=roles", es: "Roles y permisos", en: "Roles and permissions", any: ["identity.roles.read"] },
    ],
  },
  {
    es: "Módulos", en: "Modules", items: [
      { to: "/admin?section=modules", es: "Estado de los módulos", en: "Module status", any: [] },
      { to: "/admin/empresas", es: "ProJobs · Empresas", en: "ProJobs · Companies", any: ["projobs.catalog.read"] },
      { to: "/admin/vacantes", es: "ProJobs · Vacantes", en: "ProJobs · Jobs", any: ["projobs.catalog.read"] },
      { to: "/admin?section=audit", es: "ProCV · Auditoría", en: "ProCV · Audit", any: ["procv.audit.read"] },
    ],
  },
  {
    es: "Plataforma", en: "Platform", items: [
      { to: "/admin?section=landing", es: "Contenido público", en: "Public content", any: ["procv.settings.read", "platform.content.manage"] },
      { to: "/admin/publicidad", es: "Publicidad", en: "Advertising", any: ["platform.settings.manage"] },
      { to: "/admin?section=platform", es: "Configuración", en: "Settings", any: [] },
    ],
  },
  {
    es: "Seguridad y cumplimiento", en: "Security and compliance", items: [
      { to: "/admin/auditoria", es: "Auditoría de accesos", en: "Access audit", any: ["identity.audit.read"] },
    ],
  },
];

export type AdminAccount = { id: string; name: string | null; email: string; permissions: string[] };
let accountRequest: Promise<AdminAccount | null> | null = null;

/** Signed-in account with its global + module permissions (one request per page load). */
export function loadAdminAccount(): Promise<AdminAccount | null> {
  accountRequest ??= identityRequest("/api/auth/me")
    .then((response) => (response.ok ? response.json() : null))
    .then((me) => {
      const user = me?.user;
      if (!user) { accountRequest = null; return null; }
      const modulePermissions = Object.values((user.modulePermissions ?? {}) as Record<string, string[]>).flat();
      const permissions = [...new Set([...(Array.isArray(user.permissions) ? user.permissions : []), ...modulePermissions])] as string[];
      return { id: String(user.id ?? ""), name: user.name ?? null, email: String(user.email ?? ""), permissions };
    })
    .catch(() => {
      accountRequest = null;
      return null;
    });
  return accountRequest;
}

export function loadAdminPermissions(): Promise<string[]> {
  return loadAdminAccount().then((account) => account?.permissions ?? []);
}

export function resetAdminPermissionsCache() {
  accountRequest = null;
}

function isActive(to: string, pathname: string, search: string): boolean {
  const [path, query] = to.split("?");
  if (query) return pathname === path && search.includes(query);
  if (path === "/admin") return pathname === "/admin" && !/section=/.test(search);
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function AdminSidebar({ english }: { english: boolean }) {
  const { pathname, search } = useLocation();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  useEffect(() => {
    let active = true;
    void loadAdminPermissions().then((value) => active && setPermissions(value));
    return () => { active = false; };
  }, []);
  const allowed = (item: NavItem) => item.any.length === 0 || item.any.some((permission) => permissions?.includes(permission));
  const groups = ADMIN_NAV.map((group) => ({ ...group, items: group.items.filter(allowed) })).filter((group) => group.items.length);

  return (
    <nav aria-label={english ? "Administration" : "Administración"} className="lg:w-60 lg:shrink-0">
      <p className="mb-3 hidden text-xs font-semibold uppercase tracking-wider text-brand-800 dark:text-brand-300 lg:block">{english ? "Administration" : "Administración"}</p>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-5 lg:overflow-visible lg:pb-0">
        {groups.map((group) => (
          <div key={group.es} className="flex shrink-0 gap-2 lg:block">
            <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 lg:block">{english ? group.en : group.es}</p>
            {group.items.map((item) => {
              const current = isActive(item.to, pathname, search);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={current ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${current ? "bg-brand-800 text-white dark:bg-brand-500 dark:text-slate-950" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                >
                  {english ? item.en : item.es}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Sidebar + content area used by every administration page. */
export function AdminLayout({ english, children }: { english: boolean; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10">
      <AdminSidebar english={english} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Full admin page: header (personal menu), admin sidebar, content and footer. */
export function AdminShell({ children }: { children: (context: { english: boolean; t: (es: string, en: string) => string }) => ReactNode }) {
  const { locale, setLocale } = useCoreLocale();
  const english = locale === "en";
  const [account, setAccount] = useState<AdminAccount | null>(null);
  useEffect(() => {
    let active = true;
    void loadAdminAccount().then((value) => active && setAccount(value));
    return () => { active = false; };
  }, []);
  const logout = async () => {
    await identityRequest("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    sessionStorage.removeItem("pro_identity_token");
    resetAdminPermissionsCache();
    window.location.assign("/login");
  };
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ProHeader activeApp="core" locale={locale} onLocaleChange={() => { const next = english ? "es" : "en"; setLocale(next); void saveUserPreferences({ locale: next }).catch(() => undefined); }} profile={account ? { name: account.name, email: account.email } : null} onSignOut={logout} settingsHref="/settings" securityHref="/security/sessions" />
      <AdminLayout english={english}>{children({ english, t: (es, en) => (english ? en : es) })}</AdminLayout>
      <ProFooter locale={locale} />
    </div>
  );
}
