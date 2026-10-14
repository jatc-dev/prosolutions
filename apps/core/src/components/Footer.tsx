import { ArrowUpRight } from "lucide-react";
import { LINKS } from "../config/links";
import { Logo } from "./Logo";

const NAV_GROUPS = [
  {
    title: "Ecosistema",
    links: [
      { label: "ProCV", href: LINKS.procv, external: true },
      { label: "ProJobs", href: LINKS.projobs, external: true },
      { label: "Planes Premium", href: "#planes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidad", href: LINKS.projobsPrivacy, external: true },
      { label: "Terminos", href: "#terminos" },
    ],
  },
];

export function Footer() {
  return (
    <footer id="terminos" className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="ui-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              El ecosistema de herramientas profesionales tech. Crea tu hoja de vida optimizada para ATS
              y encuentra tu proximo empleo remoto.
            </p>
          </div>

          {NAV_GROUPS.map((group) => (
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
            &copy; 2026 ProSolutions. Un producto desarrollado por{" "}
            <a
              href={LINKS.jatcDev}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-700 transition-colors hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300"
            >
              JATC.DEV
            </a>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Hecho para profesionales tech</p>
        </div>
      </div>
    </footer>
  );
}
