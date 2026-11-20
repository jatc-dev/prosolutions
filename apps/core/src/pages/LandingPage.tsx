import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { APP_URLS, ProFooter, ProHeader, RESOURCE_URLS } from "@prosolutions/ui";
import { useCoreLocale } from "../i18n";
import { useHeaderSession } from "../useHeaderSession";
import { useDocumentHead } from "../public/seo";
import { TOOLS } from "../content/tools";
import { ARTICLES, CATEGORIES } from "../content/academy";

const trim = (url: string) => url.replace(/\/+$/, "");
const FEATURED_ARTICLES = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3);

const primaryButton =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ui-border-strong bg-ui-surface px-6 text-base font-semibold text-ui-text transition-colors hover:bg-ui-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus";

function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-ui-text sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 text-base leading-7 text-ui-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Decorative CV preview for the hero (not announced to screen readers). */
function CvPreview() {
  const { copy } = useCoreLocale();
  const preview = copy.landing.preview;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm select-none">
      <div className="absolute -inset-6 rounded-[2rem] bg-brand-400/20 blur-2xl dark:bg-brand-700/20" />
      <div className="relative rotate-1 rounded-2xl border border-ui-border bg-white p-6 text-slate-900 shadow-xl dark:border-slate-700">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800">LG</div>
          <div>
            <p className="text-lg font-bold leading-tight">{preview.name}</p>
            <p className="text-sm text-slate-500">{preview.role}</p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          {preview.sections.map((section, index) => (
            <div key={section}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800">{section}</p>
              <div className="mt-2 space-y-1.5">
                <div className="h-2 rounded-full bg-slate-200" style={{ width: `${92 - index * 6}%` }} />
                <div className="h-2 rounded-full bg-slate-100" style={{ width: `${78 - index * 9}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-sm font-semibold text-brand-800 shadow-lg dark:border-brand-800">
        <CheckCircle2 className="h-4 w-4" />
        {preview.score}
      </div>
    </div>
  );
}

function JobSearchForm() {
  const { copy } = useCoreLocale();
  const t = copy.landing;
  return (
    <form action={APP_URLS.projobs} method="get" role="search" aria-label={t.searchTitle} className="rounded-2xl border border-ui-border bg-ui-surface p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-h-12 flex-1 items-center gap-2 rounded-xl bg-ui-soft px-3">
          <Search className="h-4 w-4 shrink-0 text-ui-subtle" aria-hidden="true" />
          <span className="sr-only">{t.searchQuery}</span>
          <input name="q" type="search" maxLength={120} placeholder={t.searchQuery} className="w-full bg-transparent text-sm text-ui-text placeholder:text-ui-subtle focus:outline-none" />
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-xl bg-ui-soft px-3 sm:w-36">
          <MapPin className="h-4 w-4 shrink-0 text-ui-subtle" aria-hidden="true" />
          <span className="sr-only">{t.searchLocation}</span>
          <input name="location" type="text" maxLength={80} placeholder={t.searchLocation} className="w-full bg-transparent text-sm text-ui-text placeholder:text-ui-subtle focus:outline-none" />
        </label>
        <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
          <Briefcase className="h-4 w-4" aria-hidden="true" />
          {t.searchSubmit}
        </button>
      </div>
    </form>
  );
}

function WelcomePanel({ name }: { name: string }) {
  const { copy } = useCoreLocale();
  const t = copy.landing;
  const links = [
    { label: t.quickLinks.cvs, href: APP_URLS.procvLogin, icon: FileText },
    { label: t.quickLinks.applications, href: `${trim(APP_URLS.projobs)}/postulaciones`, icon: ClipboardList },
    { label: t.quickLinks.jobs, href: APP_URLS.projobs, icon: Briefcase },
    { label: t.quickLinks.dashboard, href: "/dashboard", icon: LayoutDashboard },
  ];
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 dark:border-brand-900 dark:bg-brand-950/40">
      <p className="text-lg font-semibold text-ui-text">
        {t.welcome}, {name.split(" ")[0]}
      </p>
      <p className="text-sm text-ui-muted">{t.welcomeDescription}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {links.map(({ label, href, icon: Icon }) => (
          <a key={label} href={href} className="flex min-h-11 items-center gap-2 rounded-xl bg-ui-surface px-3 text-sm font-medium text-ui-text shadow-sm transition-colors hover:bg-ui-soft">
            <Icon className="h-4 w-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function LandingPage() {
  const { locale, setLocale, copy } = useCoreLocale();
  const { user, authLoading, signOut } = useHeaderSession();
  const t = copy.landing;
  // Restores the landing head after client-side navigation from another page.
  useDocumentHead({ title: copy.seo.title, description: copy.seo.description, path: "/" });

  const products = [
    { ...t.products.procv, href: RESOURCE_URLS.createCv, icon: FileText },
    { ...t.products.projobs, href: APP_URLS.projobs, icon: Briefcase },
    { ...t.products.tools, href: RESOURCE_URLS.tools, icon: Calculator },
    { ...t.products.academy, href: RESOURCE_URLS.academy, icon: BookOpen },
  ];

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
      <main id="contenido" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-ui-border">
          <div className="ui-halo left-[-6rem] top-[-4rem]" aria-hidden="true" />
          <div className="ui-container relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-800 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t.badge}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ui-text sm:text-5xl">
                {t.titleLead} <span className="ui-gradient-text">{t.titleAccent}</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-ui-muted">{t.description}</p>

              {user ? (
                <div className="mt-8 max-w-xl">
                  <WelcomePanel name={user.name || user.email.split("@")[0] || ""} />
                </div>
              ) : (
                <div className="mt-8">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a href={APP_URLS.procvEditor} className={primaryButton}>
                      <FileText className="h-5 w-5" aria-hidden="true" />
                      {t.primaryCta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </a>
                    <a href="#como-funciona" className={secondaryButton}>
                      {t.secondaryCta}
                    </a>
                  </div>
                  <p className="mt-3 text-sm text-ui-subtle">{t.primaryNote}</p>
                </div>
              )}

              <div className="mt-8 max-w-xl">
                <p className="mb-2 text-sm font-semibold text-ui-text">{t.searchTitle}</p>
                <JobSearchForm />
              </div>
            </div>
            <div className="hidden lg:block">
              <CvPreview />
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="ui-container py-16">
          <SectionHeading title={t.productsTitle} description={t.productsDescription} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map(({ name, tagline, description, cta, href, icon: Icon }) => (
              <a key={name} href={href} className="group flex flex-col rounded-2xl border border-ui-border bg-ui-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-800">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="mt-4 text-lg font-bold text-ui-text">{name}</span>
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{tagline}</span>
                <span className="mt-3 flex-1 text-sm leading-6 text-ui-muted">{description}</span>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ui-text">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-ui-border bg-ui-soft/60">
          <div className="ui-container py-16">
            <SectionHeading title={t.stepsTitle} />
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {t.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-ui-border bg-ui-surface p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white dark:bg-brand-500 dark:text-slate-950">{index + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold text-ui-text">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ui-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tools */}
        <section className="ui-container py-16">
          <SectionHeading
            title={t.toolsTitle}
            description={t.toolsDescription}
            action={<Link to="/tools/" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline dark:text-brand-300">{t.toolsCta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => (
              <Link key={tool.slug} to={`/tools/${tool.slug}/`} className="group rounded-2xl border border-ui-border bg-ui-surface p-5 transition hover:border-brand-300 dark:hover:border-brand-800">
                <Calculator className="h-5 w-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-ui-text group-hover:underline">{tool.shortTitle}</h3>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-ui-muted">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Academy */}
        <section className="border-t border-ui-border">
          <div className="ui-container py-16">
            <SectionHeading
              title={t.academyTitle}
              description={t.academyDescription}
              action={<Link to="/academy/" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline dark:text-brand-300">{t.academyCta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
            />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {FEATURED_ARTICLES.map((article) => (
                <article key={article.slug} className="flex flex-col rounded-2xl border border-ui-border bg-ui-surface p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{CATEGORIES[article.category].label}</p>
                  <h3 className="mt-2 text-lg font-semibold leading-snug text-ui-text">
                    <Link to={`/academy/${article.slug}/`} className="hover:underline">{article.title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-ui-muted">{article.description}</p>
                  <p className="mt-4 text-xs text-ui-subtle">{article.readingMinutes} {t.readMinutes}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Employers */}
        <section className="ui-container pb-16">
          <div className="flex flex-col gap-6 rounded-3xl bg-slate-900 p-8 text-white sm:p-10 md:flex-row md:items-center md:justify-between dark:bg-brand-950">
            <div className="max-w-2xl">
              <Building2 className="h-7 w-7 text-brand-300" aria-hidden="true" />
              <h2 className="mt-3 text-2xl font-bold text-white">{t.employersTitle}</h2>
              <p className="mt-2 text-slate-300">{t.employersDescription}</p>
            </div>
            <a href={`${trim(APP_URLS.projobs)}/empresa`} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-slate-900 transition-colors hover:bg-brand-50">
              {t.employersCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Final call to action (guests only) */}
        {user ? null : (
          <section className="border-t border-ui-border bg-ui-soft/60">
            <div className="ui-container flex flex-col items-center py-16 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-ui-text sm:text-3xl">{t.finalTitle}</h2>
              <p className="mt-2 max-w-xl text-ui-muted">{t.finalDescription}</p>
              <a href={APP_URLS.procvEditor} className={`${primaryButton} mt-6`}>
                <FileText className="h-5 w-5" aria-hidden="true" />
                {t.primaryCta}
              </a>
            </div>
          </section>
        )}
      </main>
      <ProFooter locale={locale} />
    </div>
  );
}
