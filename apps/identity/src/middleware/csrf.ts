import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

let csrfToken: string | null = null;

export function generateCSRFMid(req: Request, res: Response, next: NextFunction) {
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = csrfToken;
  next();
}

export function getCSRFToken(req: Request, res: Response) {
  res.json({ csrfToken: csrfToken || '' });
}

export function validateCSRF(req: Request, res: Response, next: NextFunction) {
  const method = (req.method || 'GET').toUpperCase();
  const isSafe = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

  if (isSafe) {
    return next();
  }

  const tokenFromHeader = req.headers['x-csrf-token'] as string | undefined;
  const tokenFromBody = (req.body as { _csrf?: string })?._csrf;

  const clientToken = tokenFromHeader || tokenFromBody;

  if (!clientToken || clientToken !== csrfToken) {
    return res.status(403).json({ message: 'CSRF token mismatch' });
  }

  next();
}

export { csrfToken };
