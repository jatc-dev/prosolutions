import { AdsSection } from "../components/AdsSection";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { Modules } from "../components/Modules";
import { Premium } from "../components/Premium";

export function LandingPage() {
  return (
    <div className="ui-page flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Modules />
        <AdsSection />
        <Premium />
      </main>
      <Footer />
    </div>
  );
}
