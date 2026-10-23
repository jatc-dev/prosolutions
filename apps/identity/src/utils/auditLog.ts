import { logger } from './logger';

export interface AuditLogData {
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export type AuditEventType =
  | 'authentication.login_success'
  | 'authentication.login_failed'
  | 'authentication.login_unverified'
  | 'authentication.register_success'
  | 'authentication.logout'
  | 'authentication.refresh_success'
  | 'authentication.refresh_failed'
  | 'authentication.password_reset_requested'
  | 'authentication.password_reset_success'
  | 'authentication.email_verified'
  | 'authentication.verification_resent'
  | 'authentication.profile_updated'
  | 'authentication.token_validated'
  | 'authorization.unauthorized_access'
  | 'authorization.module_access_denied'
  | 'authorization.module_registered'
  | 'authorization.module_updated'
  | 'authorization.module_access_granted'
  | 'authorization.module_access_revoked'
  | 'authorization.user_account_updated';

export function auditLog(eventType: AuditEventType, data: AuditLogData = {}) {
  const {
    userId,
    email,
    ipAddress,
    userAgent,
    details,
    ...eventDetails
  } = data;
  logger.info(`AUDIT: ${eventType}`, {
    eventType,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { ...eventDetails, ...(details ?? {}) },
  });
}

export function extractRequestInfo(req: { ip?: string; headers?: Record<string, unknown> }) {
  const headers = req.headers || {};
  return {
    ipAddress: (req.ip || headers['x-forwarded-for'] || headers['x-real-ip']) as string | undefined,
    userAgent: headers['user-agent'] as string | undefined,
  };
}
