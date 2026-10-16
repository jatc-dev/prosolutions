import { ArrowRight, Briefcase, FileText, Sparkles } from "lucide-react";
import { APP_URLS } from "@prosolutions/ui";

const STATS = [
  { value: "2", label: "Modulos activos" },
  { value: "ATS", label: "Plantillas optimizadas" },
  { value: "100%", label: "Enfocado en tech" },
];

export function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="ui-halo left-[-6rem] top-[-4rem]" aria-hidden="true" />
      <div className="ui-halo right-[-8rem] top-24 bg-cyan-400/20 dark:bg-cyan-500/10" aria-hidden="true" />

      <div className="ui-container relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            El ecosistema de herramientas tech
          </span>

          <h1 className="mt-6">
            Tu carrera profesional,{" "}
            <span className="ui-gradient-text">potenciada por un solo ecosistema</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
            ProSolutions reune las herramientas que todo profesional tech necesita: crea hojas de vida
            optimizadas para ATS con <strong className="font-semibold text-slate-800 dark:text-slate-100">ProCV</strong> y
            encuentra empleos remotos con <strong className="font-semibold text-slate-800 dark:text-slate-100">ProJobs</strong>.
            Una cuenta, un ecosistema, cero friccion.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={APP_URLS.procvLogin}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-700 hover:shadow-brand-600/40 active:scale-[0.99] sm:w-auto dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              <FileText className="h-5 w-5" />
              Probar ProCV
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={APP_URLS.projobs}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.99] sm:w-auto dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Briefcase className="h-5 w-5 text-emerald-500" />
              Explorar Empleos (ProJobs)
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          <dl className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-5 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/70"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
