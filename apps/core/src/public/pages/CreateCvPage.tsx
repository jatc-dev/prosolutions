import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Download, FileText, FileUp, LayoutTemplate, Save, ShieldCheck, Sparkles } from "lucide-react";
import { APP_URLS } from "@prosolutions/ui";
import { PublicLayout } from "../PublicLayout";
import { useDocumentHead, headForPath } from "../seo";
import { useHeaderSession } from "../../useHeaderSession";

export const CREATE_CV_PATH = "/crear-hoja-de-vida";

const trim = (url: string) => url.replace(/\/+$/, "");

const STEPS = [
  {
    title: "Elige una plantilla",
    text: "Hay doce diseños. Si vas a postularte por portales de empleo o a empresas grandes, empieza por una de las marcadas como compatibles con ATS: usan texto real, orden lógico y títulos estándar.",
  },
  {
    title: "Importa tu CV o empieza desde cero",
    text: "Si ya tienes una hoja de vida en PDF, Word (.docx) o texto, súbela y el editor separa tu experiencia, educación y habilidades para que solo tengas que revisarlas.",
  },
  {
    title: "Completa y ajusta cada sección",
    text: "Escribe tu perfil profesional, tus logros con cifras y las habilidades que piden las vacantes que te interesan. La vista previa se actualiza mientras escribes.",
  },
  {
    title: "Descárgala en PDF",
    text: "Cuando esté lista, descárgala en PDF para enviarla por correo o subirla a cualquier portal. Puedes volver a editarla cuando quieras.",
  },
];

const FEATURES = [
  { icon: LayoutTemplate, title: "Plantillas compatibles con ATS", text: "Diseños que los sistemas de selección pueden leer: texto real, orden lógico y secciones con nombres que reconocen." },
  { icon: FileUp, title: "Importación de tu CV actual", text: "Sube un PDF, un .docx o un .txt y ahorra el trabajo de copiar y pegar cada cargo." },
  { icon: Download, title: "Descarga en PDF", text: "Un archivo listo para enviar, con el formato que ves en la vista previa." },
  { icon: Save, title: "Guardado automático", text: "Sin cuenta, tu avance se guarda en este navegador. Con cuenta, en tu perfil, para abrirlo desde cualquier equipo." },
  { icon: Sparkles, title: "Asistente de redacción opcional", text: "Sugerencias para tu perfil y tus logros. Tú decides qué usar; nada se envía a una empresa sin tu acción." },
  { icon: ShieldCheck, title: "Tus datos bajo tu control", text: "No vendemos tu información. Puedes descargarla o eliminar tu cuenta cuando quieras." },
];

const COMPARISON = [
  { feature: "Crear y editar tu hoja de vida", guest: true, account: true },
  { feature: "Importar un CV en PDF, Word o texto", guest: true, account: true },
  { feature: "Descargar en PDF", guest: true, account: true },
  { feature: "Guardar en este navegador", guest: true, account: true },
  { feature: "Guardar varias versiones en tu perfil", guest: false, account: true },
  { feature: "Abrirla desde cualquier dispositivo", guest: false, account: true },
  { feature: "Postularte en un clic en ProJobs", guest: false, account: true },
];

const FAQ = [
  {
    q: "¿Es realmente gratis?",
    a: "Sí. Crear, editar y descargar tu hoja de vida no tiene costo, con o sin cuenta. ProSolutions se financia con publicidad en algunas páginas de contenido, nunca dentro del editor.",
  },
  {
    q: "¿Necesito registrarme?",
    a: "No para empezar. Puedes crearla y descargarla sin cuenta; tu avance queda guardado en el navegador que estés usando. Si borras los datos del navegador o cambias de equipo, lo pierdes, por eso conviene crear una cuenta gratuita cuando quieras conservarla.",
  },
  {
    q: "¿Qué es una hoja de vida compatible con ATS?",
    a: "Un ATS es el software que usan muchas empresas para recibir y filtrar candidatos. Lee el texto de tu CV y busca palabras clave del cargo. Si tu hoja de vida es una imagen, usa tablas complejas o columnas difíciles de leer, puede quedar descartada antes de que una persona la vea.",
  },
  {
    q: "¿Debo poner foto?",
    a: "En Colombia y buena parte de Latinoamérica es común, pero no obligatorio. Para empresas multinacionales o vacantes en el exterior suele ser mejor no incluirla. Algunas plantillas permiten foto y otras no.",
  },
  {
    q: "¿Puedo descargarla en Word?",
    a: "Por ahora la descarga es en PDF, el formato que mejor conserva el diseño y que aceptan casi todos los portales. Puedes importar un archivo de Word para empezar a partir de él.",
  },
];

function Check({ value }: { value: boolean }) {
  return value ? (
    <CheckCircle2 className="mx-auto h-5 w-5 text-brand-700 dark:text-brand-300" aria-label="Incluido" />
  ) : (
    <span className="text-ui-subtle" aria-label="No incluido">—</span>
  );
}

