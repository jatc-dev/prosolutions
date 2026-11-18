import { Response, CookieOptions } from 'express';
import { config } from '../config';

export const REFRESH_TOKEN_COOKIE_NAME = `refreshToken${config.cookieNameSuffix}`;

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
    path: '/',
  };
}

export function setRefreshTokenCookie(res: Response, refreshToken: string, rememberMe = false): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...refreshCookieOptions(),
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshCookieOptions());
}
