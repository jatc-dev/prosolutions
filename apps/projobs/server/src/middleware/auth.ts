import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface ProJobsAuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

const REQUIRED_MODULE = 'PROJOBS';
const IDENTITY_REQUEST_TIMEOUT_MS = 5000;

interface IdentityUser {
  id: string;
  email?: string;
  role?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  modules?: unknown;
}

/**
 * ProIdentity is the single authority for both authentication and module
 * entitlements. ProJobs never trusts a client-decoded JWT or its own copy of
 * the module grants; it asks Identity to validate the bearer token and returns
 * current database entitlements. Failure to reach Identity fails closed.
 */
async function resolveIdentityUser(token: string): Promise<IdentityUser | null> {
  const response = await fetch(`${config.identityUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(IDENTITY_REQUEST_TIMEOUT_MS),
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`ProIdentity introspection failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('ProIdentity returned an invalid user payload');
  }

  const record = payload as Record<string, unknown>;
  const candidate = 'user' in record ? record.user : record;
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('ProIdentity returned an invalid user payload');
  }

  const user = candidate as IdentityUser;
  if (typeof user.id !== 'string' || !user.id) {
    throw new Error('ProIdentity returned an invalid user payload');
  }
  return user;
}

function getBearerToken(req: Request): string | null {
  const value = req.headers.authorization;
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token || null;
}

function applyIdentityUser(req: ProJobsAuthRequest, user: IdentityUser): void {
  req.userId = user.id;
  req.email = typeof user.email === 'string' ? user.email : undefined;
  req.role = typeof user.role === 'string' ? user.role : undefined;
  req.modules = Array.isArray(user.modules)
    ? user.modules.filter((module): module is string => typeof module === 'string')
    : [];
}

export async function proJobsAuthMiddleware(
  req: ProJobsAuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  let user: IdentityUser | null;
  try {
    user = await resolveIdentityUser(token);
  } catch {
    // Never permit personal API access when central authentication cannot be verified.
    return res.status(503).json({ message: 'Authentication service temporarily unavailable' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Invalid or expired ProIdentity session' });
  }
  if (user.isActive !== true || user.emailVerified !== true) {
    return res.status(403).json({ message: 'Active, verified ProSolutions account required' });
  }

  const modules = Array.isArray(user.modules)
    ? user.modules.filter((module): module is string => typeof module === 'string')
    : [];
  if (!modules.includes(REQUIRED_MODULE)) {
    return res.status(403).json({
      message: 'ProJobs module access required',
      requiredModule: REQUIRED_MODULE,
    });
  }

  applyIdentityUser(req, { ...user, modules });
  return next();
}

/**
 * Optional identity for public routes. Invalid or unavailable authentication
 * never grants access to protected routes; public browsing continues anonymously.
 */
export async function optionalProJobsAuth(
  req: ProJobsAuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = getBearerToken(req);
  if (!token) return next();

  try {
    const user = await resolveIdentityUser(token);
    if (
      user &&
      user.isActive === true &&
      user.emailVerified === true &&
      Array.isArray(user.modules)
    ) {
      applyIdentityUser(req, user);
    }
  } catch {
    // Optional authentication is best-effort; public browsing remains available.
  }

  return next();
}

export { REQUIRED_MODULE };
