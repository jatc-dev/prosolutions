import { ConsentBanner, ProFooter, ProHeader, cn } from "@prosolutions/ui";
import { Bookmark, Briefcase, Building2, FileCheck2 } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CORE_URL, loginUrl } from "../lib/env";
import { useSession } from "../lib/session";

function ModuleNav() {
  const { status, session } = useSession();
  const items: Array<{ to: string; label: string; icon: ReactNode; show: boolean }> = [
    { to: "/", label: "Empleos", icon: <Briefcase className="h-4 w-4" />, show: true },
    { to: "/postulaciones", label: "Mis postulaciones", icon: <FileCheck2 className="h-4 w-4" />, show: status === "authenticated" && Boolean(session?.isCandidate) },
    { to: "/guardados", label: "Guardados", icon: <Bookmark className="h-4 w-4" />, show: status === "authenticated" && Boolean(session?.isCandidate) },
    { to: "/empresa", label: "Empresa", icon: <Building2 className="h-4 w-4" />, show: status === "authenticated" && Boolean(session?.isRecruiter) },
  ];
  return (
    <nav aria-label="Secciones de ProJobs" className="border-b border-ui-border bg-ui-surface">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {items
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                  isActive ? "border-brand-800 text-ui-text" : "border-transparent text-ui-muted hover:text-ui-text",
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
      </div>
    </nav>
  );
}

export function Layout() {
  const { status, session, profile, signOut } = useSession();
  return (
    <div className="flex min-h-screen flex-col bg-ui-bg text-ui-text">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ui-surface focus:px-4 focus:py-2">
        Saltar al contenido
      </a>
      <ProHeader
        activeApp="projobs"
        authLoading={status === "loading"}
        profile={status === "authenticated" && profile ? { name: profile.name, email: profile.email, avatarUrl: profile.avatarUrl, modules: session?.isRecruiter ? ["PRORECRUIT"] : [] } : null}
        onSignOut={signOut}
        profileHref={`${CORE_URL}/dashboard`}
        settingsHref={`${CORE_URL}/dashboard`}
        loginHref={loginUrl()}
      />
      <ModuleNav />
      <main id="contenido" className="flex-1">
        <Outlet />
      </main>
      <ProFooter />
      <ConsentBanner />
    </div>
  );
}
