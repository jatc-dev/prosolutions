/**
 * Public landing pages for the CV formats people search for in Colombia
 * (Formato Único de Función Pública, formato 1003) and the template gallery.
 * Each one links to the ProCV editor with the template already selected.
 */

export const FORMAT_PAGES_UPDATED = "2026-11-21";

export interface FaqItem {
  q: string;
  a: string;
}

export interface TemplateCard {
  key: string;
  name: string;
  description: string;
  ats: boolean;
  photo: boolean;
  group: "Formatos oficiales" | "Profesionales" | "Compatibles con ATS" | "Diseño";
}

/** Same keys as the ProCV template catalog (apps/procv/frontend/src/utils/templateCatalog.ts). */
export const TEMPLATE_CARDS: TemplateCard[] = [
  { key: "dafp", name: "Función Pública (DAFP)", group: "Formatos oficiales", ats: true, photo: false, description: "Estructura del Formato Único de Hoja de Vida para entidades públicas y contratistas del Estado." },
  { key: "employment", name: "Formato 1003", group: "Formatos oficiales", ats: true, photo: true, description: "El formato clásico de solicitud de empleo con datos personales, estudios, experiencia y referencias." },
  { key: "ats", name: "ATS Profesional", group: "Compatibles con ATS", ats: true, photo: true, description: "Una columna y títulos estándar: la opción más segura para portales de empleo y empresas grandes." },
  { key: "minimal", name: "Minimalista", group: "Compatibles con ATS", ats: true, photo: false, description: "Limpia y directa, sin adornos. Ideal cuando quieres que el contenido hable por sí solo." },
  { key: "compact", name: "Compacta", group: "Compatibles con ATS", ats: true, photo: false, description: "Aprovecha el espacio para que una trayectoria amplia quepa en una o dos páginas." },
  { key: "classic", name: "Clásica", group: "Profesionales", ats: true, photo: false, description: "Tipografía con serifa y estilo sobrio, para sectores tradicionales como el jurídico o el financiero." },
  { key: "corporate", name: "Profesional", group: "Profesionales", ats: true, photo: true, description: "Equilibrio entre diseño y lectura fácil, con espacio para foto y datos de contacto destacados." },
  { key: "executive", name: "Ejecutiva", group: "Profesionales", ats: true, photo: true, description: "Encabezado en banda oscura para perfiles con experiencia y cargos de coordinación o dirección." },
  { key: "timeline", name: "Timeline", group: "Profesionales", ats: true, photo: false, description: "Muestra tu experiencia como una línea de tiempo, fácil de recorrer de un vistazo." },
  { key: "developer", name: "Contraste", group: "Profesionales", ats: true, photo: true, description: "Fondo oscuro de alto contraste, pensado para perfiles digitales y de tecnología." },
  { key: "extensa", name: "Extensa", group: "Diseño", ats: true, photo: true, description: "Más espacio para detalles: proyectos, logros y habilidades con niveles visuales." },
  { key: "sidebar", name: "Panel lateral", group: "Diseño", ats: false, photo: true, description: "Columna lateral con foto y contacto. Muy visual, recomendable para enviar directamente a una persona." },
  { key: "creative", name: "Creativa", group: "Diseño", ats: false, photo: true, description: "Fondo con degradado para perfiles creativos. Mejor para enviar por correo que para portales con filtro ATS." },
];

export const DAFP_FAQ: FaqItem[] = [
  {
    q: "¿El Formato Único de Hoja de Vida es obligatorio?",
    a: "Lo exigen las entidades públicas para vincular servidores públicos y para celebrar contratos de prestación de servicios con el Estado (Ley 190 de 1995). Cada entidad indica si debes entregarlo firmado en papel o en PDF, o registrar la misma información en el SIGEP II.",
  },
  {
    q: "¿Qué diferencia hay con el SIGEP II?",
    a: "El SIGEP II es el sistema del Departamento Administrativo de la Función Pública donde muchas entidades piden registrar la hoja de vida en línea. La información es la misma del formato: datos personales, formación, experiencia y declaración de inhabilidades. Llenarlo primero aquí te sirve de borrador ordenado para copiarlo al sistema.",
  },
  {
    q: "¿Tengo que adjuntar certificados?",
    a: "Sí, normalmente la entidad pide los soportes de lo que declaras: diplomas o actas de grado, tarjeta profesional si aplica y certificados laborales con fechas y funciones. Revisa la lista de documentos de la convocatoria o del contrato.",
  },
  {
    q: "¿Qué pasa si declaro algo falso?",
    a: "El formato se firma bajo la gravedad del juramento (artículo 5.º de la Ley 190 de 1995). Declarar información falsa puede tener consecuencias disciplinarias y penales, así que anota solo lo que puedas demostrar.",
  },
  {
    q: "¿Puedo descargarlo en Word?",
    a: "Sí. Puedes descargarlo en PDF, listo para imprimir y firmar, o en Word si la entidad te pide un archivo editable.",
  },
];

export const FORMAT_1003_FAQ: FaqItem[] = [
  {
    q: "¿Por qué le dicen hoja de vida Minerva?",
    a: "Porque durante años el formato 1003 se compraba impreso en las papelerías, y una de las ediciones más conocidas era la de esa editorial. Hoy “hoja de vida Minerva” y “formato 1003” se usan casi como sinónimos. ProSolutions no tiene relación con esa marca: ofrecemos una versión digital gratuita del mismo tipo de formato.",
  },
  {
    q: "¿Para qué trabajos se usa?",
    a: "Es muy común en empleos operativos, de comercio, servicios, construcción, seguridad, logística y atención al cliente, y en empresas que reciben hojas de vida en papel. Para portales de empleo o empresas grandes suele funcionar mejor una plantilla compatible con ATS.",
  },
  {
    q: "¿Lleva foto?",
    a: "El formato tiene un espacio para foto tipo documento, con fondo claro y de frente. En el editor puedes subirla, elegir su forma y encuadrarla, o dejarla sin foto si la empresa no la pide.",
  },
  {
    q: "¿Qué referencias debo poner?",
    a: "Normalmente una o dos referencias laborales (jefes o compañeros) y una o dos personales o familiares, con nombre, relación y teléfono. Avísales antes de que puedan llamarlos.",
  },
  {
    q: "¿Puedo imprimirlo?",
    a: "Sí. Lo descargas en PDF (tamaño A4), listo para imprimir y firmar, o en Word si necesitas editarlo después.",
  },
];
