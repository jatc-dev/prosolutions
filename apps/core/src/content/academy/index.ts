import atsCv from "./articulos/hoja-de-vida-ats-2026.md?raw";
import payrollGuide from "./articulos/salarios-prestaciones-contratos-colombia.md?raw";
import negotiate from "./articulos/como-negociar-salario.md?raw";
import star from "./articulos/preguntas-entrevista-metodo-star.md?raw";
import remote from "./articulos/trabajo-remoto-internacional-latam.md?raw";
import transition from "./articulos/transicion-carrera-roles-digitales.md?raw";
import cvMistakes from "./articulos/errores-que-descartan-un-cv.md?raw";
import employers from "./articulos/guia-empresas-ofertas-transparentes.md?raw";
import firstJob from "./articulos/primer-empleo-sin-experiencia.md?raw";
import coverLetter from "./articulos/como-escribir-carta-de-presentacion.md?raw";
import virtualInterview from "./articulos/entrevista-de-trabajo-virtual.md?raw";
import resign from "./articulos/como-renunciar-a-un-trabajo.md?raw";
import { readingMinutes } from "../markdown";

export type AcademyCategory = "hoja-de-vida" | "entrevistas" | "salarios-y-contratos" | "carrera" | "empresas";

export const CATEGORIES: Record<AcademyCategory, { label: string; description: string }> = {
  "hoja-de-vida": { label: "Hoja de vida", description: "Cómo escribir una hoja de vida que pase filtros y convenza a personas." },
  entrevistas: { label: "Entrevistas", description: "Preparación práctica para entrevistas por competencias." },
  "salarios-y-contratos": { label: "Salarios y contratos", description: "Derechos laborales, prestaciones y negociación salarial en Colombia." },
  carrera: { label: "Carrera", description: "Cambios de carrera, trabajo remoto y crecimiento profesional." },
  empresas: { label: "Para empresas", description: "Buenas prácticas para publicar ofertas y seleccionar talento." },
};

export interface Author {
  id: string;
  name: string;
  role: string;
  bio: string;
}

/**
 * Editorial byline. Articles are written and reviewed by the platform team;
 * we do not attribute them to individuals who have not authored them.
 */
export const AUTHORS: Record<string, Author> = {
  editorial: {
    id: "editorial",
    name: "Equipo editorial de ProSolutions",
    role: "Contenido de empleabilidad y derecho laboral básico",
    bio:
      "Escribimos guías prácticas sobre búsqueda de empleo, hojas de vida y condiciones laborales en Colombia y Latinoamérica. Cada artículo cita la norma aplicable cuando corresponde, se revisa periódicamente y se actualiza cuando cambian las reglas. No reemplaza la asesoría de un abogado o contador.",
  },
};

export interface Article {
  slug: string;
  title: string;
  description: string;
  category: AcademyCategory;
  author: keyof typeof AUTHORS;
  publishedAt: string;
  updatedAt: string;
  related: string[];
  body: string;
  readingMinutes: number;
}

type ArticleSeed = Omit<Article, "readingMinutes">;

