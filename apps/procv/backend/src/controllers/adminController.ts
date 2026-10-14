import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { AuditLogger } from '../utils/auditLogger';
import { registerSchema } from '../validation/authValidation';

export async function getUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const role = req.query.role as string;

    // Build where clause for filtering
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { cvs: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get users error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { email, name, role } = req.body;
    const adminUser = (req as any).user;

    // Prevent admin from demoting themselves
    if (id === adminUser.id && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own admin role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { email, name, role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the action
    await AuditLogger.logUserAction(
      adminUser.id,
      adminUser.email,
      'update',
      id,
      { changes: { email, name, role } },
      req,
    );

    return res.json(updatedUser);
  } catch (error) {
    logger.error('Update user error', {
      error: error instanceof Error ? error.message : String(error),
    });
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    // Prevent admin from deleting themselves
    if (id === adminUser.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Dependent records use ON DELETE RESTRICT in the database, so they must be
    // removed explicitly, deepest-first, inside a transaction. Email/reset
    // tokens already cascade at the database level but are cleaned here too so
    // the behavior does not depend on constraint definitions.
    await prisma.$transaction(async tx => {
      const cvs = await tx.cV.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const cvIds = cvs.map(cv => cv.id);

      if (cvIds.length > 0) {
        await tx.cVAtsAnalysis.deleteMany({ where: { cvId: { in: cvIds } } });
        await tx.cVVersion.deleteMany({ where: { cvId: { in: cvIds } } });
        await tx.cV.deleteMany({ where: { userId: id } });
      }

      await tx.session.deleteMany({ where: { userId: id } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });

      await tx.user.delete({ where: { id } });
    });

    // Log the action
    await AuditLogger.logUserAction(
      adminUser.id,
      adminUser.email,
      'delete',
      id,
      { deleted: true },
      req,
    );

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete user error', {
      error: error instanceof Error ? error.message : String(error),
    });
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    if ((error as any).code === 'P2003') {
      return res.status(409).json({
        message: 'User cannot be deleted because dependent records still reference it',
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

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

export async function exportUsersCSV(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { cvs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizeCSVField = (value: string): string => {
      if (!value) return '';
      const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r', '\n'];
      if (dangerousPrefixes.some(p => value.startsWith(p))) {
        return "'" + value;
      }
      return value;
    };

    // Create CSV content
    const csvHeaders =
      'ID,Email,Name,Role,CVs Count,Email Verified,Last Login At,Created At,Updated At\n';
    const csvRows = users
      .map(
        (user: any) =>
          `"${user.id}","${sanitizeCSVField(user.email)}","${sanitizeCSVField(user.name || '')}","${user.role}",${user._count.cvs},"${user.emailVerified ? 'yes' : 'no'}","${user.lastLoginAt ? user.lastLoginAt.toISOString() : ''}","${user.createdAt.toISOString()}","${user.updatedAt.toISOString()}"`,
      )
      .join('\n');

    const csvContent = csvHeaders + csvRows;

    // Log the export action
    const adminUser = (req as any).user;
    await AuditLogger.logAdminAction(
      adminUser.id,
      adminUser.email,
      'export',
      'users',
      undefined,
      { format: 'csv', recordCount: users.length },
      req,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    return res.send(csvContent);
  } catch (error) {
    logger.error('Export users CSV error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function resetUserPassword(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const { error } = registerSchema.validate({
      email: 'admin@example.com',
      password: newPassword,
      name: 'admin',
    });
    if (error) {
      return res.status(400).json({ message: error.details?.[0]?.message || 'Invalid password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error', {
      error: error instanceof Error ? error.message : String(error),
    });
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getSystemStats(req: Request, res: Response) {
  try {
    const [userCount, cvCount, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.cV.count(),
      prisma.user.findMany({
        select: { id: true, email: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return res.json({
      stats: {
        totalUsers: userCount,
        totalCVs: cvCount,
        recentUsers,
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
    const days = parseInt(req.query.days as string) || 30;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get user and CV data
    const [users, cvs] = await Promise.all([
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { createdAt: true },
      }),
      prisma.cV.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { createdAt: true },
      }),
    ]);

    // Group by date
    const userCounts: { [key: string]: number } = {};
    const cvCounts: { [key: string]: number } = {};

    users.forEach(user => {
      const date = user.createdAt.toISOString().split('T')[0];
      userCounts[date] = (userCounts[date] || 0) + 1;
    });

    cvs.forEach(cv => {
      const date = cv.createdAt.toISOString().split('T')[0];
      cvCounts[date] = (cvCounts[date] || 0) + 1;
    });

    // Fill missing dates with zeros and create labels
    const labels: string[] = [];
    const userData: number[] = [];
    const cvData: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(dateStr);
      userData.push(userCounts[dateStr] || 0);
      cvData.push(cvCounts[dateStr] || 0);
    }

    return res.json({
      charts: {
        userGrowth: {
          labels,
          data: userData,
        },
        cvCreation: {
          labels,
          data: cvData,
        },
      },
    });
  } catch (error) {
    logger.error('Get chart data error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
