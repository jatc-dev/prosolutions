import { PROJOBS_API_URL } from "./env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/** Typed fetch against the ProJobs API with uniform error handling. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${PROJOBS_API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network_error", "No pudimos conectar con ProJobs. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiError(response.status, error.code ?? "http_error", error.message ?? `Error ${response.status}`, error.details);
  }
  return payload as T;
}

/** Spanish, user-facing message for known API error codes. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  const messages: Record<string, string> = {
    already_applied: "Ya te postulaste a esta vacante.",
    job_not_open: "Esta vacante ya no recibe postulaciones.",
    procv_access_required: "Tu cuenta no tiene acceso a ProCV todavía.",
    procv_unavailable: "ProCV no está disponible en este momento. Inténtalo en unos minutos.",
    module_required: "Tu cuenta no tiene acceso a ProJobs.",
    recruiter_required: "Necesitas acceso de reclutador para usar el panel de empresa.",
    rate_limited: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
    application_closed: "Esta postulación ya no se puede retirar.",
    application_withdrawn: "El candidato retiró su postulación.",
    job_incomplete: "Completa la descripción (mínimo 50 caracteres) antes de publicar.",
    unauthorized: "Tu sesión expiró. Vuelve a iniciar sesión.",
    network_error: error.message,
  };
  return messages[error.code] ?? error.message;
}
