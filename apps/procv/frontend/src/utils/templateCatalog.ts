export type CVTemplateGroup = "professional" | "ats" | "premium";

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
    id: "premium",
    label: "Premium",
    description: "Diseños avanzados con una presentación visual más distintiva.",
  },
];

export interface CVTemplateOption {
  key: string;
  label: string;
  category: "modern" | "corporate" | "tech" | "design" | "traditional" | "premium" | "ats";
  group: CVTemplateGroup;
  supportsPhoto: boolean;
  atsFriendly: boolean;
}

export const CURATED_CV_TEMPLATES: CVTemplateOption[] = [
  { key: "sidebar", label: "Panel lateral", category: "modern", group: "professional", supportsPhoto: true, atsFriendly: false },
  { key: "minimal", label: "Minimalista", category: "modern", group: "ats", supportsPhoto: false, atsFriendly: true },
  { key: "ats", label: "ATS Profesional", category: "ats", group: "ats", supportsPhoto: false, atsFriendly: true },
  { key: "corporate", label: "Profesional", category: "corporate", group: "professional", supportsPhoto: true, atsFriendly: true },
  { key: "developer", label: "Desarrollador", category: "tech", group: "professional", supportsPhoto: true, atsFriendly: true },
  { key: "creative", label: "Creativa", category: "design", group: "professional", supportsPhoto: true, atsFriendly: false },
  { key: "classic", label: "Clásica", category: "traditional", group: "professional", supportsPhoto: false, atsFriendly: true },
  { key: "executive", label: "Ejecutiva", category: "premium", group: "premium", supportsPhoto: true, atsFriendly: true },
  { key: "extensa", label: "Extensa", category: "premium", group: "premium", supportsPhoto: true, atsFriendly: true },
  { key: "timeline", label: "Timeline", category: "modern", group: "professional", supportsPhoto: false, atsFriendly: true },
  { key: "compact", label: "Compacta", category: "ats", group: "ats", supportsPhoto: false, atsFriendly: true },
  { key: "employment", label: "Solicitud de empleo", category: "traditional", group: "professional", supportsPhoto: true, atsFriendly: true },
];
