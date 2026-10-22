const DEFAULT_IDENTITY_AUTH_API = "https://identity.prosolutions.page/api/auth";

/**
 * Normalizes VITE_IDENTITY_API_URL to the auth API base (`.../api/auth`).
 * Accepts accidental suffixes such as `/login` or `/me` from older env files.
 */
export function identityAuthApiUrl(raw = import.meta.env.VITE_IDENTITY_API_URL): string {
  const value = (raw || DEFAULT_IDENTITY_AUTH_API).trim();
  if (!value) {
    return DEFAULT_IDENTITY_AUTH_API;
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
