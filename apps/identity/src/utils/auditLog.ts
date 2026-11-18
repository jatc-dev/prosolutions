import { logger } from './logger';
import prisma from '../prismaClient';

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
  | 'authentication.oauth_login'
  | 'authentication.oauth_failed'
  | 'account.preferences_updated'
  | 'account.consent_granted'
  | 'account.consent_revoked'
  | 'account.data_exported'
  | 'account.deleted'
  | 'authentication.token_validated'
  | 'authentication.session_revoked'
  | 'authentication.other_sessions_revoked'
  | 'authorization.unauthorized_access'
  | 'authorization.module_access_denied'
  | 'authorization.module_access_granted'
  | 'authorization.module_access_revoked'
  | 'maintenance.sessions_purged';

/**
 * High-volume events stay in the application log only; everything else is a
 * security-relevant event that is also persisted to the AuditLog table.
 */
const LOG_ONLY_EVENTS = new Set<AuditEventType>([
  'authentication.token_validated',
  'authentication.refresh_success',
]);

function shouldPersist(eventType: AuditEventType): boolean {
  if (LOG_ONLY_EVENTS.has(eventType)) return false;
  if (process.env.AUDIT_LOG_PERSIST === 'false') return false;
  // Unit tests run without a database unless they opt in explicitly.
  const underTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
  if (underTest && process.env.AUDIT_LOG_PERSIST !== 'true') return false;
  return true;
}

function resourceOf(eventType: AuditEventType): string {
  return eventType.split('.')[0];
}

export function auditLog(eventType: AuditEventType, data: AuditLogData = {}) {
  logger.info(`AUDIT: ${eventType}`, {
    eventType,
    userId: data.userId,
    email: data.email,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: data.details,
  });

  if (!shouldPersist(eventType)) return;

  const { userId, email, ipAddress, userAgent, details, ...rest } = data;
  void prisma.auditLog
    .create({
      data: {
        userId: typeof userId === 'string' ? userId : null,
        action: eventType,
        resource: resourceOf(eventType),
        resourceId: typeof rest.resourceId === 'string' ? rest.resourceId : null,
        details: JSON.parse(JSON.stringify({ ...(details ?? {}), ...rest, ...(email ? { email } : {}) })),
        ipAddress: typeof ipAddress === 'string' ? ipAddress.slice(0, 120) : null,
        userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 500) : null,
      },
    })
    .catch((error: unknown) => {
      logger.warn('Failed to persist audit event', {
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

export function extractRequestInfo(req: { ip?: string; headers?: Record<string, unknown> }) {
  const headers = req.headers || {};
  return {
    ipAddress: (req.ip || headers['x-forwarded-for'] || headers['x-real-ip']) as string | undefined,
    userAgent: headers['user-agent'] as string | undefined,
  };
}
