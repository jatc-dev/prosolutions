import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { APP_URLS } from "@prosolutions/ui";
import { DAFP_FAQ, FORMAT_1003_FAQ, TEMPLATE_CARDS, type FaqItem, type TemplateCard } from "../../content/formats";
import { PublicLayout } from "../PublicLayout";
import { getTemplateLanding, landingForTemplate } from "../../content/templateLandings";
import { headForPath, useDocumentHead } from "../seo";

export const DAFP_PATH = "/formato-unico-hoja-de-vida";
export const FORMAT_1003_PATH = "/hoja-de-vida-formato-1003";
export const TEMPLATES_PATH = "/plantillas-hoja-de-vida";

/** Opens the ProCV editor with this template selected (?plantilla=key). */
export const editorUrl = (key: string) => `${APP_URLS.procvEditor}?plantilla=${encodeURIComponent(key)}`;

const primaryButton =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-800 px-6 font-semibold text-white shadow-sm transition-colors hover:bg-brand-900 dark:bg-brand-500 dark:text-slate-950 dark:hover:bg-brand-400";

function CtaButton({ template, children }: { template: string; children: ReactNode }) {
  return (
    <a href={editorUrl(template)} className={primaryButton}>
      <FileText className="h-5 w-5" aria-hidden="true" />
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  );
}

function Hero({ eyebrow, title, intro, template, cta, image, imageAlt, points }: { eyebrow: string; title: string; intro: ReactNode; template: string; cta: string; image: string; imageAlt: string; points: string[] }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <div>
        <p className="text-sm font-semibold text-ui-accent">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">{title}</h1>
        <div className="mt-4 text-lg leading-8 text-ui-muted">{intro}</div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <CtaButton template={template}>{cta}</CtaButton>
          <Link to={`${TEMPLATES_PATH}/`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ui-border-strong bg-ui-surface px-6 font-semibold text-ui-text transition-colors hover:bg-ui-soft">
            Ver todas las plantillas
          </Link>
        </div>
        <ul className="mt-6 grid gap-2 text-sm text-ui-text sm:grid-cols-2">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <figure className="overflow-hidden rounded-2xl border border-ui-border bg-white shadow-sm">
        <img src={image} alt={imageAlt} width={700} height={910} loading="eager" className="h-auto w-full" />
      </figure>
    </section>
  );
}

