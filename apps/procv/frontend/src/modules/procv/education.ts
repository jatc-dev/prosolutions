/**
 * How an education entry is shown, and the extra data of the Colombian
 * public-sector form (Formato Único de Hoja de Vida, Función Pública).
 */

/** Academic modality codes of the official form (as used in filled-in forms of national entities). */
export const DAFP_MODALITIES: Array<{ value: string; label: string }> = [
  { value: "TC", label: "TC — Técnica" },
  { value: "TL", label: "TL — Tecnológica" },
  { value: "TE", label: "TE — Tecnológica especializada" },
  { value: "UN", label: "UN — Universitaria" },
  { value: "ES", label: "ES — Especialización" },
  { value: "MG", label: "MG — Maestría o magíster" },
  { value: "DOC", label: "DOC — Doctorado" },
];

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Title shown on the CV: the programme the person wrote ("Administración de
 * empresas"), or the type of studies when there is none. Showing only the
 * type ("Pregrado/Licenciatura") lost the actual title.
 */
export function educationTitle(item: { degree?: string; fieldOfStudy?: string }, degreeLabel: (degree?: string) => string): string {
  return clean(item.fieldOfStudy) || degreeLabel(item.degree);
}

/** Modality when the person did not pick one: only the unambiguous types. */
export function inferDafpModality(degreeType: unknown): string {
  switch (degreeType) {
    case "bachelor":
      return "UN";
    case "master":
      return "MG";
    case "doctorate":
    case "post-doctorate":
      return "DOC";
    default:
      return "";
  }
}

/** "SÍ"/"NO" for the official form: chosen by the person, or from the dates. */
export function dafpGraduated(item: { dafpGraduated?: string; isCurrentlyStudying?: boolean; endDate?: string }): string {
  if (item.dafpGraduated === "yes") return "SÍ";
  if (item.dafpGraduated === "no") return "NO";
  if (item.isCurrentlyStudying) return "NO";
  return clean(item.endDate) ? "SÍ" : "";
}
