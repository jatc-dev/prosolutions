import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.identityUrl,
      audience: 'procv-api',
    }) as {
      sub: string;
      email?: string;
      role?: string;
      modules?: string[];
    };

    req.userId = payload.sub;
    req.email = payload.email;
    req.role = payload.role;
    req.modules = payload.modules;

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
