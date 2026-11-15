import { identityAuthApiUrl } from "../lib/identityUrl";

const IDENTITY_AUTH_URL = identityAuthApiUrl();

export class RefreshRateLimitedError extends Error {
  readonly retryAfterMs: number;
  readonly status = 429;

  constructor(retryAfterMs: number) {
    super("Session refresh is temporarily rate limited.");
    this.name = "RefreshRateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

let refreshPromise: Promise<string> | null = null;
let refreshBlockedUntil = 0;

function retryAfterMs(response: Response, body: unknown): number {
  const bodySeconds =
    typeof body === "object" &&
    body !== null &&
    "retryAfterSeconds" in body &&
    typeof body.retryAfterSeconds === "number"
      ? body.retryAfterSeconds
      : 0;
  const headerValue = response.headers.get("Retry-After");
  const numericHeaderSeconds = headerValue ? Number(headerValue) : 0;
  const dateHeaderMs = headerValue ? Date.parse(headerValue) - Date.now() : 0;
  const headerSeconds = Number.isFinite(numericHeaderSeconds)
    ? numericHeaderSeconds
    : Math.max(dateHeaderMs, 0) / 1000;
  const resetValue = response.headers.get("RateLimit-Reset");
  const resetSeconds = resetValue ? Number(resetValue) : 0;
  const seconds = Math.max(
    bodySeconds,
    Number.isFinite(headerSeconds) ? headerSeconds : 0,
    Number.isFinite(resetSeconds) ? resetSeconds : 0,
    1,
  );
  return Math.ceil(seconds * 1000);
}

export function refreshAccessToken(): Promise<string> {
  const remainingBlockMs = refreshBlockedUntil - Date.now();
  if (remainingBlockMs > 0) {
    return Promise.reject(new RefreshRateLimitedError(remainingBlockMs));
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${IDENTITY_AUTH_URL}/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 429) {
        const waitMs = retryAfterMs(response, body);
        refreshBlockedUntil = Date.now() + waitMs;
        throw new RefreshRateLimitedError(waitMs);
      }
      if (!response.ok) {
        throw new Error("Session refresh failed");
      }
      const accessToken = body?.accessToken;
      if (!accessToken) {
        throw new Error("Identity did not return an access token");
      }
      return accessToken as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function resetRefreshCoordinatorForTests(): void {
  refreshBlockedUntil = 0;
  refreshPromise = null;
}
