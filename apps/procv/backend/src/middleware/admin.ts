import { Request, Response, NextFunction } from 'express';
import { verifyIdentityAccessToken } from './auth';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  let claims;
  try {
    claims = verifyIdentityAccessToken(authHeader.slice(7));
  } catch {
    return res.status(401).json({ message: 'Invalid or expired ProIdentity token' });
  }

  if (!Array.isArray(claims.modules) || !claims.modules.includes('PROCV')) {
    return res.status(403).json({ message: 'ProCV module access required' });
  }
  if (claims.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  (req as any).user = {
    id: claims.sub,
    email: claims.email || '',
    role: claims.role,
  };
  return next();
}
