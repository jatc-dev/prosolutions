/**
 * Normaliza VITE_IDENTITY_API_URL a la base del API de auth (`.../api/auth`).
 * Acepta sufijos accidentales como `/login`, `/me`, etc. de env antiguos.
 */
export function identityAuthApiUrl(raw = import.meta.env.VITE_IDENTITY_API_URL): string {
  const value = (raw || "https://identity.prosolutions.page/api/auth").trim();
  if (!value) {
    return "https://identity.prosolutions.page/api/auth";
  }

  const stripped = value.replace(/\/+$/, "").replace(/\/(login|me|register|refresh|logout)$/i, "");
  if (/\/api\/auth$/i.test(stripped)) {
    return stripped;
  }

  try {
    const parsed = new URL(stripped);
    if (parsed.pathname === "" || parsed.pathname === "/") {
      return `${stripped}/api/auth`;
    }
  } catch {
    // Fall through to the stripped value.
  }

  return stripped;
}
