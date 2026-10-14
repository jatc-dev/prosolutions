export interface CVTemplateOption {
  key: string;
  label: string;
  category: "modern" | "corporate" | "tech" | "design" | "traditional" | "premium" | "ats";
  supportsPhoto: boolean;
  atsFriendly: boolean;
}

export const CURATED_CV_TEMPLATES: CVTemplateOption[] = [
  { key: "sidebar", label: "Panel lateral", category: "modern", supportsPhoto: true, atsFriendly: false },
  { key: "minimal", label: "Minimalista", category: "modern", supportsPhoto: false, atsFriendly: true },
  { key: "corporate", label: "Profesional", category: "corporate", supportsPhoto: true, atsFriendly: true },
  { key: "developer", label: "Desarrollador", category: "tech", supportsPhoto: true, atsFriendly: true },
  { key: "creative", label: "Creativa", category: "design", supportsPhoto: true, atsFriendly: false },
  { key: "classic", label: "Clásica", category: "traditional", supportsPhoto: false, atsFriendly: true },
  { key: "executive", label: "Ejecutiva", category: "premium", supportsPhoto: true, atsFriendly: true },
  { key: "extensa", label: "Extensa", category: "premium", supportsPhoto: true, atsFriendly: true },
  { key: "timeline", label: "Timeline", category: "modern", supportsPhoto: false, atsFriendly: true },
  { key: "compact", label: "Compacta", category: "ats", supportsPhoto: false, atsFriendly: true },
];
