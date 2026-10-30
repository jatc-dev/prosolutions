import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { withAdminContext } from '../dbContext';
import { logger } from '../utils/logger';
import { AuditLogger } from '../utils/auditLogger';
import { writeAuditLog } from '../utils/auditLogger';

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const adminUser = (req as any).user;
    const [logs, total] = await withAdminContext(adminUser.id, tx =>
      Promise.all([
        tx.auditLog.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        tx.auditLog.count(),
      ]),
    );

    return res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get audit logs error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Platform Settings Management
export async function getPlatformSettings(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;
    const settings = await withAdminContext(adminUser.id, tx =>
      tx.platformSetting.findMany({ orderBy: { createdAt: 'desc' } }),
    );

    return res.json(settings);
  } catch (error) {
    logger.error('Get platform settings error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updatePlatformSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const adminUser = (req as any).user;

    if (value === undefined) {
      return res.status(400).json({ message: 'Value is required' });
    }

    const setting = await withAdminContext(adminUser.id, async tx => {
      const updated = await tx.platformSetting.upsert({
        where: { key },
        update: {
          value: String(value),
          updatedBy: adminUser.id,
        },
        create: {
          key,
          value: String(value),
          type: 'string',
          category: 'general',
          updatedBy: adminUser.id,
        },
      });
      await writeAuditLog(tx, {
        actorId: adminUser.id,
        action: 'update',
        resourceType: 'platform_setting',
        resourceId: key,
        details: { newValue: value },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      return updated;
    });

    return res.json(setting);
  } catch (error) {
    logger.error('Update platform setting error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Logo Upload Handler
export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadDir = path.join(__dirname, '../../uploads/logos');
    const tempPath = req.file.path;
    const targetFilename =
      'logo-' +
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      path.extname(req.file.originalname);
    const targetPath = path.join(uploadDir, targetFilename);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Move file from temp to final location
    fs.renameSync(tempPath, targetPath);

    const logoUrl = `/uploads/logos/${targetFilename}`;
    const adminUser = (req as any).user;

    // Log the upload action
    try {
      await AuditLogger.logAdminAction(
        adminUser.id,
        adminUser.email,
        'upload',
        'logo',
        undefined,
        { filename: targetFilename, size: req.file.size },
        req,
      );
    } catch (error) {
      fs.unlinkSync(targetPath);
      throw error;
    }

    return res.json({
      message: 'Logo uploaded successfully',
      logoUrl,
    });
  } catch (error) {
    logger.error('Upload logo error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function bulkUpdatePlatformSettings(req: Request, res: Response) {
  try {
    const { settings } = req.body;
    const adminUser = (req as any).user;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ message: 'Settings must be an array' });
    }

    const results = await withAdminContext(adminUser.id, async tx => {
      const updated: unknown[] = [];
      for (const setting of settings) {
        const {
          key,
          value,
          category = 'general',
          type = 'string',
          description,
          isPublic = false,
        } = setting;

        if (!key || value === undefined) {
          continue;
        }

        updated.push(
          await tx.platformSetting.upsert({
            where: { key },
            update: {
              value: String(value),
              type,
              category,
              description,
              isPublic,
              updatedBy: adminUser.id,
            },
            create: {
              key,
              value: String(value),
              type,
              category,
              description,
              isPublic,
              updatedBy: adminUser.id,
            },
          }),
        );
      }
      await writeAuditLog(tx, {
        actorId: adminUser.id,
        action: 'bulk_update',
        resourceType: 'platform_settings',
        details: { updatedCount: updated.length },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      return updated;
    });

    return res.json({ settings: results });
  } catch (error) {
    logger.error('Bulk update platform settings error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deletePlatformSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const adminUser = (req as any).user;

    const setting = await withAdminContext(adminUser.id, async tx => {
      const existing = await tx.platformSetting.findUnique({ where: { key } });
      if (!existing) {
        return null;
      }
      await tx.platformSetting.delete({ where: { key } });
      await writeAuditLog(tx, {
        actorId: adminUser.id,
        action: 'delete',
        resourceType: 'platform_setting',
        resourceId: key,
        details: { deletedValue: existing.value },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
      return existing;
    });

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete platform setting error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getSystemStats(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;
    const [ownerRows, totalCVs] = await withAdminContext(adminUser.id, tx =>
      Promise.all([
        tx.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT "userId")::int AS count
          FROM "CV"
        `,
        tx.cV.count(),
      ]),
    );

    return res.json({
      stats: {
        cvOwnerCount: Number(ownerRows[0]?.count ?? 0),
        totalCVs,
      },
    });
  } catch (error) {
    logger.error('Get system stats error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getChartData(req: Request, res: Response) {
  try {
    const requestedDays = Number.parseInt(req.query.days as string, 10) || 30;
    const days = Math.min(90, Math.max(7, requestedDays));
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const adminUser = (req as any).user;
    const cvs = await withAdminContext(adminUser.id, tx =>
      tx.cV.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { userId: true, createdAt: true },
      }),
    );

    const cvCounts: Record<string, number> = {};
    const ownersByDate: Record<string, Set<string>> = {};
    for (const cv of cvs) {
      const date = cv.createdAt.toISOString().slice(0, 10);
      cvCounts[date] = (cvCounts[date] ?? 0) + 1;
      ownersByDate[date] ??= new Set<string>();
      ownersByDate[date].add(cv.userId);
    }

    const labels: string[] = [];
    const cvData: number[] = [];
    const ownerData: number[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      labels.push(dateStr);
      cvData.push(cvCounts[dateStr] ?? 0);
      ownerData.push(ownersByDate[dateStr]?.size ?? 0);
    }

    return res.json({
      charts: {
        cvOwnerActivity: { labels, data: ownerData },
        cvCreation: { labels, data: cvData },
      },
    });
  } catch (error) {
    logger.error('Get chart data error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
