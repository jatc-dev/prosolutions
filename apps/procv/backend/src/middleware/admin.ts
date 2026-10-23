import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface IdentityAdminClaims {
  sub: string;
  email?: string;
  role?: string;
  modules?: string[];
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: config.identityUrl,
      audience: 'prosolutions-api',
    }) as IdentityAdminClaims;

    if (!decoded.sub) {
      return res.status(401).json({ message: 'Invalid identity subject' });
    }
    if (!Array.isArray(decoded.modules) || !decoded.modules.includes('PROCV')) {
      return res.status(403).json({ message: 'ProCV module access required' });
    }
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    (req as any).user = {
      id: decoded.sub,
      email: decoded.email ?? '',
      role: decoded.role,
    };
    return next();
  } catch (error) {
    logger.warn('Identity admin token rejected', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
