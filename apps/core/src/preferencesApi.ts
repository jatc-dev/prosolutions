import { identityAuthApiUrl } from "./identityApi";

const AUTH_API = identityAuthApiUrl();
const IDENTITY_API = AUTH_API.replace(/\/api\/auth$/i, "");
const TOKEN_KEY = "pro_identity_token";

export type UserPreferences = { theme?: "light" | "dark" | "system"; locale?: "es" | "en" };

export async function getAccessToken(forceRefresh = false): Promise<string> {
  const cached = sessionStorage.getItem(TOKEN_KEY);
  if (cached && !forceRefresh) return cached;
  const response = await fetch(`${AUTH_API}/refresh`, { method: "POST", credentials: "include" });
  if (!response.ok) throw new Error("La sesión expiró. Inicia sesión de nuevo.");
  const data = await response.json();
  if (!data?.accessToken) throw new Error("Identity no devolvió un token de acceso.");
  sessionStorage.setItem(TOKEN_KEY, data.accessToken);
  return data.accessToken as string;
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${IDENTITY_API}/api/csrf-token`, { credentials: "include" });
  if (!response.ok) throw new Error("No se pudo iniciar la protección CSRF.");
  const data = await response.json();
  if (!data?.csrfToken) throw new Error("Identity no devolvió el token CSRF.");
  return data.csrfToken as string;
}

export async function identityRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(method);
  let token = await getAccessToken();
  let csrf = mutating ? await getCsrfToken() : null;
  const send = (bearer: string, csrfValue: string | null) => {
    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${bearer}`);
    if (init.body) headers.set("Content-Type", "application/json");
    if (csrfValue) headers.set("X-CSRF-Token", csrfValue);
    return fetch(`${IDENTITY_API}${path}`, { ...init, credentials: "include", headers });
  };
  let response = await send(token, csrf);
  if (response.status === 401) {
    token = await getAccessToken(true);
    response = await send(token, csrf);
  }
  if (response.status === 403 && mutating) {
    csrf = await getCsrfToken();
    response = await send(token, csrf);
  }
  return response;
}

export async function loadUserPreferences(): Promise<UserPreferences> {
  const response = await identityRequest("/api/preferences/me");
  if (!response.ok) throw new Error("No se pudieron cargar las preferencias.");
  const data = await response.json();
  return (data.preferences || {}) as UserPreferences;
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<UserPreferences> {
  const response = await identityRequest("/api/preferences/me", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "No se pudieron guardar las preferencias.");
  }
  const data = await response.json();
  return (data.preferences || {}) as UserPreferences;
}