const seeds: ArticleSeed[] = [
  {
    slug: "hoja-de-vida-ats-2026",
    title: "Cómo hacer una hoja de vida que pase los filtros ATS en 2026",
    description:
      "Guía práctica para que tu hoja de vida sea leída correctamente por los sistemas ATS y convenza al reclutador: formato, palabras clave, logros y errores comunes.",
    category: "hoja-de-vida",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["errores-que-descartan-un-cv", "preguntas-entrevista-metodo-star", "transicion-carrera-roles-digitales"],
    body: atsCv,
  },
  {
    slug: "salarios-prestaciones-contratos-colombia",
    title: "Salario, prestaciones sociales y tipos de contrato en Colombia",
    description:
      "Qué te descuentan cada mes, cómo funcionan la prima, las cesantías y las vacaciones, y qué diferencia hay entre contrato indefinido, fijo, por obra y prestación de servicios.",
    category: "salarios-y-contratos",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["como-negociar-salario", "trabajo-remoto-internacional-latam", "guia-empresas-ofertas-transparentes"],
    body: payrollGuide,
  },
  {
    slug: "como-negociar-salario",
    title: "Cómo negociar tu salario con datos: guía paso a paso",
    description:
      "Investiga tu valor de mercado, calcula tu salario neto real, responde a la pregunta de aspiración salarial y negocia beneficios cuando el salario no se mueve.",
    category: "salarios-y-contratos",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["salarios-prestaciones-contratos-colombia", "preguntas-entrevista-metodo-star", "trabajo-remoto-internacional-latam"],
    body: negotiate,
  },
  {
    slug: "preguntas-entrevista-metodo-star",
    title: "Las 20 preguntas de entrevista más frecuentes y cómo responderlas con el método STAR",
    description:
      "Aprende a estructurar respuestas con el método STAR y prepara historias para las preguntas por competencias que más se repiten en entrevistas de trabajo.",
    category: "entrevistas",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["como-negociar-salario", "hoja-de-vida-ats-2026", "errores-que-descartan-un-cv"],
    body: star,
  },
  {
    slug: "trabajo-remoto-internacional-latam",
    title: "Trabajo remoto para empresas extranjeras desde Latinoamérica: pagos, impuestos y cómo destacar",
    description:
      "Modalidades de vinculación, cómo fijar tu tarifa, medios para recibir pagos, obligaciones tributarias básicas en Colombia y señales de alerta en ofertas remotas.",
    category: "carrera",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["salarios-prestaciones-contratos-colombia", "como-negociar-salario", "transicion-carrera-roles-digitales"],
    body: remote,
  },
  {
    slug: "transicion-carrera-roles-digitales",
    title: "Cómo pasar a un rol digital sin experiencia: plan de 90 días y portafolio",
    description:
      "Elige un rol digital, aprovecha tus habilidades transferibles y construye un portafolio con proyectos reales para conseguir tu primer empleo en el nuevo campo.",
    category: "carrera",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["hoja-de-vida-ats-2026", "trabajo-remoto-internacional-latam", "preguntas-entrevista-metodo-star"],
    body: transition,
  },
  {
    slug: "errores-que-descartan-un-cv",
    title: "12 errores que descartan una hoja de vida en menos de 10 segundos",
    description:
      "Los errores más frecuentes que hacen que un reclutador o un sistema ATS descarte tu hoja de vida, y cómo corregirlos con ejemplos concretos.",
    category: "hoja-de-vida",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["hoja-de-vida-ats-2026", "preguntas-entrevista-metodo-star", "transicion-carrera-roles-digitales"],
    body: cvMistakes,
  },
  {
    slug: "guia-empresas-ofertas-transparentes",
    title: "Guía para empresas: cómo publicar ofertas de empleo transparentes",
    description:
      "Qué debe incluir una oferta de empleo clara —salario, contrato, funciones y proceso—, qué prohíbe la ley colombiana y un ejemplo listo para adaptar.",
    category: "empresas",
    author: "editorial",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-18",
    related: ["salarios-prestaciones-contratos-colombia", "como-negociar-salario", "errores-que-descartan-un-cv"],
    body: employers,
  },
  {
    slug: "primer-empleo-sin-experiencia",
    title: "Cómo conseguir tu primer empleo sin experiencia: hoja de vida, búsqueda y entrevista",
    description:
      "Convierte proyectos, voluntariados y trabajos informales en experiencia que convence, encuentra vacantes junior y prepárate para la entrevista de tu primer empleo.",
    category: "carrera",
    author: "editorial",
    publishedAt: "2026-11-19",
    updatedAt: "2026-11-19",
    related: ["hoja-de-vida-ats-2026", "como-escribir-carta-de-presentacion", "preguntas-entrevista-metodo-star"],
    body: firstJob,
  },
  {
    slug: "como-escribir-carta-de-presentacion",
    title: "Cómo escribir una carta de presentación: estructura, ejemplo y errores a evitar",
    description:
      "Qué debe decir una carta de presentación, cómo organizar sus cuatro párrafos, un ejemplo completo para adaptar y los errores que hacen que nadie la lea.",
    category: "hoja-de-vida",
    author: "editorial",
    publishedAt: "2026-11-19",
    updatedAt: "2026-11-19",
    related: ["hoja-de-vida-ats-2026", "primer-empleo-sin-experiencia", "errores-que-descartan-un-cv"],
    body: coverLetter,
  },
  {
    slug: "entrevista-de-trabajo-virtual",
    title: "Entrevista de trabajo virtual: preparación técnica, presentación y respuestas",
    description:
      "Cómo preparar cámara, conexión, luz y fondo para una entrevista por videollamada o grabada, qué hacer si falla la conexión y cómo responder con seguridad.",
    category: "entrevistas",
    author: "editorial",
    publishedAt: "2026-11-19",
    updatedAt: "2026-11-19",
    related: ["preguntas-entrevista-metodo-star", "como-negociar-salario", "trabajo-remoto-internacional-latam"],
    body: virtualInterview,
  },
  {
    slug: "como-renunciar-a-un-trabajo",
    title: "Cómo renunciar a un trabajo en Colombia: carta, liquidación y documentos",
    description:
      "Cómo comunicar tu renuncia, un modelo de carta, qué incluye la liquidación al salir, qué documentos pedir y cómo hacer un empalme que deje buenas referencias.",
    category: "salarios-y-contratos",
    author: "editorial",
    publishedAt: "2026-11-19",
    updatedAt: "2026-11-19",
    related: ["salarios-prestaciones-contratos-colombia", "como-negociar-salario", "primer-empleo-sin-experiencia"],
    body: resign,
  },
];

export const ARTICLES: Article[] = seeds.map((seed) => ({ ...seed, readingMinutes: readingMinutes(seed.body) }));

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function relatedArticles(article: Article): Article[] {
  return article.related.map(getArticle).filter((item): item is Article => Boolean(item));
}
