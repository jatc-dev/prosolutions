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

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), config.jwtSecret, {
      issuer: config.identityUrl,
      audience: config.identityAudience,
    }) as IdentityAdminClaims;

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!Array.isArray(decoded.modules) || !decoded.modules.includes('PROCV')) {
      return res.status(403).json({ message: 'ProCV module access required' });
    }

    (req as any).user = { id: decoded.sub, email: decoded.email ?? '', role: decoded.role };
    return next();
  } catch (error) {
    logger.warn('Admin middleware rejected an invalid Identity token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
