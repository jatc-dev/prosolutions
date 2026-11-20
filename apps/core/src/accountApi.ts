import { getAccessToken, identityRequest } from "./preferencesApi";

/**
 * Personal-data rights across the ecosystem (Ley 1581 de 2012 / GDPR):
 * consents live in ProIdentity; export and erasure fan out to every module
 * that stores user data (ProCV, ProJobs) and finish in ProIdentity.
 */

const trimSlash = (value: string) => value.replace(/\/+$/, "");
const PROCV_API = trimSlash(import.meta.env.VITE_PROCV_API_BASE_URL || "https://procv-api.onrender.com/api");
const PROJOBS_API = trimSlash(import.meta.env.VITE_PROJOBS_API_URL || "https://projobs-api-0clw.onrender.com");

export type ConsentPurpose = "privacy_policy" | "marketing_emails" | "job_alert_emails";

export interface ConsentStatus {
  purpose: ConsentPurpose;
  required: boolean;
  currentVersion: string;
  granted: boolean;
  version: string | null;
  decidedAt: string | null;
  actionRequired: boolean;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { message?: string }).message || fallbackMessage);
  return body as T;
}

export async function loadAccountEmail(): Promise<string | null> {
  const response = await identityRequest("/api/auth/me");
  const body = await readJson<{ user?: { email?: string }; email?: string }>(response, "No se pudo cargar tu cuenta.");
  return body.user?.email ?? body.email ?? null;
}

export async function loadConsents(): Promise<ConsentStatus[]> {
  const body = await readJson<{ consents: ConsentStatus[] }>(await identityRequest("/api/account/consents"), "No se pudieron cargar tus autorizaciones.");
  return body.consents;
}

export async function setConsent(purpose: ConsentPurpose, granted: boolean): Promise<ConsentStatus[]> {
  const response = await identityRequest(`/api/account/consents/${purpose}`, {
    method: "PUT",
    body: JSON.stringify({ granted }),
  });
  return (await readJson<{ consents: ConsentStatus[] }>(response, "No se pudo guardar tu decisión.")).consents;
}

async function moduleFetch(url: string, init: RequestInit = {}, csrfUrl?: string): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (csrfUrl) {
    const csrf = await fetch(csrfUrl, { credentials: "include" }).then((r) => r.json()).catch(() => null);
    if (csrf?.csrfToken) headers.set("X-CSRF-Token", csrf.csrfToken);
  }
  return fetch(url, { ...init, headers, credentials: "include" });
}

/** One JSON file with everything the platform stores about the user. */
export async function exportAllData(): Promise<Blob> {
  const [identity, procv, projobs] = await Promise.all([
    identityRequest("/api/account/export").then((r) => readJson<unknown>(r, "ProIdentity no pudo exportar tus datos.")),
    moduleFetch(`${PROCV_API}/me/export`).then((r) => readJson<unknown>(r, "ProCV no pudo exportar tus datos.")),
    moduleFetch(`${PROJOBS_API}/api/me/export`).then((r) => readJson<unknown>(r, "ProJobs no pudo exportar tus datos.")),
  ]);
  const document = { platform: "ProSolutions", exportedAt: new Date().toISOString(), proidentity: identity, procv, projobs };
  return new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
}

/**
 * Erase module data first (it needs a valid session), then the account.
 * Stops at the first failure so the account is never deleted while module
 * data remains.
 */
export async function deleteAccountEverywhere(input: { confirmEmail: string; password: string }): Promise<void> {
  await readJson(await moduleFetch(`${PROJOBS_API}/api/me`, { method: "DELETE" }), "ProJobs no pudo eliminar tus datos. No se borró la cuenta.");
  await readJson(
    await moduleFetch(`${PROCV_API}/me`, { method: "DELETE" }, `${PROCV_API}/csrf-token`),
    "ProCV no pudo eliminar tus datos. No se borró la cuenta.",
  );
  await readJson(
    await identityRequest("/api/account", { method: "DELETE", body: JSON.stringify(input) }),
    "No se pudo eliminar la cuenta.",
  );
  sessionStorage.removeItem("pro_identity_token");
}
