const DEFAULT_IDLE_TIMEOUT_MINUTES = 30;
const REMEMBERED_SESSION_IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Keep the idle-session policy identical for local Identity middleware and
 * remote token introspection. Remembered sessions receive a 30-day idle
 * window; ordinary sessions use SESSION_IDLE_TIMEOUT_MINUTES (default 30).
 */
export function getSessionIdleTimeoutMs(
  rememberMe: boolean,
  configuredMinutes: string | undefined = process.env.SESSION_IDLE_TIMEOUT_MINUTES,
): number {
  if (rememberMe) return REMEMBERED_SESSION_IDLE_TIMEOUT_MS;

  const parsedMinutes = configuredMinutes === undefined ? DEFAULT_IDLE_TIMEOUT_MINUTES : Number(configuredMinutes);
  const minutes = Number.isFinite(parsedMinutes) && parsedMinutes > 0
    ? parsedMinutes
    : DEFAULT_IDLE_TIMEOUT_MINUTES;

  return minutes * 60 * 1000;
}

export function isSessionIdleExpired(
  lastAccessedAt: Date,
  rememberMe: boolean,
  now: Date = new Date(),
  configuredMinutes?: string,
): boolean {
  return now.getTime() - lastAccessedAt.getTime() > getSessionIdleTimeoutMs(rememberMe, configuredMinutes);
}
