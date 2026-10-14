import { ArrowRight, Check, Crown, Sparkles } from "lucide-react";
import { LINKS } from "../config/links";
import { cn } from "../lib/utils";

const PLANS = [
  {
    id: "free",
    name: "Gratis",
    price: "$0",
    period: "/siempre",
    description: "Para crear tu primer CV profesional y explorar el ecosistema.",
    features: ["Editor completo de ProCV", "Plantillas base optimizadas para ATS", "Exportacion en PDF estandar"],
    ctaLabel: "Empezar gratis",
    ctaHref: LINKS.procv,
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    period: "/mes",
    description: "Para profesionales tech que se postulan activamente.",
    features: [
      "Todas las plantillas premium",
      "Analisis y puntaje ATS avanzado",
      "Multiples versiones de tu CV",
      "Exportacion PDF, JSON y XML",
    ],
    ctaLabel: "Hazte Pro",
    ctaHref: LINKS.procv,
    highlight: true,
  },
  {
    id: "teams",
    name: "Equipos",
    price: "$14.99",
    period: "/mes",
    description: "Para reclutadores y equipos que evaluan talento tech.",
    features: ["Todo lo incluido en Pro", "Gestion de multiples miembros", "Plantillas corporativas", "Soporte prioritario"],
    ctaLabel: "Contactar",
    ctaHref: LINKS.jatcDev,
    highlight: false,
  },
];

export function Premium() {
  return (
    <section id="planes" className="py-20 md:py-24">
      <div className="ui-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">Planes Premium</span>
          <h2 className="mt-3">Potencia tu carrera con ProSolutions Pro</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Empieza gratis y escala cuando lo necesites. Todos los planes incluyen acceso al ecosistema
            completo de herramientas.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md",
                plan.highlight
                  ? "border-brand-300 bg-white ring-1 ring-brand-500/30 dark:border-brand-700 dark:bg-slate-900"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              )}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-brand-600 to-cyan-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                  <Crown className="h-3 w-3" />
                  Mas popular
                </span>
              ) : null}

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{plan.price}</span>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{plan.period}</span>
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.highlight ? "text-brand-500" : "text-slate-400")} strokeWidth={3} />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.99]",
                  plan.highlight
                    ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                {plan.highlight ? <Sparkles className="h-4 w-4" /> : null}
                {plan.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
