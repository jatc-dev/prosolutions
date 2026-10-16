import { ProFooter, ProHeader } from "@prosolutions/ui";
import { AdsSection } from "../components/AdsSection";
import { Hero } from "../components/Hero";
import { Modules } from "../components/Modules";
import { Premium } from "../components/Premium";
import { useCoreLocale } from "../i18n";

export function LandingPage() {
  const { locale, setLocale, copy } = useCoreLocale();

  return (
    <div className="ui-page flex min-h-screen flex-col">
      <ProHeader
        activeApp="core"
        locale={locale}
        onLocaleChange={() => setLocale(locale === "es" ? "en" : "es")}
      />
      <main className="flex-1">
        <Hero />
        <Modules />
        <Premium />
        <AdsSection />
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
