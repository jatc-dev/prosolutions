import { ProCVTransaction, withAdminContext, withUserContext } from '../dbContext';

interface AuditLogData {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Persist an audit event and propagate failures to the caller.
 *
 * Audit failures must not be silently converted into success. Callers that
 * require atomic business + audit writes should pass both operations through
 * the same transaction context; this helper preserves fail-closed behavior
 * until those call sites are consolidated.
 */
async function writeAuditLog(data: AuditLogData, isAdmin: boolean): Promise<void> {
  const write = async (tx: ProCVTransaction) =>
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
    });

  if (isAdmin) {
    await withAdminContext(data.actorId, write);
  } else {
    await withUserContext(data.actorId, write);
  }
}

/** Writes module-local audit events using the stable ProIdentity subject. */
export class AuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    await writeAuditLog(data, false);
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
    await writeAuditLog({
      actorId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    }, true);
  }
}
