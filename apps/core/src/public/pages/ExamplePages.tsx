import { Link, useParams } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { APP_URLS } from "@prosolutions/ui";
// Same phrase library the ProCV editor suggests while writing (single source).
import { PHRASE_FAMILIES, type PhraseFamily } from "../../../../procv/frontend/src/modules/procv/phrases";
import { paramsFor } from "../../lib/payroll/params";
import { PublicLayout, formatDate } from "../PublicLayout";
import { headForPath, useDocumentHead } from "../seo";
import { NotFoundPage } from "./InfoPages";

export const EXAMPLES_PATH = "/ejemplos-hoja-de-vida";
export const MINIMUM_WAGE_PATH = "/salario-minimo-colombia";

/** Job families with their own example page ("general" is the editor's catch-all, not a job). */
export const EXAMPLE_FAMILIES = PHRASE_FAMILIES.filter((family) => family.id !== "general");
export const getExampleFamily = (slug: string): PhraseFamily | undefined => EXAMPLE_FAMILIES.find((family) => family.id === slug);
export const exampleTitle = (family: PhraseFamily) => `Ejemplo de hoja de vida de ${family.label.toLowerCase()}`;

const editorUrl = `${APP_URLS.procvEditor}?plantilla=ats`;
const primaryButton =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 font-semibold text-white shadow-sm transition-colors hover:bg-brand-900 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400";

function Cta() {
  return (
    <a href={editorUrl} className={primaryButton}>
      <FileText className="h-5 w-5" aria-hidden="true" />
      Crear mi hoja de vida gratis
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  );
}

