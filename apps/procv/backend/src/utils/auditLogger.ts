import { withUserContext } from '../dbContext';
import { logger } from './logger';

interface AuditLogData {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/** Writes module-local audit events using the stable ProIdentity subject. */
export class AuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    try {
      await withUserContext(data.actorId, tx =>
        tx.auditLog.create({
          data: {
            userId: data.actorId,
            action: data.action,
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            details: data.details ? JSON.stringify(data.details) : undefined,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        }),
      );
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static async logAdminAction(
    actorId: string,
    _actorEmail: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, any>,
    req?: any,
  ): Promise<void> {
    await this.log({
      actorId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}