function Steps({ id, title, steps }: { id: string; title: string; steps: Array<{ title: string; text: string }> }) {
  return (
    <section aria-labelledby={id} className="border-y border-ui-border bg-ui-soft/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id={id} className="text-2xl font-bold text-ui-text">{title}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-ui-border bg-ui-surface p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white dark:bg-brand-500 dark:text-slate-950">{index + 1}</span>
              <h3 className="mt-3 text-lg font-semibold text-ui-text">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ui-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section aria-labelledby="preguntas" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h2 id="preguntas" className="text-2xl font-bold text-ui-text">Preguntas frecuentes</h2>
      <div className="mt-6 divide-y divide-ui-border rounded-2xl border border-ui-border bg-ui-surface">
        {items.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="cursor-pointer font-semibold text-ui-text">{item.q}</summary>
            <p className="mt-2 text-sm leading-6 text-ui-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Related() {
  return (
    <section aria-labelledby="relacionado" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
      <h2 id="relacionado" className="text-xl font-bold text-ui-text">También te puede servir</h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { to: "/academy/hoja-de-vida-ats-2026/", title: "Cómo hacer una hoja de vida que pase los filtros ATS" },
          { to: "/academy/errores-que-descartan-un-cv/", title: "Errores que descartan una hoja de vida" },
          { to: "/tools/evaluador-cv/", title: "Evalúa tu hoja de vida contra una vacante" },
        ].map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="block h-full rounded-2xl border border-ui-border bg-ui-surface p-5 text-sm font-semibold text-ui-text hover:border-ui-accent">
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function DafpFormatPage() {
  useDocumentHead(headForPath(DAFP_PATH));
  return (
    <PublicLayout breadcrumbs={[{ name: "Plantillas", path: TEMPLATES_PATH }, { name: "Formato único de hoja de vida", path: DAFP_PATH }]}>
      <Hero
        eyebrow="Función Pública · Gratis y sin registro"
        title="Formato único de hoja de vida de la Función Pública: llénalo en línea"
        intro={
          <p>
            Diligencia el <strong className="text-ui-text">Formato Único de Hoja de Vida – Persona Natural</strong> (Leyes 190 de 1995, 489 y 443 de 1998) desde el navegador, con tus datos ordenados por secciones, y descárgalo en PDF para imprimir y firmar, o en Word.
          </p>
        }
        template="dafp"
        cta="Llenar el formato único"
        image="/plantillas/dafp.webp"
        imageAlt="Vista previa del formato único de hoja de vida de la Función Pública diligenciado"
        points={["Gratis y sin registro", "Descarga en PDF y Word", "Declaración de inhabilidades con casillas SÍ / NO", "Lugar y fecha de diligenciamiento"]}
      />

      <section aria-labelledby="que-es" className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <h2 id="que-es" className="text-2xl font-bold text-ui-text">Qué es y quién lo pide</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-ui-text">
          <p>
            Es el formato que el Departamento Administrativo de la Función Pública definió para que las entidades del Estado conozcan la formación y la experiencia de quienes se vinculan con ellas. Lo piden alcaldías, gobernaciones, ministerios, hospitales públicos, universidades públicas y demás entidades cuando vas a ocupar un empleo público o a firmar un <strong>contrato de prestación de servicios</strong>.
          </p>
          <p>
            Muchas entidades piden registrar la misma información en el <strong>SIGEP II</strong>; otras siguen pidiendo el formato en PDF o impreso y firmado. Pregunta en la entidad cuál de los dos necesitas. En cualquier caso, tenerlo diligenciado aquí te deja la información lista y revisada.
          </p>
        </div>
      </section>

      <Steps
        id="secciones"
        title="Cómo se llena, sección por sección"
        steps={[
          { title: "Datos personales", text: "Apellidos y nombres por separado, documento de identidad, sexo, nacionalidad, libreta militar si aplica, dirección de correspondencia, teléfono y correo electrónico." },
          { title: "Formación académica", text: "Educación básica y media (último grado aprobado y título de bachiller), educación superior con institución y fecha de terminación, tarjeta profesional si aplica e idiomas con tu nivel para hablar, leer y escribir." },
          { title: "Experiencia laboral", text: "Empleos y contratos empezando por el actual o el último, con empresa o entidad, cargo, fechas de ingreso y retiro, y si fue en el sector público o privado. Al final se resume el tiempo total de experiencia." },
          { title: "Declaración y firma", text: "Marca si estás o no dentro de alguna causal de inhabilidad o incompatibilidad para ejercer cargos públicos o contratar con el Estado, escribe el lugar y la fecha de diligenciamiento y firma." },
        ]}
      />

      <section aria-labelledby="campos" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 id="campos" className="text-2xl font-bold text-ui-text">Guía campo por campo</h2>
        <p className="mt-3 text-[15px] leading-7 text-ui-muted">El formato oficial tiene cinco secciones. ProCV las arma en ese orden con los datos que llenas en el editor; abajo te indicamos qué casillas debes completar tú si la entidad pide el formato oficial con todo su detalle.</p>
        <div className="mt-6 space-y-6 text-[15px] leading-7 text-ui-text">
          <div>
            <h3 className="text-lg font-semibold">1. Datos personales</h3>
            <p className="mt-1 text-ui-muted">Primer apellido, segundo apellido y nombres por separado; tipo y número de documento; sexo; nacionalidad; libreta militar si aplica (clase, número y distrito); fecha y lugar de nacimiento; dirección de correspondencia, teléfono y correo electrónico.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">2. Formación académica</h3>
            <p className="mt-1 text-ui-muted">Educación básica y media (último grado aprobado, título de bachiller y fecha de grado), educación superior e idiomas. En el formato oficial, cada estudio superior lleva un código de modalidad académica:</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-sm">
                <caption className="sr-only">Códigos de modalidad académica del formato único</caption>
                <thead>
                  <tr className="bg-ui-soft text-left"><th className="border border-ui-border px-3 py-2">Código</th><th className="border border-ui-border px-3 py-2">Modalidad</th></tr>
                </thead>
                <tbody>
                  {[
                    ["TC", "Técnica"], ["TL", "Tecnológica"], ["TE", "Tecnológica especializada"], ["UN", "Universitaria"],
                    ["ES", "Especialización"], ["MG", "Maestría o magíster"], ["DOC", "Doctorado"],
                  ].map(([code, name]) => (
                    <tr key={code}><td className="border border-ui-border px-3 py-1.5 font-semibold">{code}</td><td className="border border-ui-border px-3 py-1.5">{name}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-ui-muted">También se anotan los semestres aprobados, si te graduaste, el título obtenido, la fecha de terminación y la tarjeta o matrícula profesional si tu profesión la exige; en idiomas, tu nivel para hablarlo, leerlo y escribirlo. En ProCV llenas todo esto: en cada estudio, abre «Datos para el formato de Función Pública» para indicar la modalidad, los semestres y si te graduaste.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">3. Experiencia laboral</h3>
            <p className="mt-1 text-ui-muted">Cada empleo o contrato, empezando por el actual: empresa o entidad, si es pública o privada, país, departamento y municipio, correo y teléfonos de la entidad, fechas de ingreso y retiro, cargo o contrato, dependencia y dirección. En ProCV, el cargo, la empresa, la ubicación y las fechas salen de tu experiencia; en cada empleo, abre «Datos para el formato de Función Pública» para indicar el tipo de entidad, la dependencia y los datos de contacto.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">4. Tiempo total de experiencia</h3>
            <p className="mt-1 text-ui-muted">El resumen del tiempo trabajado como servidor público, como empleado del sector privado y como trabajador independiente, y el total. ProCV lo calcula solo con las fechas y el tipo de entidad de cada empleo, y cuenta una sola vez los periodos en que tuviste dos trabajos a la vez. Si tus certificados dicen otra cosa, puedes escribir el tiempo a mano.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">5. Firma del servidor público o contratista</h3>
            <p className="mt-1 text-ui-muted">Declaras, bajo la gravedad del juramento, si estás o no dentro de alguna causal de inhabilidad o incompatibilidad; anotas el lugar y la fecha de diligenciamiento y firmas.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="diferencias" className="border-y border-ui-border bg-ui-soft/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="diferencias" className="text-2xl font-bold text-ui-text">Formato único, SIGEP II y declaración de bienes y rentas</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-ui-muted">Se confunden con frecuencia, pero son tres cosas distintas; la entidad te dirá cuáles necesitas.</p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { title: "Formato único de hoja de vida", text: "El documento con tu formación y experiencia, para un empleo público o un contrato de prestación de servicios. Es el que llenas en esta página." },
              { title: "SIGEP II", text: "El sistema en línea de la Función Pública donde muchas entidades piden registrar la misma información de la hoja de vida. Tener el formato llenado te sirve de borrador ordenado." },
              { title: "Declaración de bienes y rentas", text: "Otro formulario, con tu patrimonio y actividad económica, que se presenta antes de posesionarse en un empleo público (Decreto 1083 de 2015). No hace parte de la hoja de vida." },
            ].map((item) => (
              <li key={item.title} className="rounded-2xl border border-ui-border bg-ui-surface p-6">
                <h3 className="text-lg font-semibold text-ui-text">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ui-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="soportes" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 id="soportes" className="text-2xl font-bold text-ui-text">Documentos que suelen pedir junto al formato</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
          <li>Copia del documento de identidad.</li>
          <li>Diplomas o actas de grado de los estudios que declaras.</li>
          <li>Tarjeta o matrícula profesional, si tu profesión la exige.</li>
          <li>Certificados laborales o de contratos con fechas de ingreso y retiro y, cuando la entidad lo pide, las funciones.</li>
          <li>Libreta militar, cuando aplica.</li>
        </ul>
        <p className="mt-3 text-sm text-ui-muted">La lista exacta depende de la entidad y de la convocatoria o el contrato: revísala siempre allí.</p>
      </section>

      <section aria-labelledby="errores" className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <h2 id="errores" className="text-2xl font-bold text-ui-text">Errores comunes que conviene evitar</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
          <li>Fechas de experiencia que no coinciden con los certificados laborales que vas a adjuntar.</li>
          <li>Dejar en blanco la declaración de inhabilidades o la fecha de diligenciamiento.</li>
          <li>Mezclar formación en curso con títulos obtenidos: anota la fecha de terminación solo si ya te graduaste.</li>
          <li>Olvidar la firma cuando la entidad pide el formato impreso.</li>
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-ui-border bg-ui-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] leading-7 text-ui-text">Llénalo ahora: en unos minutos tienes el formato listo en PDF para imprimir y firmar, o en Word.</p>
          <CtaButton template="dafp">Llenar el formato único</CtaButton>
        </div>
      </section>

      <Faq items={DAFP_FAQ} />
      <Related />
    </PublicLayout>
  );
}

export function Format1003Page() {
  useDocumentHead(headForPath(FORMAT_1003_PATH));
  return (
    <PublicLayout breadcrumbs={[{ name: "Plantillas", path: TEMPLATES_PATH }, { name: "Hoja de vida formato 1003", path: FORMAT_1003_PATH }]}>
      <Hero
        eyebrow="Formato 1003 · Gratis y sin registro"
        title="Hoja de vida formato 1003 para llenar en línea"
        intro={
          <p>
            El formato de hoja de vida más usado en Colombia para empleos de comercio, servicios y cargos operativos, conocido popularmente como <strong className="text-ui-text">“hoja de vida Minerva”</strong>. Llénalo en tu celular o computador, con foto, y descárgalo en PDF o Word sin pagar ni registrarte.
          </p>
        }
        template="employment"
        cta="Llenar el formato 1003"
        image="/plantillas/employment.webp"
        imageAlt="Vista previa de la hoja de vida formato 1003 diligenciada"
        points={["Gratis y sin registro", "Con foto opcional", "Referencias laborales y personales", "Descarga en PDF y Word"]}
      />

      <Steps
        id="que-lleva"
        title="Qué lleva el formato 1003"
        steps={[
          { title: "Solicitud y datos personales", text: "Cargo al que aspiras, aspiración salarial, nombres y apellidos, documento, estado civil, dirección, teléfono, correo y foto." },
          { title: "Estudios y experiencia", text: "Tus estudios con institución y fechas, y tus últimos empleos con empresa, cargo, ciudad, fechas y funciones." },
          { title: "Información familiar y seguridad social", text: "Cónyuge, personas a cargo, contacto de emergencia, EPS, fondo de pensiones y fondo de cesantías, como en el formato impreso." },
          { title: "Referencias", text: "Referencias laborales y personales o familiares con nombre, relación y teléfono de contacto." },
        ]}
      />

      <section aria-labelledby="consejos" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 id="consejos" className="text-2xl font-bold text-ui-text">Consejos para que destaque</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
          <li>Escribe el cargo al que aspiras exactamente como aparece en la vacante.</li>
          <li>En cada empleo, describe tus funciones con verbos de acción y, si puedes, un logro concreto.</li>
          <li>Usa un correo con tu nombre y un teléfono en el que te contesten.</li>
          <li>Si la empresa recibe hojas de vida por internet, prueba también una plantilla compatible con ATS.</li>
        </ul>
        <p className="mt-6 text-xs text-ui-subtle">
          “Minerva” es una marca de su respectivo titular. ProSolutions no tiene relación con ella; usamos el nombre solo porque así se conoce popularmente este formato.
        </p>
      </section>

      <Faq items={FORMAT_1003_FAQ} />
      <Related />
    </PublicLayout>
  );
}

function TemplateTile({ template }: { template: TemplateCard }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-sm">
      <div className="aspect-[10/13] overflow-hidden border-b border-ui-border bg-white">
        <img src={`/plantillas/${template.key}.webp`} alt={`Plantilla de hoja de vida ${template.name}`} width={700} height={910} loading="lazy" className="h-full w-full object-contain object-top" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-ui-text">{template.name}</h3>
        <p className="mt-1 flex-1 text-sm leading-6 text-ui-muted">{template.description}</p>
        <p className="mt-3 flex flex-wrap gap-2 text-xs">
          {template.ats ? <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-900 dark:bg-brand-950/50 dark:text-brand-300">Compatible con ATS</span> : null}
          <span className="rounded-full bg-ui-soft px-2 py-0.5 text-ui-muted">{template.photo ? "Con foto opcional" : "Sin foto"}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href={editorUrl(template.key)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline dark:text-brand-300">
            Usar esta plantilla <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          {landingForTemplate(template.key) ? (
            <Link to={`${TEMPLATES_PATH}/${landingForTemplate(template.key)!.slug}/`} className="text-sm font-medium text-ui-muted underline hover:text-ui-text">
              Guía de este formato
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function TemplatesGalleryPage() {
  useDocumentHead(headForPath(TEMPLATES_PATH));
  const groups = Array.from(new Set(TEMPLATE_CARDS.map((template) => template.group)));
  return (
    <PublicLayout breadcrumbs={[{ name: "Plantillas", path: TEMPLATES_PATH }]}>
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6">
        <p className="text-sm font-semibold text-ui-accent">ProCV · {TEMPLATE_CARDS.length} plantillas gratis</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">Plantillas de hoja de vida gratis para descargar en Word y PDF</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ui-muted">
          Elige un diseño, llénalo en línea y descárgalo en PDF o Word. Sin registro y sin marcas de agua. Todas son compatibles con los filtros ATS que usan los portales de empleo: el PDF incluye tu texto real.
        </p>
      </section>

      {groups.map((group) => (
        <section key={group} aria-labelledby={`grupo-${group}`} className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <h2 id={`grupo-${group}`} className="text-xl font-bold text-ui-text">{group}</h2>
          {group === "Formatos oficiales" ? (
            <p className="mt-1 text-sm text-ui-muted">
              Guías paso a paso: <Link to={`${DAFP_PATH}/`} className="font-medium text-brand-800 underline dark:text-brand-300">formato único de Función Pública</Link> y{" "}
              <Link to={`${FORMAT_1003_PATH}/`} className="font-medium text-brand-800 underline dark:text-brand-300">formato 1003</Link>.
            </p>
          ) : null}
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_CARDS.filter((template) => template.group === group).map((template) => (
              <TemplateTile key={template.key} template={template} />
            ))}
          </div>
        </section>
      ))}

      <section aria-labelledby="cual-elegir" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 id="cual-elegir" className="text-2xl font-bold text-ui-text">¿Cuál plantilla elegir?</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
          <li><strong>Entidad pública o contrato con el Estado:</strong> el formato único de Función Pública.</li>
          <li><strong>Empleos operativos, comercio y servicios con hoja de vida impresa:</strong> el formato 1003.</li>
          <li><strong>Portales de empleo y empresas grandes:</strong> una plantilla compatible con ATS, como ATS Profesional o Minimalista.</li>
          <li><strong>Envío directo a una persona o perfil creativo:</strong> Panel lateral o Creativa.</li>
        </ul>
      </section>
      <Related />
    </PublicLayout>
  );
}

/** /plantillas-hoja-de-vida/<slug>/: one of the most searched CV formats, with its template. */
export function TemplateLandingPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const landing = getTemplateLanding(slug);
  useDocumentHead(headForPath(`${TEMPLATES_PATH}/${slug}`));
  if (!landing) {
    return (
      <PublicLayout breadcrumbs={[{ name: "Plantillas", path: TEMPLATES_PATH }]}>
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-ui-text">No encontramos esta plantilla</h1>
          <Link to={`${TEMPLATES_PATH}/`} className="mt-4 inline-block font-semibold text-brand-800 underline dark:text-brand-300">Ver todas las plantillas</Link>
        </section>
      </PublicLayout>
    );
  }
  const card = TEMPLATE_CARDS.find((item) => item.key === landing.template);
  return (
    <PublicLayout breadcrumbs={[{ name: "Plantillas", path: TEMPLATES_PATH }, { name: landing.name, path: `${TEMPLATES_PATH}/${landing.slug}` }]}>
      <Hero
        eyebrow="Plantilla gratis · Sin registro"
        title={landing.h1}
        intro={<>{landing.intro.map((paragraph) => <p key={paragraph} className="mb-3 last:mb-0">{paragraph}</p>)}</>}
        template={landing.template}
        cta={`Usar la plantilla ${card?.name ?? landing.name}`}
        image={`/plantillas/${landing.template}.webp`}
        imageAlt={`Vista previa de la plantilla de hoja de vida ${card?.name ?? landing.name}`}
        points={["Gratis y sin registro", "Descarga en PDF y Word", "Compatible con filtros ATS", card?.photo ? "Foto opcional" : "Sin foto"]}
      />

      <section aria-labelledby="para-quien" className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
        <h2 id="para-quien" className="text-2xl font-bold text-ui-text">¿Para quién es este formato?</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
          {landing.forWhom.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <Steps id="estructura" title="Cómo se organiza" steps={landing.structure} />

      <section aria-labelledby="consejos" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 id="consejos" className="text-2xl font-bold text-ui-text">Consejos para llenarla</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-ui-text">
          {landing.tips.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
        <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-ui-border bg-ui-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] leading-7 text-ui-text">Llénala en línea: en unos minutos tienes tu hoja de vida lista en PDF o Word.</p>
          <CtaButton template={landing.template}>Usar esta plantilla</CtaButton>
        </div>
      </section>

      <Faq items={landing.faq} />

      <section aria-labelledby="relacionado" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 id="relacionado" className="text-xl font-bold text-ui-text">También te puede servir</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {[...landing.related, { to: `${TEMPLATES_PATH}/`, title: "Ver las 21 plantillas" }].map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="block h-full rounded-2xl border border-ui-border bg-ui-surface p-5 text-sm font-semibold text-ui-text hover:border-ui-accent">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PublicLayout>
  );
}
