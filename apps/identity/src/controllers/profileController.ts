import { Request, Response } from 'express';
import { IdentityRequest } from '../middleware/auth';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { professionalProfileSchema } from '../validation/authValidation';
import { ALL_MODULES, ProSolutionsModule } from '../types/modules';
import { auditLog, extractRequestInfo } from '../utils/auditLog';

export async function getProfile(req: IdentityRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Professional profile not found' });
    }

    return res.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function upsertProfile(req: IdentityRequest, res: Response) {
  const { error, value } = professionalProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { headline, summary, location, phone, birthDate, skills, experience, education, links } = value;

    const profile = await prisma.professionalProfile.upsert({
      where: { userId },
      update: {
        headline,
        summary,
        location,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        skills: skills ? JSON.stringify(skills) : undefined,
        experience: experience ? JSON.stringify(experience) : undefined,
        education: education ? JSON.stringify(education) : undefined,
        links: links ? JSON.stringify(links) : undefined,
      },
      create: {
        userId,
        headline,
        summary,
        location,
        phone,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        skills: skills ? JSON.stringify(skills) : '[]',
        experience: experience ? JSON.stringify(experience) : '[]',
        education: education ? JSON.stringify(education) : '[]',
        links: links ? JSON.stringify(links) : '{}',
      },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });

    auditLog('authentication.profile_updated', {
      userId,
      ...extractRequestInfo(req),
    });
    logger.info('Professional profile updated', { userId });

    return res.json({ profile, message: 'Professional profile updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function getModuleAccess(req: IdentityRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const moduleAccess = await prisma.moduleAccess.findMany({
      where: { userId },
      select: { module: true, active: true, grantedAt: true, expiresAt: true },
    });

    return res.json({ moduleAccess });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

function parseModule(value: unknown): ProSolutionsModule | null {
  if (typeof value !== 'string') return null;
  return ALL_MODULES.includes(value as ProSolutionsModule)
    ? (value as ProSolutionsModule)
    : null;
}

export async function listUsersForModuleAccess(req: IdentityRequest, res: Response) {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
    const search = String(req.query.search || '').trim().slice(0, 100);
    const role = String(req.query.role || '').trim();
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role === 'user' || role === 'admin') where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          moduleAccess: {
            select: { module: true, active: true, expiresAt: true, grantedAt: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const now = new Date();
    const projectedUsers = users.map(({ moduleAccess, ...user }) => ({
      ...user,
      modules: ALL_MODULES.map((module) => {
        const grant = moduleAccess.find((item) => item.module === module);
        const active = Boolean(grant?.active && (!grant.expiresAt || grant.expiresAt > now));
        return {
          module,
          active,
          expiresAt: grant?.expiresAt ?? null,
          grantedAt: grant?.grantedAt ?? null,
        };
      }),
    }));

    return res.json({
      users: projectedUsers,
      availableModules: ALL_MODULES,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('List users for module access failed', { error: message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function grantModuleAccess(req: IdentityRequest, res: Response) {
  const { userId, module, expiresAt } = req.body ?? {};
  const normalizedModule = parseModule(module);
  if (typeof userId !== 'string' || !userId.trim() || !normalizedModule) {
    return res.status(400).json({ message: 'A valid userId and module are required' });
  }

  let normalizedExpiry: Date | null = null;
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    normalizedExpiry = new Date(expiresAt);
    if (Number.isNaN(normalizedExpiry.getTime()) || normalizedExpiry <= new Date()) {
      return res.status(400).json({ message: 'expiresAt must be a valid future date' });
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isActive) return res.status(409).json({ message: 'Cannot grant access to an inactive account' });

    const access = await prisma.moduleAccess.upsert({
      where: { userId_module: { userId, module: normalizedModule } },
      update: { active: true, expiresAt: normalizedExpiry },
      create: { userId, module: normalizedModule, active: true, expiresAt: normalizedExpiry },
    });

    auditLog('authorization.module_access_granted', {
      userId: req.userId,
      targetUserId: userId,
      module: normalizedModule,
      expiresAt: normalizedExpiry?.toISOString() ?? null,
      ...extractRequestInfo(req),
    });
    return res.json({ access, message: 'Module access granted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Grant module access failed', { error: message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function revokeModuleAccess(req: IdentityRequest, res: Response) {
  const { userId, module } = req.body ?? {};
  const normalizedModule = parseModule(module);
  if (typeof userId !== 'string' || !userId.trim() || !normalizedModule) {
    return res.status(400).json({ message: 'A valid userId and module are required' });
  }

  if (normalizedModule === ProSolutionsModule.PROCV && userId === req.userId) {
    return res.status(409).json({
      message: 'Administrators cannot revoke their own ProCV access from the ProCV administration console',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.moduleAccess.updateMany({
      where: { userId, module: normalizedModule },
      data: { active: false },
    });

    auditLog('authorization.module_access_revoked', {
      userId: req.userId,
      targetUserId: userId,
      module: normalizedModule,
      ...extractRequestInfo(req),
    });
    return res.json({ message: 'Module access revoked' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Revoke module access failed', { error: message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
