import { Request, Response, NextFunction } from 'express';
import { REFRESH_TOKEN_COOKIE_NAME } from '../utils/cookies';

export function generateCSRFMid(_req: Request, res: Response, next: NextFunction) {
  res.locals.csrfToken = res.getHeader('X-CSRF-Token') || '';
  next();
}

export function getCSRFToken(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  res.json({ csrfToken: token || '' });
}

export function validateCSRF(req: Request, res: Response, next: NextFunction) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'] as string | undefined;
  const cookieToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!clientToken || !cookieToken || clientToken !== cookieToken) {
    return res.status(403).json({ message: 'CSRF token mismatch' });
  }

  next();
}
