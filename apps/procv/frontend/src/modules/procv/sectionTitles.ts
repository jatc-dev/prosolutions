/**
 * Section titles shown on the CV. Every template used to name the same
 * section differently ("Perfil", "Resumen", "Sobre mí", "Perfil profesional"…);
 * now they all share these names, and the user can rename any of them
 * (settings.sectionTitles). The official forms (1003, DAFP) keep their
 * fixed headings.
 */
export type SectionTitleKey = "summary" | "experience" | "education" | "skills" | "languages" | "certificates" | "links" | "references";

export const SECTION_TITLE_KEYS: SectionTitleKey[] = ["summary", "experience", "education", "skills", "languages", "certificates", "links", "references"];

export const DEFAULT_SECTION_TITLES: Record<SectionTitleKey, string> = {
  summary: "Perfil profesional",
  experience: "Experiencia laboral",
  education: "Educación",
  skills: "Habilidades",
  languages: "Idiomas",
  certificates: "Certificaciones",
  links: "Enlaces",
  references: "Referencias",
};

export const SECTION_TITLE_MAX_LENGTH = 40;

/** The user's title for a section, or the default one. */
export function sectionTitle(settings: unknown, key: SectionTitleKey): string {
  const custom = (settings as { sectionTitles?: Partial<Record<SectionTitleKey, unknown>> } | undefined)?.sectionTitles?.[key];
  const text = typeof custom === "string" ? custom.replace(/\s+/g, " ").trim().slice(0, SECTION_TITLE_MAX_LENGTH) : "";
  return text || DEFAULT_SECTION_TITLES[key];
}
