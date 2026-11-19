import { ProFooter, ProHeader } from "@prosolutions/ui";
import { Hero } from "../components/Hero";
import { Modules } from "../components/Modules";
import { useCoreLocale } from "../i18n";
import { useHeaderSession } from "../useHeaderSession";
import { useDocumentHead } from "../public/seo";

export function LandingPage() {
  const { locale, setLocale, copy } = useCoreLocale();
  const { user, authLoading, signOut } = useHeaderSession();
  // Restores the landing head after client-side navigation from another page.
  useDocumentHead({ title: copy.seo.title, description: copy.seo.description, path: "/" });

  return (
    <div className="ui-page flex min-h-screen flex-col">
      <ProHeader
        activeApp="core"
        locale={locale}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
        profile={user ? { name: user.name, email: user.email } : null}
        profileHref="/dashboard"
        securityHref="/security/sessions"
        onSignOut={user ? signOut : undefined}
        loginHref="/login?returnTo=%2F"
        authLoading={authLoading}
      />
      <main className="flex-1">
        <Hero />
        <Modules />
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
