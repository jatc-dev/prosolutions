import { AdSlot } from "@prosolutions/ui";

/** Contenedores de anuncios (Google AdSense) integrados en el diseno del landing. */
export function AdsSection() {
  return (
    <section id="anuncios" aria-label="Espacios publicitarios" className="pb-4">
      <div className="ui-container space-y-6">
        <AdSlot placement="core-after-modules" format="leaderboard" className="min-h-[110px]" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <AdSlot placement="core-in-feed" format="in-feed" className="min-h-[140px]" />
          <AdSlot placement="core-sidebar" format="rectangle" className="min-h-[140px]" />
        </div>
      </div>
    </section>
  );
}
