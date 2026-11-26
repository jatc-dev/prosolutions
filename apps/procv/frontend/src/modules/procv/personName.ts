/**
 * Names are entered as "Nombres" and "Apellidos"; the CV shows them joined
 * (fullName, unchanged for every template) and the DAFP form prints given
 * names, first and second surname separately.
 */

// Particles that belong to the next word of a surname ("De la Hoz", "Del Castillo").
const PARTICLES = new Set(["de", "del", "la", "las", "los", "y", "da", "das", "do", "dos", "van", "von", "di", "san"]);

const clean = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** Groups particles with the following word: "de la Hoz Pérez" → ["de la Hoz", "Pérez"]. */
function nameParts(value: string): string[] {
  const words = clean(value).split(" ").filter(Boolean);
  const parts: string[] = [];
  let pending: string[] = [];
  for (const word of words) {
    if (PARTICLES.has(word.toLowerCase())) {
      pending.push(word);
      continue;
    }
    parts.push([...pending, word].join(" "));
    pending = [];
  }
  if (pending.length) {
    if (parts.length) parts[parts.length - 1] += ` ${pending.join(" ")}`;
    else parts.push(pending.join(" "));
  }
  return parts;
}

export function composeFullName(firstName: unknown, lastName: unknown): string {
  return [clean(firstName), clean(lastName)].filter(Boolean).join(" ");
}

/**
 * Best guess for CVs saved with only a full name: one name and one surname,
 * one name and two surnames ("Juan Pérez Gómez"), or two names and the rest
 * as surnames. Joining the result gives back the same full name.
 */
export function splitFullName(fullName: unknown): { firstName: string; lastName: string } {
  const parts = nameParts(clean(fullName));
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  const given = parts.length >= 4 ? 2 : 1;
  return { firstName: parts.slice(0, given).join(" "), lastName: parts.slice(given).join(" ") };
}

/** Names as entered, or split from the full name of older CVs. */
export function personNames(personal: { firstName?: string; lastName?: string; fullName?: string } | undefined) {
  const names = formNames(personal ?? {});
  return { firstName: clean(names.firstName), lastName: clean(names.lastName) };
}

/** "Pérez Gómez" → first "Pérez", second "Gómez"; "De la Hoz" stays one surname. */
export function splitSurnames(lastName: unknown): { first: string; second: string } {
  const parts = nameParts(clean(lastName));
  return { first: parts[0] ?? "", second: parts.slice(1).join(" ") };
}

/**
 * Values for the form inputs: what the person typed (spaces included while
 * typing), unless the full name was changed elsewhere (e.g. an imported CV),
 * in which case it is split again from the full name.
 */
export function formNames(personal: { firstName?: string; lastName?: string; fullName?: string }) {
  const typed = personal.firstName !== undefined || personal.lastName !== undefined;
  if (typed && composeFullName(personal.firstName, personal.lastName) === clean(personal.fullName)) {
    return { firstName: personal.firstName ?? "", lastName: personal.lastName ?? "" };
  }
  return splitFullName(personal.fullName);
}
