/** Strip accents and lowercase, mirroring the SQL function projobs_fold(). */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Build a safe prefix tsquery ("desarrollador react" -> "desarrollador:* & react:*")
 * for instant search. Only letters/digits survive, so user input can never
 * inject tsquery operators. Returns null when nothing searchable remains.
 */
export function toPrefixTsQuery(input: string): string | null {
  const terms = fold(input)
    .split(/[^a-z0-9#+]+/)
    .map((term) => term.replace(/[#+]/g, ''))
    .filter((term) => term.length > 0)
    .slice(0, 8);
  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(' & ');
}

export function slugify(value: string, maxLength = 60): string {
  const slug = fold(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || 'item';
}

/** Short, URL-safe uniqueness suffix for slugs. */
export function randomSuffix(length = 6): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
