export type CVTemplateGroup = "professional" | "ats" | "design";

export const CV_TEMPLATE_GROUPS: Array<{ id: CVTemplateGroup; label: string; description: string }> = [
  {
    id: "professional",
    label: "Profesionales",
    description: "Diseños versátiles para presentar tu experiencia con una identidad profesional.",
  },
  {
    id: "ats",
    label: "ATS",
    description: "Diseños de lectura sencilla, estructurados para sistemas de seguimiento de candidatos.",
  },
  {
    id: "design",
    label: "Diseños visuales",
    description: "Diseños avanzados con una presentación visual más distintiva.",
  },
];

export interface CVTemplateOption {
  key: string;
  label: string;
  category: "modern" | "corporate" | "design" | "traditional" | "ats";
  group: CVTemplateGroup;
  supportsPhoto: boolean;
  atsFriendly: boolean;
}

export const CURATED_CV_TEMPLATES: CVTemplateOption[] = [
  { key: "sidebar", label: "Panel lateral", category: "modern", group: "professional", supportsPhoto: true, atsFriendly: false },
  { key: "minimal", label: "Minimalista", category: "modern", group: "ats", supportsPhoto: false, atsFriendly: true },
  { key: "ats", label: "ATS Profesional", category: "ats", group: "ats", supportsPhoto: true, atsFriendly: true },
  { key: "corporate", label: "Profesional", category: "corporate", group: "professional", supportsPhoto: true, atsFriendly: true },
  { key: "developer", label: "Contraste", category: "modern", group: "professional", supportsPhoto: true, atsFriendly: true },
  { key: "creative", label: "Creativa", category: "design", group: "professional", supportsPhoto: true, atsFriendly: false },
  { key: "classic", label: "Clásica", category: "traditional", group: "professional", supportsPhoto: false, atsFriendly: true },
  { key: "executive", label: "Ejecutiva", category: "corporate", group: "design", supportsPhoto: true, atsFriendly: true },
  { key: "extensa", label: "Extensa", category: "traditional", group: "design", supportsPhoto: true, atsFriendly: true },
  { key: "timeline", label: "Timeline", category: "modern", group: "professional", supportsPhoto: false, atsFriendly: true },
  { key: "compact", label: "Compacta", category: "ats", group: "ats", supportsPhoto: false, atsFriendly: true },
  { key: "employment", label: "Formato 1003", category: "traditional", group: "professional", supportsPhoto: true, atsFriendly: true },
  { key: "dafp", label: "Función Pública (DAFP)", category: "traditional", group: "professional", supportsPhoto: false, atsFriendly: true },
];
