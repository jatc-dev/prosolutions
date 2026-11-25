import i18n from "../../shared/i18n";

/**
 * Translated UI text with its Spanish wording as the fallback. Uses the global
 * i18next instance, so it works in any component (with or without hooks); the
 * editor re-renders as a whole when the language changes.
 */
export function tx(key: string, fallback: string, values?: Record<string, unknown>): string {
  return i18n.t(key, { defaultValue: fallback, ...(values ?? {}) }) as string;
}
