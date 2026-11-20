import type { CVData, CoverLetterData } from "../../types";

/** Text between brackets is a placeholder the user must replace before sending. */
export const PLACEHOLDER_PATTERN = /\[[^\]]{3,}\]/g;

export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** "Bogotá, 19 de noviembre de 2026" (city omitted when empty). */
export function formatLetterDate(city: string | undefined, iso: string | undefined): string {
  const date = iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : todayIso();
  const [year, month, day] = date.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year!, month! - 1, day!, 12)),
  );
  return [city?.trim(), formatted].filter(Boolean).join(", ");
}

/** Whole years since the earliest experience start (YYYY-MM or YYYY-MM-DD). */
export function yearsOfExperience(experience: CVData["experience"], now = new Date()): number {
  const starts = (experience || [])
    .filter((item) => item && item.isVisible !== false && item.startDate)
    .map((item) => {
      const [year, month] = String(item.startDate).split("-").map(Number);
      return year ? new Date(Date.UTC(year, (month || 1) - 1, 1)) : null;
    })
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));
  if (!starts.length) return 0;
  const first = Math.min(...starts.map((date) => date.getTime()));
  return Math.max(0, Math.floor((now.getTime() - first) / (365.25 * 24 * 3600 * 1000)));
}

/** Drops a trailing period so "S.A.S." does not end up as "S.A.S.." in a sentence. */
const noFinalDot = (value: string) => value.trim().replace(/\.+$/, "");

function listToText(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Latest (current first, then most recent start) visible job. */
function latestJob(experience: CVData["experience"]) {
  return [...(experience || [])]
    .filter((item) => item && item.isVisible !== false && (item.position || item.company))
    .sort((a, b) => Number(b.isCurrentPosition) - Number(a.isCurrentPosition) || String(b.startDate).localeCompare(String(a.startDate)))[0];
}

export function defaultGreeting(letter: CoverLetterData): string {
  const name = letter.recipientName?.trim();
  return name ? `Estimado(a) ${name}:` : "Apreciado equipo de selección:";
}

/**
 * First draft built only from the CV (no AI, nothing leaves the browser).
 * The third paragraph is a bracketed placeholder: why this company is the part
 * that convinces a recruiter, and only the candidate can write it.
 */
export function buildCoverLetterDraft(cv: CVData, letter: CoverLetterData = {}, now = new Date()): string {
  const title = cv.personal?.professionalTitle?.trim();
  const position = noFinalDot(letter.position?.trim() || title || "[cargo al que aplicas]");
  const company = letter.company?.trim() ? noFinalDot(letter.company) : undefined;
  const companyRef = company || "su empresa";
  const years = yearsOfExperience(cv.experience, now);
  const job = latestJob(cv.experience);
  const skills = (cv.skills || [])
    .filter((skill) => skill && skill.isVisible !== false && skill.name?.trim())
    .slice(0, 3)
    .map((skill) => skill.name.trim());

  const profile = title ? `Soy ${title.charAt(0).toLowerCase()}${title.slice(1)}` : "Soy un(a) profesional";
  const experience =
    years >= 1 ? ` con ${years === 1 ? "más de un año" : `más de ${years} años`} de experiencia` : "";
  const current = job
    ? job.isCurrentPosition
      ? ` Actualmente me desempeño como ${noFinalDot(job.position || "parte del equipo")}${job.company ? ` en ${noFinalDot(job.company)}` : ""}.`
      : ` Mi experiencia más reciente fue como ${noFinalDot(job.position || "parte del equipo")}${job.company ? ` en ${noFinalDot(job.company)}` : ""}.`
    : "";

  const paragraphs = [
    `Me dirijo a ustedes para postularme al cargo de ${position}${company ? ` en ${company}` : ""}. ${profile}${experience}.${current}`,
    skills.length
      ? `A lo largo de mi trayectoria he fortalecido mis conocimientos en ${listToText(skills)}, y me interesa aplicarlos para aportar resultados concretos a ${companyRef}. [Menciona aquí un logro medible relacionado con el cargo, por ejemplo: "reduje en un 20 % los tiempos de respuesta a clientes".]`
      : `[Menciona aquí dos o tres fortalezas relacionadas con el cargo y un logro medible, por ejemplo: "reduje en un 20 % los tiempos de respuesta a clientes".]`,
    `[Explica por qué te interesa ${company ? company : "esta empresa"} y este cargo: algo concreto de su trabajo, sus valores o el reto del puesto.]`,
    `Adjunto mi hoja de vida para su consideración. Quedo a disposición para ampliar esta información en una entrevista.`,
  ];
  return paragraphs.join("\n\n");
}

export function letterParagraphs(body: string | undefined): string[] {
  return String(body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function wordCount(text: string | undefined): number {
  return String(text || "").split(/\s+/).filter(Boolean).length;
}

export function placeholdersIn(text: string | undefined): string[] {
  return String(text || "").match(PLACEHOLDER_PATTERN) ?? [];
}
