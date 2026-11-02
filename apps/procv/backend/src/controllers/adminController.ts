import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { withAdminContext } from '../dbContext';
import { logger } from '../utils/logger';

function adminId(req: Request): string {
  const id = (req as any).user?.id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Verified administrator identity is missing');
  }
  return id;
}

function auditData(req: Request, adminUserId: string, action: string, resourceType: string, resourceId?: string, details?: Record<string, unknown>) {
  return {
    userId: adminUserId,
    action,
    resourceType,
    resourceId,
    details: details ? JSON.stringify(details) : undefined,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const skip = (page - 1) * limit;
    const result = await withAdminContext(adminId(req), async tx => {
      const [logs, total] = await Promise.all([
        tx.auditLog.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
        tx.auditLog.count(),
      ]);
      return { logs, total };
    });
    return res.json({
      logs: result.logs,
      pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
    });
  } catch (error) {
    logger.error('Get audit logs error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPlatformSettings(req: Request, res: Response) {
  try {
    const settings = await withAdminContext(adminId(req), tx =>
      tx.platformSetting.findMany({ orderBy: { createdAt: 'desc' } }),
    );
    return res.json(settings);
  } catch (error) {
    logger.error('Get platform settings error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updatePlatformSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const id = adminId(req);
    if (value === undefined) return res.status(400).json({ message: 'Value is required' });

    const setting = await withAdminContext(id, async tx => {
      const updated = await tx.platformSetting.upsert({
        where: { key },
        update: { value: String(value), updatedBy: id },
        create: { key, value: String(value), type: 'string', category: 'general', updatedBy: id },
      });
      await tx.auditLog.create({
        data: auditData(req, id, 'update', 'platform_setting', key, { newValue: value }),
      });
      return updated;
    });
    return res.json(setting);
  } catch (error) {
    logger.error('Update platform setting error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const uploadDir = path.join(__dirname, '../../uploads/logos');
    const tempPath = req.file.path;
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(extension)) {
      return res.status(400).json({ message: 'Unsupported image extension' });
    }
    const targetFilename = `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    const targetPath = path.join(uploadDir, targetFilename);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.renameSync(tempPath, targetPath);

    const id = adminId(req);
    await withAdminContext(id, tx => tx.auditLog.create({
      data: auditData(req, id, 'upload', 'logo', undefined, { filename: targetFilename, size: req.file!.size }),
    }));
    return res.json({ message: 'Logo uploaded successfully', logoUrl: `/uploads/logos/${targetFilename}` });
  } catch (error) {
    logger.error('Upload logo error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function bulkUpdatePlatformSettings(req: Request, res: Response) {
  try {
    const { settings } = req.body;
    const id = adminId(req);
    if (!Array.isArray(settings)) return res.status(400).json({ message: 'Settings must be an array' });

    const results = await withAdminContext(id, async tx => {
      const updated = [];
      for (const setting of settings) {
        const {
          key, value, category = 'general', type = 'string',
          description, isPublic = false,
        } = setting;
        if (!key || value === undefined) continue;
        updated.push(await tx.platformSetting.upsert({
          where: { key },
          update: { value: String(value), type, category, description, isPublic, updatedBy: id },
          create: { key, value: String(value), type, category, description, isPublic, updatedBy: id },
        }));
      }
      await tx.auditLog.create({
        data: auditData(req, id, 'bulk_update', 'platform_settings', undefined, { updatedCount: updated.length }),
      });
      return updated;
    });
    return res.json({ settings: results });
  } catch (error) {
    logger.error('Bulk update platform settings error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deletePlatformSetting(req: Request, res: Response) {
  try {
    const { key } = req.params;
    const id = adminId(req);
    const deleted = await withAdminContext(id, async tx => {
      const setting = await tx.platformSetting.findUnique({ where: { key } });
      if (!setting) return false;
      await tx.platformSetting.delete({ where: { key } });
      await tx.auditLog.create({
        data: auditData(req, id, 'delete', 'platform_setting', key, { deletedValue: setting.value }),
      });
      return true;
    });
    if (!deleted) return res.status(404).json({ message: 'Setting not found' });
    return res.status(204).send();
  } catch (error) {
    logger.error('Delete platform setting error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getSystemStats(req: Request, res: Response) {
  try {
    const stats = await withAdminContext(adminId(req), async tx => {
      const [ownerRows, totalCVs] = await Promise.all([
        tx.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT "userId")::int AS count FROM "CV"
        `,
        tx.cV.count(),
      ]);
      return { cvOwnerCount: Number(ownerRows[0]?.count ?? 0), totalCVs };
    });
    return res.json({ stats });
  } catch (error) {
    logger.error('Get system stats error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getChartData(req: Request, res: Response) {
  try {
    const id = adminId(req);
    const requestedDays = Number.parseInt(req.query.days as string, 10) || 30;
    const days = Math.min(90, Math.max(7, requestedDays));
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const cvs = await withAdminContext(id, tx => tx.cV.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { userId: true, createdAt: true },
    }));

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
    return res.json({ charts: { cvOwnerActivity: { labels, data: ownerData }, cvCreation: { labels, data: cvData } } });
  } catch (error) {
    logger.error('Get chart data error', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
