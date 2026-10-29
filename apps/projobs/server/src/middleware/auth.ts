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

async function introspectSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  reason?: string;
}> {
  try {
    const response = await fetch(`${config.identityUrl}/api/auth/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { valid: false, reason: `introspection_${response.status}` };
    }

    const body = (await response.json()) as {
      valid: boolean;
      userId?: string;
      email?: string;
      role?: string;
      modules?: string[];
      reason?: string;
    };
    return body;
  } catch (error: unknown) {
    return {
      valid: false,
      reason: `introspection_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function proJobsAuthMiddleware(
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

    const introspection = await introspectSession(token);
    if (!introspection.valid) {
      return res.status(401).json({
        message: 'Session revoked or expired',
        reason: introspection.reason,
      });
    }

    const modules = Array.isArray(introspection.modules)
      ? introspection.modules
      : (Array.isArray(payload.modules) ? payload.modules : []);
    if (!modules.includes(REQUIRED_MODULE)) {
      return res.status(403).json({
        message: 'ProJobs module access required',
        requiredModule: REQUIRED_MODULE,
      });
    }

    req.userId = introspection.userId || payload.sub;
    req.email = introspection.email || payload.email;
    req.role = introspection.role || payload.role;
    req.modules = modules;

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export async function optionalProJobsAuth(
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
      const introspection = await introspectSession(token);
      if (introspection.valid) {
        req.userId = introspection.userId || payload.sub;
        req.email = introspection.email || payload.email;
        req.role = introspection.role || payload.role;
        req.modules =
          Array.isArray(introspection.modules)
            ? introspection.modules
            : (Array.isArray(payload.modules) ? payload.modules : []);
      }
    }
  } catch {
    // Ignore invalid tokens for optional auth; continue as anonymous
  }

  next();
}

export { REQUIRED_MODULE };
