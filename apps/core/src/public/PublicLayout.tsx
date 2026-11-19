import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { NoAds, ProFooter, ProHeader } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { useHeaderSession } from "../useHeaderSession";

export interface Crumb {
  name: string;
  path: string;
}

interface PublicLayoutProps {
  children: ReactNode;
  /** Visible breadcrumb trail (the JSON-LD version lives in the prerendered head). */
  breadcrumbs?: Crumb[];
  /** Legal, contact and error pages never show ads. */
  noAds?: boolean;
}

/** Shell for every public, prerendered page: shared header, footer and breadcrumbs. */
export function PublicLayout({ children, breadcrumbs, noAds = false }: PublicLayoutProps) {
  const { locale, setLocale } = useCoreLocale();
  const { user, authLoading, signOut } = useHeaderSession();
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname);

  const content = (
    <div className="ui-page flex min-h-screen flex-col">
      <ProHeader
        activeApp="core"
        locale={locale}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
        profile={user ? { name: user.name, email: user.email } : null}
        profileHref="/dashboard"
        securityHref="/security/sessions"
        onSignOut={user ? signOut : undefined}
        loginHref={`/login?returnTo=${returnTo}`}
        authLoading={authLoading}
      />
      <main id="contenido" className="flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Ruta de navegación" className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-ui-muted">
              <li>
                <Link to="/" className="hover:text-ui-text hover:underline">Inicio</Link>
              </li>
              {breadcrumbs.map((crumb, index) => {
                const last = index === breadcrumbs.length - 1;
                return (
                  <li key={crumb.path} className="flex items-center gap-1">
                    <span aria-hidden="true">/</span>
                    {last ? (
                      <span aria-current="page" className="line-clamp-1 text-ui-text">{crumb.name}</span>
                    ) : (
                      <Link to={crumb.path} className="hover:text-ui-text hover:underline">{crumb.name}</Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {children}
      </main>
      <ProFooter locale={locale} />
    </div>
  );

  return noAds ? <NoAds>{content}</NoAds> : content;
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  // Built from parts at noon UTC so the date never shifts with the time zone.
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
