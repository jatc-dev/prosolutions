import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { AuditLogger } from '../utils/auditLogger';

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count(),
    ]);

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
    const settings = await prisma.platformSetting.findMany({
      orderBy: { createdAt: 'desc' },
    });

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

    const setting = await prisma.platformSetting.upsert({
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

    // Log the action
    await AuditLogger.logAdminAction(
      adminUser.id,
      adminUser.email,
      'update',
      'platform_setting',
      key,
      { newValue: value },
      req,
    );

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
    await AuditLogger.logAdminAction(
      adminUser.id,
      adminUser.email,
      'upload',
      'logo',
      undefined,
      { filename: targetFilename, size: req.file.size },
      req,
    );

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

    const results = [];

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
        continue; // Skip invalid entries
      }

      const updatedSetting = await prisma.platformSetting.upsert({
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
      });

      results.push(updatedSetting);
    }

    // Log the bulk update action
    await AuditLogger.logAdminAction(
      adminUser.id,
      adminUser.email,
      'bulk_update',
      'platform_settings',
      undefined,
      { updatedCount: results.length },
      req,
    );

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

    const setting = await prisma.platformSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    await prisma.platformSetting.delete({
      where: { key },
    });

    // Log the action
    await AuditLogger.logAdminAction(
      adminUser.id,
      adminUser.email,
      'delete',
      'platform_setting',
      key,
      { deletedValue: setting.value },
      req,
    );

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete platform setting error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getSystemStats(_req: Request, res: Response) {
  try {
    const [procvAccountCount, cvCount] = await Promise.all([
      prisma.identityAccount.count(),
      prisma.cV.count(),
    ]);

    return res.json({
      stats: {
        totalProCVAccounts: procvAccountCount,
        totalCVs: cvCount,
      },
    });
  } catch (error) {
    logger.error('Get ProCV system stats error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getChartData(req: Request, res: Response) {
  try {
    const requestedDays = Number.parseInt(String(req.query.days || '30'), 10) || 30;
    const days = Math.min(365, Math.max(7, requestedDays));
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setUTCDate(endDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const [accounts, cvs] = await Promise.all([
      prisma.identityAccount.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
      prisma.cV.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true },
      }),
    ]);

    const accountCounts: Record<string, number> = {};
    const cvCounts: Record<string, number> = {};
    for (const account of accounts) {
      const day = account.createdAt.toISOString().slice(0, 10);
      accountCounts[day] = (accountCounts[day] || 0) + 1;
    }
    for (const cv of cvs) {
      const day = cv.createdAt.toISOString().slice(0, 10);
      cvCounts[day] = (cvCounts[day] || 0) + 1;
    }

    const labels: string[] = [];
    const procvAccountData: number[] = [];
    const cvData: number[] = [];
    for (let offset = 0; offset < days; offset++) {
      const day = new Date(startDate);
      day.setUTCDate(startDate.getUTCDate() + offset);
      const label = day.toISOString().slice(0, 10);
      labels.push(label);
      procvAccountData.push(accountCounts[label] || 0);
      cvData.push(cvCounts[label] || 0);
    }

    return res.json({
      charts: {
        procvAccountGrowth: { labels, data: procvAccountData },
        cvCreation: { labels, data: cvData },
      },
    });
  } catch (error) {
    logger.error('Get ProCV chart data error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
