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
const INTROSPECTION_TIMEOUT_MS =
  Number(process.env.INTROSPECTION_TIMEOUT_MS) || 5000;

async function introspectSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  reason?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), INTROSPECTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.identityUrl}/api/auth/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { valid: false, reason: `introspection_${response.status}` };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { valid: false, reason: 'introspection_invalid_json' };
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).valid !== 'boolean'
    ) {
      return { valid: false, reason: 'introspection_malformed' };
    }

    return body as {
      valid: boolean;
      userId?: string;
      email?: string;
      role?: string;
      modules?: string[];
      reason?: string;
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, reason: 'introspection_timeout' };
    }
    return {
      valid: false,
      reason: `introspection_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function validateIntrospectionContract(
  introspection: { valid: boolean; userId?: string; modules?: string[]; reason?: string },
  jwtSub: string,
): { valid: boolean; reason?: string } {
  if (!introspection.valid) {
    return { valid: false, reason: introspection.reason || 'introspection_invalid' };
  }

  if (typeof introspection.userId !== 'string' || !introspection.userId.trim()) {
    return { valid: false, reason: 'introspection_missing_userid' };
  }

  if (introspection.userId !== jwtSub) {
    return { valid: false, reason: 'introspection_userid_mismatch' };
  }

  if (!Array.isArray(introspection.modules)) {
    return { valid: false, reason: 'introspection_invalid_modules' };
  }

  return { valid: true };
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
    const contract = validateIntrospectionContract(introspection, payload.sub);
    if (!contract.valid) {
      return res.status(401).json({
        message: 'Session revoked or expired',
        reason: contract.reason,
      });
    }

    const modules = introspection.modules as string[];
    if (!modules.includes(REQUIRED_MODULE)) {
      return res.status(403).json({
        message: 'ProJobs module access required',
        requiredModule: REQUIRED_MODULE,
      });
    }

    req.userId = introspection.userId;
    req.email = introspection.email;
    req.role = introspection.role;
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

    if (!payload.sub || !payload.jti) {
      return next();
    }

    const introspection = await introspectSession(token);
    const contract = validateIntrospectionContract(introspection, payload.sub);
    if (!contract.valid) {
      return next();
    }

    req.userId = introspection.userId;
    req.email = introspection.email;
    req.role = introspection.role;
    req.modules = introspection.modules as string[];
  } catch {
    // Ignore invalid tokens for optional auth; continue as anonymous
  }

  next();
}

export { REQUIRED_MODULE };
