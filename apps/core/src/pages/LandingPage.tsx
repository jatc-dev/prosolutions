import { ProFooter, ProHeader } from "@prosolutions/ui";
import { AdsSection } from "../components/AdsSection";
import { Hero } from "../components/Hero";
import { Modules } from "../components/Modules";
import { Premium } from "../components/Premium";

export function LandingPage() {
  return (
    <div className="ui-page flex min-h-screen flex-col">
      <ProHeader activeApp="core" />
      <main className="flex-1">
        <Hero />
        <Modules />
        <Premium />
        <AdsSection />
      </main>
      <ProFooter />
    </div>
  );
}
