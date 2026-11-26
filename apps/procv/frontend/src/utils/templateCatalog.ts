export type CVTemplateGroup = "simple" | "professional" | "design" | "official";

/**
 * Every template is readable by applicant tracking systems (ATS): the PDF
 * carries the CV's text in reading order (pdfTextLayer.ts) and the templates
 * use standard section titles. Groups describe the look, not ATS support.
 */
export const CV_TEMPLATE_GROUPS: Array<{ id: CVTemplateGroup; label: string; description: string }> = [
  {
    id: "simple",
    label: "Clásicas y sencillas",
    description: "Una columna, sobrias y fáciles de leer. Las más seguras para cualquier empresa.",
  },
  {
    id: "professional",
    label: "Profesionales",
    description: "Con un toque de color o estructura para destacar sin perder sobriedad.",
  },
  {
    id: "design",
    label: "Diseños visuales",
    description: "Más personalidad: paneles, fondos y color.",
  },
  {
    id: "official",
    label: "Formatos oficiales",
    description: "Formatos pedidos en Colombia por empresas y entidades públicas.",
  },
];

export interface CVTemplateOption {
  key: string;
  label: string;
  category: "modern" | "corporate" | "design" | "traditional" | "ats";
  group: CVTemplateGroup;
  supportsPhoto: boolean;
  /** Always true: kept for the gallery cards. */
  atsFriendly: boolean;
  /** One line shown in the gallery and as the button tooltip. */
  hint?: string;
}

export const CURATED_CV_TEMPLATES: CVTemplateOption[] = [
  // Clásicas y sencillas
  { key: "minimal", label: "Minimalista", category: "modern", group: "simple", supportsPhoto: false, atsFriendly: true, hint: "Lo esencial, sin adornos." },
  { key: "ats", label: "Estándar", category: "ats", group: "simple", supportsPhoto: true, atsFriendly: true, hint: "El formato más usado, con foto opcional." },
  { key: "cronologica", label: "Cronológica", category: "traditional", group: "simple", supportsPhoto: true, atsFriendly: true, hint: "Fechas en su propia columna; la más común en Latinoamérica." },
  { key: "harvard", label: "Harvard", category: "traditional", group: "simple", supportsPhoto: false, atsFriendly: true, hint: "Académica y sobria; educación primero." },
  { key: "classic", label: "Clásica", category: "traditional", group: "simple", supportsPhoto: false, atsFriendly: true, hint: "Tipografía con serifa, estilo tradicional." },
  { key: "compact", label: "Compacta", category: "ats", group: "simple", supportsPhoto: false, atsFriendly: true, hint: "Aprovecha el espacio para caber en una página." },
  { key: "primer-empleo", label: "Primer empleo", category: "modern", group: "simple", supportsPhoto: true, atsFriendly: true, hint: "Estudios y habilidades antes que experiencia." },
  { key: "competencias", label: "Por competencias", category: "modern", group: "simple", supportsPhoto: true, atsFriendly: true, hint: "Habilidades primero; útil al cambiar de sector." },
  // Profesionales
  { key: "corporate", label: "Profesional", category: "corporate", group: "professional", supportsPhoto: true, atsFriendly: true, hint: "Perfil destacado y dos columnas de contenido." },
  { key: "moderna", label: "Moderna", category: "modern", group: "professional", supportsPhoto: true, atsFriendly: true, hint: "Nombre grande y títulos con acento de color." },
  { key: "elegante", label: "Elegante", category: "design", group: "professional", supportsPhoto: true, atsFriendly: true, hint: "Encabezado centrado y tipografía distinguida." },
  { key: "europea", label: "Europea", category: "corporate", group: "professional", supportsPhoto: true, atsFriendly: true, hint: "Títulos en una columna a la izquierda, estilo europeo." },
  { key: "dos-columnas", label: "Dos columnas", category: "modern", group: "professional", supportsPhoto: true, atsFriendly: true, hint: "Experiencia a la izquierda; habilidades e idiomas al lado." },
  { key: "timeline", label: "Timeline", category: "modern", group: "professional", supportsPhoto: false, atsFriendly: true, hint: "Experiencia en línea de tiempo." },
  { key: "extensa", label: "Extensa", category: "traditional", group: "professional", supportsPhoto: true, atsFriendly: true, hint: "Para trayectorias largas." },
  // Diseños visuales
  { key: "sidebar", label: "Panel lateral", category: "modern", group: "design", supportsPhoto: true, atsFriendly: true, hint: "Panel de color con tus datos de contacto." },
  { key: "executive", label: "Ejecutiva", category: "corporate", group: "design", supportsPhoto: true, atsFriendly: true, hint: "Banda superior de color." },
  { key: "developer", label: "Contraste", category: "modern", group: "design", supportsPhoto: true, atsFriendly: true, hint: "Fondo oscuro de alto contraste." },
  { key: "creative", label: "Creativa", category: "design", group: "design", supportsPhoto: true, atsFriendly: true, hint: "Degradado y estilo llamativo." },
  // Formatos oficiales
  { key: "employment", label: "Formato 1003", category: "traditional", group: "official", supportsPhoto: true, atsFriendly: true, hint: "Hoja de vida en formato 1003." },
  { key: "dafp", label: "Función Pública (DAFP)", category: "traditional", group: "official", supportsPhoto: false, atsFriendly: true, hint: "Formato único de hoja de vida para el sector público." },
];
