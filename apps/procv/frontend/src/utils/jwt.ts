interface JwtPayload {
  exp?: number;
  sub?: string;
  iat?: number;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): number | null {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return null;
  return decoded.exp * 1000;
}

export function getTimeUntilExpiry(token: string): number {
  const expiry = getTokenExpiry(token);
  if (!expiry) return 0;
  return expiry - Date.now();
}

export function isTokenExpired(token: string): boolean {
  const timeLeft = getTimeUntilExpiry(token);
  return timeLeft <= 0;
}

export function isTokenExpiringSoon(token: string, thresholdMs = 60000): boolean {
  const timeLeft = getTimeUntilExpiry(token);
  return timeLeft > 0 && timeLeft <= thresholdMs;
}
