import { Request, Response, NextFunction } from 'express';
import { AuthRequest, authMiddleware } from './auth';

/**
 * Administrative access is resolved from ProIdentity's live permission set.
 * A legacy JWT role claim alone is never sufficient.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await authMiddleware(req as AuthRequest, res, () => {
    const authReq = req as AuthRequest;
    if (!authReq.permissions?.includes('procv.admin.access')) {
      res.status(403).json({ message: 'ProCV administrative permission required' });
      return;
    }

    (req as any).user = {
      id: authReq.userId,
      email: authReq.email ?? '',
      role: authReq.role,
    };
    next();
  }, { allowAdminWithoutModule: true });
}

export function requireProcvPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.permissions?.includes(permission)) {
      return res.status(403).json({
        message: 'Insufficient ProCV administrative permission',
        requiredPermission: permission,
      });
    }
    return next();
  };
}
