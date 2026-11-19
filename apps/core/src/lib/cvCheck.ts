/**
 * Quick ATS checklist for a pasted CV (runs entirely in the browser; the text
 * is never sent anywhere). Transparent rules, each with an actionable tip.
 */
export interface CvCheckItem {
  id: string;
  label: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  tip: string;
}

export interface CvCheckResult {
  score: number;
  level: "bajo" | "medio" | "alto";
  words: number;
  items: CvCheckItem[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const ACTION_VERBS = [
  "lidere", "coordine", "gestione", "implemente", "disene", "desarrolle", "aumente", "reduje", "optimice", "negocie",
  "atendi", "organice", "supervise", "capacite", "logre", "mejore", "planifique", "ejecute", "vendi", "administre",
  "resolvi", "cree", "lance", "automatice", "analice", "elabore", "controle", "dirigi", "asesore", "garantice",
  "led", "managed", "built", "created", "improved", "increased", "reduced", "designed", "launched", "delivered",
];

const SECTIONS: Array<{ id: string; label: string; patterns: RegExp[] }> = [
  { id: "contact", label: "Datos de contacto (correo y teléfono)", patterns: [/[\w.+-]+@[\w-]+\.[\w.]+/, /(\+?\d[\d\s-]{6,})/] },
  { id: "summary", label: "Perfil o resumen profesional", patterns: [/\b(perfil|resumen|sobre mi|acerca de mi|summary|profile)\b/] },
  { id: "experience", label: "Experiencia laboral", patterns: [/\b(experiencia|experience|trayectoria)\b/] },
  { id: "education", label: "Educación o formación", patterns: [/\b(educacion|formacion|estudios|education)\b/] },
  { id: "skills", label: "Habilidades o competencias", patterns: [/\b(habilidades|competencias|conocimientos|skills|herramientas)\b/] },
];

export function evaluateCv(text: string, keywordsInput = ""): CvCheckResult {
  const folded = fold(text);
  const words = (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
  const items: CvCheckItem[] = [];

  // 1. Length: one or two pages ≈ 300–900 words.
  const goodLength = words >= 300 && words <= 900;
  items.push({
    id: "length",
    label: `Extensión adecuada (${words} palabras)`,
    passed: goodLength,
    points: goodLength ? 15 : words >= 180 && words <= 1200 ? 8 : 0,
    maxPoints: 15,
    tip:
      words < 300
        ? "Tu CV es muy corto: describe logros concretos en cada cargo (300 a 900 palabras es lo ideal)."
        : "Tu CV es extenso: prioriza los últimos 10 años y lo relevante para la vacante (máximo dos páginas).",
  });

  // 2. Essential sections.
  const sectionHits = SECTIONS.filter((section) => section.patterns.every((pattern) => pattern.test(folded)));
  const missingSections = SECTIONS.filter((section) => !sectionHits.includes(section));
  items.push({
    id: "sections",
    label: `Secciones esenciales (${sectionHits.length}/${SECTIONS.length})`,
    passed: missingSections.length === 0,
    points: Math.round((sectionHits.length / SECTIONS.length) * 25),
    maxPoints: 25,
    tip: missingSections.length
      ? `Agrega con títulos claros: ${missingSections.map((section) => section.label.toLowerCase()).join(", ")}.`
      : "Tus secciones tienen títulos que los ATS reconocen.",
  });

  // 3. Action verbs.
  const verbs = new Set(ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}`).test(folded)));
  const verbScore = Math.min(20, verbs.size * 4);
  items.push({
    id: "verbs",
    label: `Verbos de acción (${verbs.size} distintos)`,
    passed: verbs.size >= 5,
    points: verbScore,
    maxPoints: 20,
    tip: "Empieza cada logro con un verbo en pasado: «Coordiné», «Reduje», «Atendí», «Implementé».",
  });

  // 4. Quantified achievements.
  const metrics = (text.match(/\d+(?:[.,]\d+)?\s?(%|por ciento|clientes|personas|millones|usd|cop|\$|horas|dias|días|proyectos|ventas)/gi) ?? []).length
    + (text.match(/\$\s?\d/g) ?? []).length;
  items.push({
    id: "metrics",
    label: `Logros cuantificados (${metrics})`,
    passed: metrics >= 3,
    points: Math.min(20, metrics * 5),
    maxPoints: 20,
    tip: "Agrega cifras reales: porcentajes, montos, cantidad de clientes atendidos o tiempos reducidos.",
  });

  // 5. ATS-unfriendly patterns.
  const problems: string[] = [];
  if (/[│┃║╔╗╚╝■◆●►]/.test(text)) problems.push("símbolos decorativos o tablas dibujadas");
  if (/\b(foto|fotografia)\b/.test(folded) === false && /\b(edad|estado civil|religion)\b/.test(folded)) problems.push("datos personales innecesarios (edad, estado civil)");
  if (/\b(referencias? disponibles|referencias a solicitud)\b/.test(folded)) problems.push("frase «referencias disponibles»");
  items.push({
    id: "format",
    label: "Formato legible por ATS",
    passed: problems.length === 0,
    points: problems.length === 0 ? 10 : 4,
    maxPoints: 10,
    tip: problems.length ? `Evita: ${problems.join(", ")}.` : "No detectamos elementos que confundan a los ATS.",
  });

  // 6. Keywords from the job posting.
  const keywords = keywordsInput
    .split(/[,\n;]/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 2)
    .slice(0, 30);
  const matchedKeywords = keywords.filter((keyword) => folded.includes(fold(keyword)));
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));
  const keywordPoints = keywords.length ? Math.round((matchedKeywords.length / keywords.length) * 10) : 5;
  items.push({
    id: "keywords",
    label: keywords.length ? `Palabras clave de la vacante (${matchedKeywords.length}/${keywords.length})` : "Palabras clave de la vacante",
    passed: keywords.length > 0 && missingKeywords.length === 0,
    points: keywordPoints,
    maxPoints: 10,
    tip: keywords.length
      ? missingKeywords.length
        ? `Incluye, si son ciertas para ti: ${missingKeywords.join(", ")}.`
        : "Tu CV menciona todas las palabras clave indicadas."
      : "Pega las habilidades o requisitos de la vacante para medir la coincidencia.",
  });

  const score = Math.round(items.reduce((sum, item) => sum + item.points, 0));
  return { score, level: score >= 75 ? "alto" : score >= 50 ? "medio" : "bajo", words, items, matchedKeywords, missingKeywords };
}