export function ExamplesIndexPage() {
  useDocumentHead(headForPath(EXAMPLES_PATH));
  return (
    <PublicLayout breadcrumbs={[{ name: "Ejemplos de hoja de vida", path: EXAMPLES_PATH }]}>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">ProCV · Ejemplos por oficio</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">Ejemplos de hoja de vida por oficio y sector</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ui-muted">
          Perfiles profesionales, funciones y logros redactados para {EXAMPLE_FAMILIES.length} áreas de trabajo. Úsalos como punto de partida y adáptalos a tu experiencia real: en el editor de ProCV aparecen como sugerencias mientras escribes.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLE_FAMILIES.map((family) => (
            <li key={family.id}>
              <Link to={`${EXAMPLES_PATH}/${family.id}/`} className="flex h-full flex-col rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-sm hover:border-ui-accent">
                <span className="text-lg font-semibold text-ui-text">{family.label}</span>
                <span className="mt-2 flex-1 text-sm leading-6 text-ui-muted">{family.summaries[0]}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-800 dark:text-brand-300">Ver ejemplo <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10"><Cta /></div>
      </section>
    </PublicLayout>
  );
}

export function ExampleDetailPage() {
  const { slug = "" } = useParams();
  const family = getExampleFamily(slug);
  const path = `${EXAMPLES_PATH}/${slug}`;
  useDocumentHead(headForPath(path));
  if (!family) return <NotFoundPage />;
  const others = EXAMPLE_FAMILIES.filter((item) => item.id !== family.id).slice(0, 6);
  return (
    <PublicLayout breadcrumbs={[{ name: "Ejemplos de hoja de vida", path: EXAMPLES_PATH }, { name: family.label, path }]}>
      <article className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">Ejemplos de hoja de vida · {family.label}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">{exampleTitle(family)}: perfil, funciones y logros</h1>
        <p className="mt-4 text-lg leading-8 text-ui-muted">
          Frases listas para adaptar a tu hoja de vida de {family.label.toLowerCase()}. Cambia los datos entre corchetes por tus cifras reales y elige solo lo que de verdad hiciste.
        </p>
        <div className="mt-6"><Cta /></div>

        <section aria-labelledby="perfil" className="mt-10">
          <h2 id="perfil" className="text-2xl font-bold text-ui-text">Perfil profesional</h2>
          <div className="mt-4 space-y-3">
            {family.summaries.map((summary) => (
              <blockquote key={summary} className="rounded-xl border-l-4 border-brand-700 bg-ui-soft px-4 py-3 text-[15px] leading-7 text-ui-text">{summary}</blockquote>
            ))}
          </div>
        </section>

        <section aria-labelledby="funciones" className="mt-10">
          <h2 id="funciones" className="text-2xl font-bold text-ui-text">Funciones para describir tu experiencia</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
            {family.duties.map((duty) => <li key={duty}>{duty}</li>)}
          </ul>
        </section>

        <section aria-labelledby="logros" className="mt-10">
          <h2 id="logros" className="text-2xl font-bold text-ui-text">Logros con cifras</h2>
          <p className="mt-2 text-sm text-ui-muted">Los logros medibles son lo que más diferencia una hoja de vida. Reemplaza cada [X] por un número real (porcentaje, cantidad, tiempo o dinero).</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
            {family.achievements.map((achievement) => <li key={achievement}>{achievement}</li>)}
          </ul>
        </section>

        <section aria-labelledby="como" className="mt-10 rounded-2xl border border-ui-border bg-ui-surface p-6">
          <h2 id="como" className="text-xl font-bold text-ui-text">Cómo usar este ejemplo</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
            <li>Elige el perfil que más se parezca a ti y ajústalo con tus años de experiencia y tu especialidad.</li>
            <li>En cada empleo, escribe de 3 a 5 funciones; empieza por las que pide la vacante.</li>
            <li>Agrega al menos un logro con cifras por cargo.</li>
            <li>Compara tu hoja de vida con la oferta en <strong>«Comparar con vacante»</strong> del editor para encontrar palabras clave que te falten.</li>
          </ol>
        </section>

        <section aria-labelledby="otros" className="mt-10">
          <h2 id="otros" className="text-xl font-bold text-ui-text">Ejemplos de otros oficios</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <li key={item.id}><Link to={`${EXAMPLES_PATH}/${item.id}/`} className="block rounded-xl border border-ui-border bg-ui-surface px-4 py-3 text-sm font-semibold text-ui-text hover:border-ui-accent">{item.label}</Link></li>
            ))}
          </ul>
          <p className="mt-4 text-sm"><Link to={`${EXAMPLES_PATH}/`} className="font-medium text-brand-800 underline dark:text-brand-300">Ver todos los ejemplos</Link> · <Link to="/plantillas-hoja-de-vida/" className="font-medium text-brand-800 underline dark:text-brand-300">Ver plantillas</Link></p>
        </section>
      </article>
    </PublicLayout>
  );
}

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function MinimumWagePage() {
  useDocumentHead(headForPath(MINIMUM_WAGE_PATH));
  const params = paramsFor();
  const rows: Array<[string, number, string]> = [
    ["Salario mínimo mensual (SMMLV)", params.smmlv, "Base para salarios, aportes y multas"],
    ["Auxilio de transporte", params.transportAllowance, "Para quienes ganan hasta 2 salarios mínimos"],
    ["Total mensual con auxilio", params.smmlv + params.transportAllowance, "Lo que recibe un trabajador de salario mínimo antes de descuentos"],
    ["Salario mínimo diario", Math.round(params.smmlv / 30), "Salario mensual ÷ 30"],
    ["Dos salarios mínimos", params.smmlv * 2, "Límite para tener derecho al auxilio de transporte"],
  ];
  return (
    <PublicLayout breadcrumbs={[{ name: "Herramientas", path: "/tools" }, { name: `Salario mínimo ${params.year}`, path: MINIMUM_WAGE_PATH }]}>
      <article className="mx-auto max-w-4xl px-4 pb-12 pt-8 sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">Salarios en Colombia</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">Salario mínimo {params.year} en Colombia: valor y auxilio de transporte</h1>
        <p className="mt-4 text-lg leading-8 text-ui-muted">
          Valores vigentes para {params.year}, revisados el <time dateTime={params.reviewedAt}>{formatDate(params.reviewedAt)}</time>. Son los mismos que usan nuestras calculadoras de salario, prima, cesantías y liquidación.
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-ui-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-ui-border bg-ui-surface">
              {rows.map(([label, value, note]) => (
                <tr key={label}>
                  <th scope="row" className="px-4 py-3 font-medium text-ui-text">{label}<span className="block text-xs font-normal text-ui-subtle">{note}</span></th>
                  <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-ui-text">{money.format(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section aria-labelledby="proximo" className="mt-10">
          <h2 id="proximo" className="text-2xl font-bold text-ui-text">Salario mínimo {params.year + 1}</h2>
          <p className="mt-3 text-[15px] leading-7 text-ui-text">
            El salario mínimo de {params.year + 1} se negocia en diciembre en la Comisión Permanente de Concertación de Políticas Salariales y Laborales. Si no hay acuerdo, el Gobierno lo fija por decreto antes del 31 de diciembre. Actualizaremos esta página y todas las calculadoras el mismo día en que se publique el decreto.
          </p>
        </section>

        <section aria-labelledby="calculadoras" className="mt-10">
          <h2 id="calculadoras" className="text-xl font-bold text-ui-text">Calcula con estos valores</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["/tools/salario-neto/", "Salario neto y costo para el empleador"],
              ["/tools/prima/", "Prima de servicios"],
              ["/tools/cesantias/", "Cesantías e intereses"],
              ["/tools/liquidacion/", "Liquidación laboral"],
            ].map(([to, label]) => (
              <li key={to}><Link to={to} className="block rounded-xl border border-ui-border bg-ui-surface px-4 py-3 text-sm font-semibold text-ui-text hover:border-ui-accent">{label}</Link></li>
            ))}
          </ul>
        </section>
        <p className="mt-8 text-xs text-ui-subtle">Fuentes: {params.sources.join("; ")}.</p>
      </article>
    </PublicLayout>
  );
}
