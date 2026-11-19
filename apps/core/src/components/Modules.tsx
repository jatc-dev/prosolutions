import { ArrowRight, Briefcase, Check, FileText, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { APP_URLS } from "@prosolutions/ui";
import { cn } from "@prosolutions/ui";
import { useCoreLocale, type CoreCopy } from "../i18n";

interface ModuleCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  featureDescriptions?: Record<string, string>;
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

type ModuleDefinition = Omit<ModuleCard, "tagline" | "description" | "features" | "featureDescriptions" | "ctaLabel">;

// Keep only stable presentation metadata here. User-facing copy lives in the
// locale dictionaries; ProCV feature details may be overridden by its public API.
const MODULES: ModuleDefinition[] = [
  {
    id: "procv",
    name: "ProCV",
    ctaHref: APP_URLS.procvLogin,
    icon: FileText,
    iconWrapClass: "bg-brand-100 text-brand-800 ring-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-950",
    haloClass: "bg-brand-400/20 group-hover:bg-brand-400/30",
    accentTextClass: "text-brand-800 dark:text-brand-300",
    checkClass: "text-brand-700",
    ctaClass: "bg-brand-800 hover:bg-brand-900 dark:bg-brand-700 dark:text-white dark:hover:bg-brand-400",
    status: "Beta",
  },
  {
    id: "projobs",
    name: "ProJobs",
    ctaHref: APP_URLS.projobs,
    icon: Briefcase,
    iconWrapClass: "bg-brand-100 text-brand-600 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800",
    haloClass: "bg-brand-400/20 group-hover:bg-brand-400/30",
    accentTextClass: "text-brand-600 dark:text-brand-300",
    checkClass: "text-brand-500",
    ctaClass: "bg-brand-600 hover:bg-brand-700 shadow-brand-600/30 dark:bg-brand-500 dark:hover:bg-brand-400",
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
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
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
              <span className="min-w-0">
                <span>{feature}</span>
                {module.featureDescriptions?.[feature] ? (
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {module.featureDescriptions[feature]}
                  </span>
                ) : null}
              </span>
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

function ComingSoonCard({ copy }: { copy: CoreCopy["modules"] }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-7 shadow-sm dark:border-slate-600 dark:bg-slate-900/40">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-slate-400/10 blur-3xl" aria-hidden="true" />

      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
        <Layers className="h-6 w-6" />
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400">{copy.comingSoon}</h3>
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">{copy.newModules}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {copy.futureDescription}
        </p>
      </div>

      <div className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500">
        {copy.soon}
      </div>
    </article>
  );
}

interface PublicLandingFeature {
  id: string;
  title: string;
  description: string;
}

const PROCV_API_BASE_URL =
  import.meta.env.VITE_PROCV_API_BASE_URL || "https://procvbkn.onrender.com/api";

function isPublicLandingFeature(value: unknown): value is PublicLandingFeature {
  if (!value || typeof value !== "object") return false;
  const feature = value as Record<string, unknown>;
  return (
    typeof feature.id === "string" &&
    typeof feature.title === "string" &&
    feature.title.trim().length > 0 &&
    typeof feature.description === "string" &&
    feature.description.trim().length > 0
  );
}

export function Modules() {
  const { copy, locale } = useCoreLocale();
  const [procvFeatures, setProcvFeatures] = useState<PublicLandingFeature[]>([]);

  // Temporary compatibility bridge: keep the existing ProCV admin editor as the
  // source of truth while showing its public, sanitized content in the Core catalog.
  // Static localized copy remains visible if the ProCV API is unavailable.
  useEffect(() => {
    let cancelled = false;
    const language = locale === "es" ? "es" : "en";

    fetch(`${PROCV_API_BASE_URL}/public/landing-features?lang=${language}`, {
      headers: { Accept: "application/json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Landing features unavailable");
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (cancelled) return;
        setProcvFeatures(Array.isArray(data) ? data.filter(isPublicLandingFeature) : []);
      })
      .catch(() => {
        if (!cancelled) setProcvFeatures([]);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const modules = MODULES.map((module) => {
    const localized = module.id === "procv" ? copy.modules.procv : copy.modules.projobs;
    const configuredFeatures = module.id === "procv" ? procvFeatures : [];
    const features = configuredFeatures.length
      ? configuredFeatures.map((feature) => feature.title)
      : [...localized.features];
    const featureDescriptions = configuredFeatures.length
      ? Object.fromEntries(configuredFeatures.map((feature) => [feature.title, feature.description]))
      : undefined;

    return {
      ...module,
      ...localized,
      ctaLabel: localized.cta,
      features,
      featureDescriptions,
    };
  });

  return (
    <section id="modulos" className="py-20 md:py-24">
      <div className="ui-container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{copy.modules.eyebrow}</span>
          <h2 className="mt-3">{copy.modules.title}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {copy.modules.description}
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCardView key={module.id} module={module} />
          ))}
          <ComingSoonCard copy={copy.modules} />
        </div>
      </div>
    </section>
  );
}
