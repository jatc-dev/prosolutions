/**
 * Landing pages for the most searched CV formats
 * (/plantillas-hoja-de-vida/<slug>/). Each one explains the format and opens
 * the ProCV editor with its template. Keys match the ProCV catalog.
 */
import type { FaqItem } from "./formats";

export interface TemplateLanding {
  slug: string;
  /** ProCV template key. */
  template: string;
  name: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  forWhom: string[];
  structure: Array<{ title: string; text: string }>;
  tips: string[];
  faq: FaqItem[];
  related: Array<{ to: string; title: string }>;
  updatedAt: string;
}

const UPDATED = "2026-11-26";

export const TEMPLATE_LANDINGS: TemplateLanding[] = [
  {
    slug: "formato-harvard",
    template: "harvard",
    name: "Formato Harvard",
    title: "Hoja de vida formato Harvard: plantilla gratis para llenar en línea (PDF y Word)",
    description:
      "Plantilla de hoja de vida en formato Harvard: una columna, sobria, con la educación primero y logros medibles. Llénala en línea gratis, sin registro, y descárgala en PDF o Word.",
    h1: "Hoja de vida formato Harvard: plantilla para llenar en línea",
    intro: [
      "El formato Harvard es un estilo de hoja de vida académico y sobrio, popularizado por las guías de orientación profesional de universidades estadounidenses. Va en una sola columna, sin colores ni gráficos, con títulos en mayúsculas y una línea bajo cada sección.",
      "Lo que lo distingue es el orden y el tono: la educación va primero, cada experiencia empieza por la organización y el lugar, y las funciones se escriben como logros con verbos de acción y, cuando se puede, con cifras.",
    ],
    forWhom: [
      "Estudiantes y recién graduados, porque la formación es lo primero que se lee.",
      "Perfiles académicos, de investigación o docencia.",
      "Postulaciones a becas, posgrados, programas de prácticas y empresas multinacionales.",
      "Cualquier persona que quiera una hoja de vida clásica, fácil de leer y compatible con los sistemas ATS.",
    ],
    structure: [
      { title: "Encabezado", text: "Nombre completo centrado, título profesional y una línea con ciudad, correo y teléfono. Sin foto." },
      { title: "Educación", text: "Institución y ciudad en la primera línea; título y fechas en la segunda. Puedes añadir distinciones o el promedio si es destacado." },
      { title: "Experiencia", text: "Organización y lugar, luego cargo y fechas. Debajo, 2 a 4 logros con verbos de acción: «Reduje…», «Implementé…», «Coordiné…»." },
      { title: "Habilidades e idiomas", text: "Una o dos líneas con herramientas, competencias y el nivel de cada idioma." },
    ],
    tips: [
      "Ocupa una página si tienes menos de 10 años de experiencia.",
      "Cuantifica: porcentajes, montos, número de personas o proyectos.",
      "Usa el mismo formato de fecha en todo el documento.",
      "Evita los adjetivos genéricos («proactivo», «responsable») y muéstralos con hechos.",
    ],
    faq: [
      { q: "¿El formato Harvard lleva foto?", a: "No. Sigue la costumbre de las hojas de vida estadounidenses, sin foto ni datos como edad o estado civil. Si la empresa pide foto, usa otra de nuestras plantillas." },
      { q: "¿Siempre va la educación primero?", a: "Es lo habitual para estudiantes y perfiles académicos. Si ya tienes varios años de experiencia relevante, puedes considerar la plantilla cronológica, que empieza por la experiencia." },
      { q: "¿Es compatible con los filtros ATS?", a: "Sí. Es de una sola columna, con títulos estándar, y el PDF que descargas incluye el texto real, así que los sistemas de selección lo leen sin problemas." },
    ],
    related: [
      { to: "/academy/hoja-de-vida-ats-2026/", title: "Cómo hacer una hoja de vida que pase los filtros ATS" },
      { to: "/ejemplos-hoja-de-vida/", title: "Frases y logros de ejemplo por cargo" },
    ],
    updatedAt: UPDATED,
  },
  {
    slug: "cronologica",
    template: "cronologica",
    name: "Cronológica",
    title: "Hoja de vida cronológica: plantilla gratis, de lo más reciente a lo más antiguo",
    description:
      "Plantilla de hoja de vida cronológica (cronológica inversa), la más usada en Colombia y Latinoamérica: fechas en su propia columna y experiencia de la más reciente a la más antigua. Gratis, en PDF o Word.",
    h1: "Hoja de vida cronológica: plantilla gratis para llenar en línea",
    intro: [
      "La hoja de vida cronológica, o cronológica inversa, presenta tu experiencia y tus estudios empezando por lo más reciente. Es el formato más usado en Colombia y en toda Latinoamérica, y el que los reclutadores esperan por defecto.",
      "En esta plantilla las fechas van en su propia columna, a la izquierda, para que quien la lee vea de un vistazo tu trayectoria y cuánto tiempo estuviste en cada lugar.",
    ],
    forWhom: [
      "Personas con una trayectoria continua en el mismo sector o en cargos relacionados.",
      "Quienes quieren mostrar crecimiento: ascensos o más responsabilidades con el tiempo.",
      "Postulaciones a empresas tradicionales, sector público y portales de empleo.",
    ],
    structure: [
      { title: "Encabezado y perfil", text: "Nombre, cargo, datos de contacto y un perfil profesional de 3 a 4 líneas con tus años de experiencia y tu especialidad." },
      { title: "Experiencia laboral", text: "Del empleo actual o último hacia atrás. Fechas a la izquierda; cargo, empresa y ciudad a la derecha, con tus funciones y logros." },
      { title: "Educación", text: "También de lo más reciente a lo más antiguo, con institución y fechas." },
      { title: "Habilidades, idiomas y referencias", text: "Al final, lo que complementa tu perfil." },
    ],
    tips: [
      "Si tienes periodos sin trabajar largos, explícalos brevemente (estudios, cuidado familiar, emprendimiento).",
      "Incluye solo los últimos 10 a 15 años si tu trayectoria es larga.",
      "Dedica más espacio a los cargos recientes y relacionados con la vacante.",
    ],
    faq: [
      { q: "¿Qué es una hoja de vida cronológica inversa?", a: "Es la que ordena la experiencia y los estudios desde lo más reciente hacia lo más antiguo. Es el formato estándar y el que esta plantilla aplica automáticamente." },
      { q: "¿Cuándo no conviene el formato cronológico?", a: "Si estás cambiando de sector o tienes poca experiencia relacionada, puede convenirte la plantilla por competencias o la de primer empleo, que destacan primero lo que sabes hacer." },
      { q: "¿Puedo poner foto?", a: "Sí, la plantilla tiene foto opcional. En Colombia es habitual incluirla, salvo que la vacante indique lo contrario." },
    ],
    related: [
      { to: "/academy/errores-que-descartan-un-cv/", title: "Errores que descartan una hoja de vida" },
      { to: "/tools/evaluador-cv/", title: "Evalúa tu hoja de vida contra una vacante" },
    ],
    updatedAt: UPDATED,
  },
  {
    slug: "sin-experiencia",
    template: "primer-empleo",
    name: "Sin experiencia (primer empleo)",
    title: "Hoja de vida sin experiencia: plantilla gratis para tu primer empleo (PDF y Word)",
    description:
      "Plantilla de hoja de vida para primer empleo o prácticas: estudios, habilidades e idiomas antes que la experiencia. Llénala en línea gratis y descárgala en PDF o Word.",
    h1: "Hoja de vida sin experiencia: plantilla para tu primer empleo",
    intro: [
      "Cuando aún no tienes experiencia laboral, lo importante es mostrar lo que sí tienes: tu formación, tus habilidades, los idiomas y lo que has hecho en proyectos, prácticas, voluntariados o trabajos informales.",
      "Esta plantilla ordena la hoja de vida para eso: el perfil destacado arriba, luego los estudios, las habilidades y los idiomas, y la experiencia al final, aunque sea breve.",
    ],
    forWhom: [
      "Bachilleres y estudiantes que buscan su primer trabajo.",
      "Estudiantes técnicos, tecnólogos o universitarios que buscan prácticas o contrato de aprendizaje.",
      "Recién graduados sin experiencia formal en su área.",
    ],
    structure: [
      { title: "Perfil", text: "Tres líneas: qué estudias o estudiaste, qué sabes hacer y qué tipo de trabajo buscas." },
      { title: "Educación", text: "Tus estudios más recientes primero; puedes incluir cursos cortos relevantes y proyectos de grado." },
      { title: "Habilidades e idiomas", text: "Herramientas que manejas (Excel, programas, maquinaria) y habilidades como atención al cliente o trabajo en equipo, con ejemplos." },
      { title: "Experiencia y actividades", text: "Prácticas, voluntariados, trabajos informales o por temporada, emprendimientos y proyectos académicos: todo cuenta si muestra responsabilidad y resultados." },
    ],
    tips: [
      "No dejes secciones vacías: si no tienes experiencia formal, describe proyectos o voluntariados.",
      "Usa verbos de acción también en lo académico: «Organicé», «Diseñé», «Presenté».",
      "Una página es suficiente.",
      "Revisa la ortografía: en un primer empleo es de lo que más se fija un reclutador.",
    ],
    faq: [
      { q: "¿Qué pongo en experiencia si nunca he trabajado?", a: "Prácticas, voluntariados, trabajos por días o en temporadas, ventas por tu cuenta, monitorías, proyectos de clase o de grado. Indica qué hiciste y qué lograste." },
      { q: "¿Debo poner referencias?", a: "Puedes incluir referencias personales o académicas (un docente o un tutor de prácticas), siempre con su permiso. También puedes indicar «disponibles a solicitud»." },
      { q: "¿Cómo escribo el perfil sin experiencia?", a: "Enfócate en tu formación, tus habilidades concretas y lo que buscas: por ejemplo, «Tecnólogo en gestión logística con manejo de inventarios y Excel, en busca de mi primera experiencia en bodega o compras»." },
    ],
    related: [
      { to: "/academy/primer-empleo-sin-experiencia/", title: "Guía: cómo conseguir tu primer empleo sin experiencia" },
      { to: "/ejemplos-hoja-de-vida/", title: "Frases y logros de ejemplo por cargo" },
    ],
    updatedAt: UPDATED,
  },
  {
    slug: "por-competencias",
    template: "competencias",
    name: "Por competencias",
    title: "Hoja de vida por competencias (funcional): plantilla gratis en PDF y Word",
    description:
      "Plantilla de hoja de vida por competencias: tus habilidades clave primero, en un recuadro destacado, y luego la experiencia. Ideal para cambiar de sector o volver a trabajar. Gratis y sin registro.",
    h1: "Hoja de vida por competencias: plantilla para llenar en línea",
    intro: [
      "La hoja de vida por competencias, también llamada funcional, pone primero lo que sabes hacer y después dónde lo hiciste. Así el reclutador ve de inmediato si tus habilidades encajan con la vacante, aunque tu experiencia venga de otro sector.",
      "Muchos reclutadores desconfían de una hoja de vida que oculta las fechas, así que esta plantilla usa un formato combinado: competencias destacadas arriba y, debajo, tu experiencia con fechas, como en una hoja de vida cronológica.",
    ],
    forWhom: [
      "Personas que cambian de sector o de tipo de cargo.",
      "Quienes vuelven a trabajar después de una pausa.",
      "Perfiles con experiencia variada o por proyectos.",
    ],
    structure: [
      { title: "Perfil", text: "Quién eres profesionalmente y hacia dónde vas, en 3 o 4 líneas." },
      { title: "Competencias clave", text: "6 a 10 habilidades concretas relacionadas con la vacante, en un recuadro destacado." },
      { title: "Experiencia laboral", text: "Cargos con fechas, de lo más reciente a lo más antiguo, con logros que demuestren esas competencias." },
      { title: "Educación e idiomas", text: "Tus estudios y certificaciones, sobre todo los que respaldan el cambio de sector." },
    ],
    tips: [
      "Elige competencias que aparezcan en la descripción de la vacante.",
      "Respalda cada competencia con un logro en la experiencia.",
      "No escondas las fechas: mostrarlas genera confianza.",
    ],
    faq: [
      { q: "¿Cuál es la diferencia con una hoja de vida cronológica?", a: "La cronológica empieza por la experiencia; la de competencias empieza por las habilidades. Esta plantilla combina ambas: competencias primero y experiencia con fechas después." },
      { q: "¿Los sistemas ATS leen bien este formato?", a: "Sí. Tiene títulos estándar, va en una columna y el PDF incluye el texto real. Para que el filtro te encuentre, usa en las competencias las mismas palabras de la vacante." },
      { q: "¿Sirve si tengo mucha experiencia en el mismo sector?", a: "Puede servir, pero en ese caso la plantilla cronológica suele mostrar mejor tu crecimiento." },
    ],
    related: [
      { to: "/academy/transicion-carrera-roles-digitales/", title: "Cómo hacer una transición de carrera" },
      { to: "/tools/evaluador-cv/", title: "Evalúa tu hoja de vida contra una vacante" },
    ],
    updatedAt: UPDATED,
  },
  {
    slug: "formato-europeo",
    template: "europea",
    name: "Formato europeo",
    title: "Hoja de vida formato europeo: plantilla gratis inspirada en el estilo Europass",
    description:
      "Plantilla de hoja de vida en formato europeo: títulos de sección en una columna a la izquierda y detalles a la derecha, con idiomas por niveles del Marco Común Europeo. Gratis, en PDF o Word.",
    h1: "Hoja de vida formato europeo: plantilla para llenar en línea",
    intro: [
      "El formato europeo organiza la hoja de vida en dos columnas: a la izquierda, el nombre de cada sección; a la derecha, la información. Es un estilo ordenado y fácil de recorrer, muy asociado al modelo Europass de la Unión Europea.",
      "Esta plantilla está inspirada en ese estilo, pero no es el documento oficial Europass: si una convocatoria europea te exige ese modelo, créalo en el sitio oficial de Europass. Para cualquier otra postulación, esta plantilla te da el mismo orden con un diseño más actual.",
    ],
    forWhom: [
      "Postulaciones a empresas, universidades o programas en Europa que no exigen el modelo oficial.",
      "Perfiles con varios idiomas o experiencia internacional.",
      "Quienes prefieren un diseño muy estructurado.",
    ],
    structure: [
      { title: "Datos personales", text: "Nombre, cargo, ciudad, correo y teléfono, con foto opcional." },
      { title: "Perfil y experiencia", text: "Cada sección con su título a la izquierda; la experiencia, de lo más reciente a lo más antiguo." },
      { title: "Educación y formación", text: "Títulos, instituciones y fechas." },
      { title: "Idiomas", text: "Con el nivel del Marco Común Europeo de Referencia (A1 a C2), el estándar que usan las instituciones europeas." },
    ],
    tips: [
      "Indica tus idiomas con niveles A1–C2 y, si tienes, el certificado.",
      "Para Europa, revisa si el país o la empresa esperan foto: en varios países no se acostumbra.",
      "Escribe las fechas completas (mes y año).",
    ],
    faq: [
      { q: "¿Es lo mismo que el Europass?", a: "No. Es una plantilla con el mismo orden y estilo de dos columnas, pero el Europass oficial se crea en el sitio de la Unión Europea. Úsalo cuando una convocatoria lo exija." },
      { q: "¿Qué significan los niveles A1, B2 o C1?", a: "Son los niveles del Marco Común Europeo de Referencia para las lenguas: A1 y A2 (básico), B1 y B2 (intermedio) y C1 y C2 (avanzado)." },
      { q: "¿Funciona para postular en Colombia?", a: "Sí. Es una hoja de vida completa y compatible con los filtros ATS; solo cambia la disposición visual." },
    ],
    related: [
      { to: "/academy/trabajo-remoto-internacional-latam/", title: "Trabajo remoto internacional desde Latinoamérica" },
      { to: "/academy/hoja-de-vida-ats-2026/", title: "Cómo hacer una hoja de vida que pase los filtros ATS" },
    ],
    updatedAt: UPDATED,
  },
];

export function getTemplateLanding(slug: string): TemplateLanding | undefined {
  return TEMPLATE_LANDINGS.find((landing) => landing.slug === slug);
}

export function landingForTemplate(template: string): TemplateLanding | undefined {
  return TEMPLATE_LANDINGS.find((landing) => landing.template === template);
}
