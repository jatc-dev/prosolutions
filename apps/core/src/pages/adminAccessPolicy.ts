export type AdminAccessState = "loading" | "authorized" | "denied" | "error";
export type AccessFailure = "denied" | "session-expired" | "error";

export const USER_READ_PERMISSION = "identity.users.read";
export const USER_MANAGE_PERMISSION = "identity.users.manage";

export class SessionExpiredError extends Error {
  constructor() {
    super("La sesión expiró. Inicia sesión de nuevo.");
    this.name = "SessionExpiredError";
  }
}

export function hasPermission(permissions: unknown, permission: string): boolean {
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function accessFailureForStatus(status: number): AccessFailure {
  if (status === 401) return "session-expired";
  if (status === 403) return "denied";
  return "error";
}

export function adminUsersEndpoint(permissions: unknown, query: string): string | null {
  return hasPermission(permissions, USER_READ_PERMISSION) ? `/api/admin/users?${query}` : null;
}

export async function requestAdminUsers(
  permissions: unknown,
  query: string,
  request: (_endpoint: string) => Promise<Response>,
): Promise<Response | null> {
  const endpoint = adminUsersEndpoint(permissions, query);
  return endpoint ? request(endpoint) : null;
}

export function expireAdminSession(removeToken: () => void, navigateToLogin: () => void): void {
  removeToken();
  navigateToLogin();
}

export async function retryUnauthorizedResponse(
  send: (_afterRefresh: boolean) => Promise<Response>,
  refreshSession: () => Promise<unknown>,
): Promise<Response> {
  let response = await send(false);
  if (response.status === 401) {
    await refreshSession();
    response = await send(true);
  }
  if (response.status === 401) throw new SessionExpiredError();
  return response;
}

export type ModuleMutationResult =
  | { kind: "success" }
  | { kind: "denied"; response: Response }
  | { kind: "session-expired"; response: Response }
  | { kind: "error"; response: Response };

export async function performModuleMutation(
  request: () => Promise<Response>,
  onSuccess: () => Promise<void> | void,
): Promise<ModuleMutationResult> {
  const response = await request();
  const failure = accessFailureForStatus(response.status);
  if (failure === "denied") return { kind: "denied", response };
  if (failure === "session-expired") return { kind: "session-expired", response };
  if (!response.ok) return { kind: "error", response };
  await onSuccess();
  return { kind: "success" };
}

export function errorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof TypeError) return "Error de red. Comprueba tu conexión e inténtalo de nuevo.";
  return reason instanceof Error ? reason.message : fallback;
}
