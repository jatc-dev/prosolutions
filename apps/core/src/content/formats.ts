/**
 * Public landing pages for the CV formats people search for in Colombia
 * (Formato Único de Función Pública, formato 1003) and the template gallery.
 * Each one links to the ProCV editor with the template already selected.
 */

export const FORMAT_PAGES_UPDATED = "2026-11-26";

export interface FaqItem {
  q: string;
  a: string;
}

export interface TemplateCard {
  key: string;
  name: string;
  description: string;
  /** Kept for the cards: every template is ATS-readable (the PDF carries its text). */
  ats: boolean;
  photo: boolean;
  group: "Clásicas y sencillas" | "Profesionales" | "Diseños visuales" | "Formatos oficiales";
}

/**
 * Same keys, names and groups as the ProCV catalog
 * (apps/procv/frontend/src/utils/templateCatalog.ts; a test keeps them in
 * sync). Preview images: apps/core/public/plantillas/<key>.webp, generated
 * with apps/procv/frontend/scripts/template-previews.mjs.
 */
export const TEMPLATE_CARDS: TemplateCard[] = [
  { key: "minimal", name: "Minimalista", group: "Clásicas y sencillas", ats: true, photo: false, description: "Limpia y directa, sin adornos. Ideal cuando quieres que el contenido hable por sí solo." },
  { key: "ats", name: "Estándar", group: "Clásicas y sencillas", ats: true, photo: true, description: "El formato clásico de procesador de texto: foto opcional, contacto en dos columnas y títulos en franja gris." },
  { key: "cronologica", name: "Cronológica", group: "Clásicas y sencillas", ats: true, photo: true, description: "Fechas en su propia columna y experiencia de la más reciente a la más antigua: la más usada en Latinoamérica." },
  { key: "harvard", name: "Harvard", group: "Clásicas y sencillas", ats: true, photo: false, description: "Académica y sobria, con tipografía con serifa y la educación primero. Ideal para estudiantes, docentes e investigadores." },
  { key: "classic", name: "Clásica", group: "Clásicas y sencillas", ats: true, photo: false, description: "Tipografía con serifa y estilo sobrio, para sectores tradicionales como el jurídico o el financiero." },
  { key: "compact", name: "Compacta", group: "Clásicas y sencillas", ats: true, photo: false, description: "Aprovecha el espacio para que una trayectoria amplia quepa en una o dos páginas." },
  { key: "primer-empleo", name: "Primer empleo", group: "Clásicas y sencillas", ats: true, photo: true, description: "Pone estudios, habilidades e idiomas antes que la experiencia: pensada para tu primer trabajo o tus prácticas." },
  { key: "competencias", name: "Por competencias", group: "Clásicas y sencillas", ats: true, photo: true, description: "Tus competencias clave primero, en un recuadro destacado. Útil al cambiar de sector o tras una pausa laboral." },
  { key: "corporate", name: "Profesional", group: "Profesionales", ats: true, photo: true, description: "Equilibrio entre diseño y lectura fácil, con el perfil destacado y espacio para foto y contacto." },
  { key: "moderna", name: "Moderna", group: "Profesionales", ats: true, photo: true, description: "Nombre grande y títulos con barra de color: actual sin perder sobriedad." },
  { key: "elegante", name: "Elegante", group: "Profesionales", ats: true, photo: true, description: "Encabezado centrado y tipografía distinguida, para cargos de atención, ventas o dirección." },
  { key: "europea", name: "Europea", group: "Profesionales", ats: true, photo: true, description: "Títulos en una columna a la izquierda y detalles a la derecha, al estilo de los formatos europeos." },
  { key: "dos-columnas", name: "Dos columnas", group: "Profesionales", ats: true, photo: true, description: "Experiencia y educación a la izquierda; habilidades, idiomas y certificados en una columna lateral." },
  { key: "timeline", name: "Timeline", group: "Profesionales", ats: true, photo: false, description: "Muestra tu experiencia como una línea de tiempo, fácil de recorrer de un vistazo." },
  { key: "sidebar", name: "Panel lateral", group: "Diseños visuales", ats: true, photo: true, description: "Panel de color con foto y contacto, muy visual." },
  { key: "executive", name: "Ejecutiva", group: "Diseños visuales", ats: true, photo: true, description: "Banda superior de color para perfiles con experiencia y cargos de coordinación o dirección." },
  { key: "extensa", name: "Extensa", group: "Diseños visuales", ats: true, photo: true, description: "Encabezado centrado y títulos en etiquetas de color, con espacio para trayectorias largas." },
  { key: "developer", name: "Contraste", group: "Diseños visuales", ats: true, photo: true, description: "Fondo oscuro de alto contraste, pensado para perfiles digitales y de tecnología." },
  { key: "creative", name: "Creativa", group: "Diseños visuales", ats: true, photo: true, description: "Fondo con degradado para perfiles creativos y de comunicación." },
  { key: "employment", name: "Formato 1003", group: "Formatos oficiales", ats: true, photo: true, description: "El formato clásico de solicitud de empleo con datos personales, estudios, experiencia y referencias." },
  { key: "dafp", name: "Función Pública (DAFP)", group: "Formatos oficiales", ats: true, photo: false, description: "Formato Único de Hoja de Vida para entidades públicas y contratistas del Estado." },
];

export const DAFP_FAQ: FaqItem[] = [
  {
    q: "¿Dónde descargo el formato único de hoja de vida en blanco?",
    a: "El Departamento Administrativo de la Función Pública publica el formato oficial en su sitio web. Aquí no necesitas descargarlo en blanco: lo llenas en línea, con tus datos ordenados por secciones, y descargas el resultado en PDF para imprimir y firmar, o en Word si la entidad te pide un archivo editable.",
  },
  {
    q: "¿El formato único de hoja de vida lleva foto?",
    a: "No. El Formato Único de Hoja de Vida – Persona Natural no tiene casilla para foto. Si una entidad te pide una hoja de vida con foto además del formato, puedes hacerla con cualquiera de las otras plantillas.",
  },
  {
    q: "¿Cuál es la diferencia entre persona natural y persona jurídica?",
    a: "El formato de persona natural es el que llenas tú como individuo, para un empleo público o un contrato de prestación de servicios. Las empresas y entidades que contratan con el Estado usan el formato de persona jurídica, que pide los datos de la organización y de su representante legal. Esta guía y la plantilla son para persona natural.",
  },
  {
    q: "¿En qué orden se registra la experiencia laboral?",
    a: "Empezando por el empleo o contrato actual (o el último) y siguiendo hacia atrás, con fechas de ingreso y retiro que coincidan con tus certificados laborales.",
  },
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