export function CreateCvPage() {
  useDocumentHead(headForPath(CREATE_CV_PATH));
  const { user } = useHeaderSession();

  return (
    <PublicLayout breadcrumbs={[{ name: "Crear hoja de vida", path: CREATE_CV_PATH }]}>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-ui-accent">ProCV · Gratis y sin registro</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">
            Crea tu hoja de vida gratis, sin registro y lista para los filtros ATS
          </h1>
          <p className="mt-4 text-lg leading-8 text-ui-muted">
            Elige una plantilla, importa tu CV actual o empieza desde cero, y descárgala en PDF en pocos minutos. No necesitas crear una cuenta para empezar.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={APP_URLS.procvEditor}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 font-semibold text-white shadow-sm transition-colors hover:bg-brand-900 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400"
            >
              <FileText className="h-5 w-5" aria-hidden="true" />
              Empezar mi hoja de vida
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <a
              href={`${trim(APP_URLS.procv)}/templates`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ui-border-strong bg-ui-surface px-6 font-semibold text-ui-text transition-colors hover:bg-ui-soft"
            >
              <LayoutTemplate className="h-5 w-5" aria-hidden="true" />
              Ver plantillas
            </a>
          </div>
          {user ? (
            <p className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ui-text dark:border-brand-900 dark:bg-brand-950/40">
              Ya iniciaste sesión.{" "}
              <a href={APP_URLS.procvLogin} className="font-semibold text-brand-800 underline dark:text-brand-300">
                Ir a mis hojas de vida
              </a>
            </p>
          ) : (
            <p className="mt-3 text-sm text-ui-subtle">Sin cuenta, tu avance se guarda en este navegador.</p>
          )}
        </div>
        <ul className="grid gap-3 rounded-2xl border border-ui-border bg-ui-surface p-6 text-sm text-ui-text shadow-sm">
          {["12 plantillas, 10 compatibles con ATS", "Importa PDF, Word o texto", "Descarga en PDF", "Guardado automático", "Sin costo, sin tarjeta"].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pasos" className="border-y border-ui-border bg-ui-soft/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="pasos" className="text-2xl font-bold text-ui-text">Cómo crear tu hoja de vida en 4 pasos</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-ui-border bg-ui-surface p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white dark:bg-brand-500 dark:text-slate-950">{index + 1}</span>
                <h3 className="mt-3 text-lg font-semibold text-ui-text">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="incluye" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="incluye" className="text-2xl font-bold text-ui-text">Qué incluye el editor</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-ui-border bg-ui-surface p-5">
              <Icon className="h-5 w-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-ui-text">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-ui-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="cuenta" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <h2 id="cuenta" className="text-2xl font-bold text-ui-text">Sin registro o con cuenta gratuita</h2>
        <p className="mt-2 max-w-3xl text-ui-muted">
          Puedes hacer todo lo esencial sin registrarte. La cuenta, también gratuita, sirve para conservar tus hojas de vida y postularte a vacantes.
        </p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-ui-border">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-ui-soft text-ui-text">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Función</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Sin registro</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold">Con cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border bg-ui-surface">
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <th scope="row" className="px-4 py-3 font-normal text-ui-text">{row.feature}</th>
                  <td className="px-4 py-3 text-center"><Check value={row.guest} /></td>
                  <td className="px-4 py-3 text-center"><Check value={row.account} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="consejos" className="border-y border-ui-border bg-ui-soft/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="consejos" className="text-2xl font-bold text-ui-text">Antes de enviarla</h2>
          <p className="mt-2 max-w-3xl text-ui-muted">
            Una buena plantilla ayuda, pero lo que decide es el contenido. Estas guías y herramientas te ayudan a revisarlo:
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { to: "/academy/hoja-de-vida-ats-2026/", title: "Cómo hacer una hoja de vida que pase los filtros ATS", kind: "Guía" },
              { to: "/academy/errores-que-descartan-un-cv/", title: "Errores que descartan una hoja de vida", kind: "Guía" },
              { to: "/tools/evaluador-cv/", title: "Evalúa tu hoja de vida contra una vacante", kind: "Herramienta" },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="group flex h-full flex-col rounded-2xl border border-ui-border bg-ui-surface p-5 transition hover:border-brand-300 dark:hover:border-brand-800">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ui-accent">{item.kind}</span>
                  <span className="mt-2 font-semibold text-ui-text group-hover:underline">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="preguntas" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 id="preguntas" className="text-2xl font-bold text-ui-text">Preguntas frecuentes</h2>
        <div className="mt-6 divide-y divide-ui-border rounded-2xl border border-ui-border bg-ui-surface">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold text-ui-text marker:hidden">{item.q}</summary>
              <p className="mt-2 text-sm leading-6 text-ui-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-slate-900 p-8 text-center text-white dark:bg-brand-950">
          <h2 className="text-2xl font-bold text-white">Tu hoja de vida, lista hoy</h2>
          <p className="mt-2 text-slate-300">Gratis y sin registro. Te toma pocos minutos.</p>
          <a href={APP_URLS.procvEditor} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 font-semibold text-slate-900 hover:bg-brand-50">
            Empezar ahora
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
