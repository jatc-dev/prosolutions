import React from "react";
import { ArrowUpRight } from "lucide-react";
import { APP_URLS, JATC_URL, PRIVACY_URL, TERMS_URL, isExternalUrl } from "./links.js";
import { ProSolutionsLogo } from "./ProSolutionsLogo.js";

function navGroups(locale: "es" | "en"): Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> {
  const labels = locale === "en"
    ? { ecosystem: "Ecosystem", home: "Home", plans: "Premium plans", legal: "Legal", privacy: "Privacy", terms: "Terms" }
    : { ecosystem: "Ecosistema", home: "Inicio", plans: "Planes Premium", legal: "Legal", privacy: "Privacidad", terms: "Términos" };
  return [
    {
      title: labels.ecosystem,
      links: [
        { label: labels.home, href: APP_URLS.core, external: isExternalUrl(APP_URLS.core) },
        { label: "ProCV", href: APP_URLS.procvLogin, external: true },
        { label: "ProJobs", href: APP_URLS.projobs, external: true },
        { label: labels.plans, href: `${APP_URLS.core.replace(/\/$/, "")}/#planes` },
      ],
    },
    {
      title: labels.legal,
      links: [
        { label: labels.privacy, href: PRIVACY_URL, external: true },
        { label: labels.terms, href: TERMS_URL },
      ],
    },
  ];
}

/** Footer unificado del ecosistema ProSolutions con el credito de JATC.DEV. */
export function ProFooter({ locale = "es" }: { locale?: "es" | "en" }) {
  const groups = navGroups(locale);
  return (
    <footer id="terminos" className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <ProSolutionsLogo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {locale === "en"
                ? "The ecosystem of professional tech tools. Build an ATS-optimized resume with ProCV and find your next remote job with ProJobs."
                : "El ecosistema de herramientas profesionales tech. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu próximo empleo remoto con ProJobs."}
            </p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
                    >
                      {link.label}
                      {link.external ? <ArrowUpRight className="h-3.5 w-3.5 opacity-60" /> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-center dark:border-slate-700 sm:flex-row sm:text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} ProSolutions. {locale === "en" ? "A product developed by" : "Un producto desarrollado por"}{" "}
            <a
              href={JATC_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-700 transition-colors hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300"
            >
              JATC.DEV
            </a>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{locale === "en" ? "Made for tech professionals" : "Hecho para profesionales tech"}</p>
        </div>
      </div>
    </footer>
  );
}
