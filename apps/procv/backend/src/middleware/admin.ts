import { Request, Response, NextFunction } from 'express';
import { AuthRequest, authMiddleware } from './auth';

/**
 * Admin routes reuse the same JWT + live ProIdentity introspection contract as
 * candidate routes, then add the admin-role requirement. This prevents revoked
 * sessions from retaining access through the separate admin router.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await authMiddleware(req as AuthRequest, res, () => {
    const authReq = req as AuthRequest;
    if (authReq.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    (req as any).user = {
      id: authReq.userId,
      email: authReq.email ?? '',
      role: authReq.role,
    };
    next();
  });
}
