import prisma from '../prismaClient';
import { logger } from './logger';

export interface AuditLogData {
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.adminId,
          action: data.action,
          resourceType: data.resource,
          resourceId: data.resourceId,
          details: data.details ? JSON.stringify(data.details) : undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static async logUserAction(
    adminId: string,
    adminEmail: string,
    action: string,
    userId: string,
    details?: Record<string, any>,
    req?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      adminEmail,
      action,
      resource: 'user',
      resourceId: userId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    });
  }

  static async logAdminAction(
    adminId: string,
    adminEmail: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    req?: any,
  ): Promise<void> {
    await this.log({
      adminId,
      adminEmail,
      action,
      resource,
      resourceId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}
