import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface ProJobsAuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

const REQUIRED_MODULE = 'PROJOBS';

export function proJobsAuthMiddleware(
  req: ProJobsAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
    }) as {
      sub: string;
      email?: string;
      role?: string;
      modules?: string[];
      jti?: string;
    };

    if (!payload.sub) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!payload.jti) {
      return res.status(401).json({ message: 'Session token missing jti' });
    }

    req.userId = payload.sub;
    req.email = payload.email;
    req.role = payload.role;
    req.modules = payload.modules;

    const hasModuleAccess = Array.isArray(payload.modules)
      ? payload.modules.includes(REQUIRED_MODULE)
      : false;

    if (!hasModuleAccess) {
      return res.status(403).json({
        message: 'ProJobs module access required',
        requiredModule: REQUIRED_MODULE,
      });
    }

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function optionalProJobsAuth(
  req: ProJobsAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
    }) as {
      sub: string;
      email?: string;
      role?: string;
      modules?: string[];
      jti?: string;
    };

    if (payload.sub && payload.jti) {
      req.userId = payload.sub;
      req.email = payload.email;
      req.role = payload.role;
      req.modules = payload.modules;
    }
  } catch {
    // Ignore invalid tokens for optional auth; continue as anonymous
  }

  next();
}

export { REQUIRED_MODULE };
