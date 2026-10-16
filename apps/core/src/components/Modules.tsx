import { ArrowRight, Briefcase, Check, FileText, Layers } from "lucide-react";
import { APP_URLS } from "@prosolutions/ui";
import { cn } from "@prosolutions/ui";

interface ModuleCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  icon: typeof FileText;
  iconWrapClass: string;
  haloClass: string;
  accentTextClass: string;
  checkClass: string;
  ctaClass: string;
  status?: string;
}

const MODULES: ModuleCard[] = [
  {
    id: "procv",
    name: "ProCV",
    tagline: "Hojas de vida profesionales",
    description:
      "Crea, edita y descarga tu hoja vida con plantillas disenadas para superar filtros ATS.",
    features: ["Plantillas optimizadas para ATS", "Exportacion a PDF, JSON y XML", "Edicion en tiempo real"],
    ctaLabel: "Ir a ProCV",
    ctaHref: APP_URLS.procvLogin,
    icon: FileText,
    iconWrapClass: "bg-brand-100 text-brand-600 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800",
    haloClass: "bg-brand-400/20 group-hover:bg-brand-400/30",
    accentTextClass: "text-brand-600 dark:text-brand-300",
    checkClass: "text-brand-500",
    ctaClass: "bg-brand-600 hover:bg-brand-700 shadow-brand-600/30 dark:bg-brand-500 dark:hover:bg-brand-400",
  },
  {
    id: "projobs",
    name: "ProJobs",
    tagline: "Empleos tech remotos",
    description:
      "Vacantes tech remotas curadas, con filtros por stack y busqueda en vivo para encontrar tu proximimo rol.",
    features: ["Vacantes tech remotas", "Filtros por stack y busqueda", "Listado actualizado a diario"],
    ctaLabel: "Explorar Vacantes",
    ctaHref: APP_URLS.projobs,
    icon: Briefcase,
    iconWrapClass: "bg-emerald-100 text-emerald-600 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800",
    haloClass: "bg-emerald-400/20 group-hover:bg-emerald-400/30",
    accentTextClass: "text-emerald-600 dark:text-emerald-300",
    checkClass: "text-emerald-500",
    ctaClass: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 dark:bg-emerald-500 dark:hover:bg-emerald-400",
    status: "Beta",
  },
];

function ModuleCardView({ module }: { module: ModuleCard }) {
  const Icon = module.icon;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div
        className={cn("pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl transition", module.haloClass)}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1", module.iconWrapClass)}>
          <Icon className="h-6 w-6" />
        </div>
        {module.status ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            {module.status}
          </span>
        ) : null}
      </div>

      <div className="relative mt-5">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{module.name}</h3>
        <p className={cn("text-sm font-semibold", module.accentTextClass)}>{module.tagline}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{module.description}</p>

        <ul className="mt-5 space-y-2.5">
          {module.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", module.checkClass)} strokeWidth={3} />
              {feature}
            </li>
          ))}
        </ul>

        <a
          href={module.ctaHref}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.99]",
            module.ctaClass
          )}
        >
          {module.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

function ComingSoonCard() {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-7 shadow-sm dark:border-slate-600 dark:bg-slate-900/40">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-slate-400/10 blur-3xl" aria-hidden="true" />

      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
        <Layers className="h-6 w-6" />
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">Proximamente</h3>
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Nuevos modulos SaaS</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Estamos construyendo nuevos modulos para el ecosistema ProSolutions: analitica de carrera,
          portafolios y mas herramientas para profesionales tech.
        </p>
      </div>

      <div className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
        Muy pronto
      </div>
    </article>
  );
}

export function Modules() {
  return (
    <section id="modulos" className="py-20 md:py-24">
      <div className="ui-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">Modulos</span>
          <h2 className="mt-3">Un ecosistema, multiples herramientas</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Cada modulo de ProSolutions resuelve una etapa de tu carrera profesional. Usalos por separado
            o en conjunto: tu informacion siempre bajo tu control.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <ModuleCardView key={module.id} module={module} />
          ))}
          <ComingSoonCard />
        </div>
      </div>
    </section>
  );
}
