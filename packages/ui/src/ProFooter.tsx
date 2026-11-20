import React from "react";
import { ArrowUpRight } from "lucide-react";
import { APP_URLS, JATC_URL, LEGAL_URLS, RESOURCE_URLS } from "./links.js";
import { openConsentPreferences } from "./consent.js";
import { ProSolutionsLogo } from "./ProSolutionsLogo.js";

function navGroups(locale: "es" | "en"): Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }> {
  const en = locale === "en";
  // Every destination is a first-party ProSolutions page: same tab, no external icon.
  const link = (label: string, href: string) => ({ label, href, external: false });
  return [
    {
      title: en ? "Products" : "Productos",
      links: [
        link(en ? "Jobs" : "Empleos", APP_URLS.projobs),
        link(en ? "Create CV" : "Crear CV", RESOURCE_URLS.createCv),
        link(en ? "For employers" : "Para empresas", `${APP_URLS.projobs.replace(/\/+$/, "")}/empresa`),
      ],
    },
    {
      title: en ? "Resources" : "Recursos",
      links: [
        link(en ? "Academy" : "Academia", RESOURCE_URLS.academy),
        link(en ? "Free tools" : "Herramientas gratuitas", RESOURCE_URLS.tools),
        link(en ? "About us" : "Nosotros", LEGAL_URLS.about),
        link(en ? "Contact and support" : "Contacto y soporte", LEGAL_URLS.contact),
      ],
    },
    {
      title: "Legal",
      links: [
        link(en ? "Privacy and data protection" : "Privacidad y datos personales", LEGAL_URLS.privacy),
        link(en ? "Terms of use" : "Términos y condiciones", LEGAL_URLS.terms),
        link(en ? "Cookie policy" : "Política de cookies", LEGAL_URLS.cookies),
        link(en ? "AI transparency" : "Uso de inteligencia artificial", LEGAL_URLS.ai),
      ],
    },
  ];
}

/** Footer unificado del ecosistema ProSolutions con el credito de JATC.DEV. */
export function ProFooter({ locale = "es" }: { locale?: "es" | "en" }) {
  const groups = navGroups(locale);
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <ProSolutionsLogo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {locale === "en"
                ? "The ecosystem of tools for your professional career. Build an ATS-optimized resume with ProCV and find your next job with ProJobs."
                : "El ecosistema de herramientas para tu carrera profesional. Crea tu hoja de vida optimizada para ATS con ProCV y encuentra tu próximo empleo con ProJobs."}
            </p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors hover:text-brand-800 dark:text-slate-300 dark:hover:text-brand-300"
                    >
                      {link.label}
                      {link.external ? <ArrowUpRight className="h-3.5 w-3.5 opacity-60" /> : null}
                    </a>
                  </li>
                ))}
              </ul>
              {group.title === "Legal" && (
                <button
                  type="button"
                  onClick={openConsentPreferences}
                  className="mt-2.5 text-left text-sm text-slate-600 underline-offset-2 transition-colors hover:text-brand-800 hover:underline dark:text-slate-300 dark:hover:text-brand-300"
                >
                  {locale === "en" ? "Cookie settings" : "Configurar cookies"}
                </button>
              )}
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
              className="font-semibold text-slate-700 transition-colors hover:text-brand-800 dark:text-slate-200 dark:hover:text-brand-300"
            >
              JATC.DEV
            </a>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{locale === "en" ? "Made for professionals in every field" : "Hecho para profesionales de todas las áreas"}</p>
        </div>
      </div>
    </footer>
  );
}
