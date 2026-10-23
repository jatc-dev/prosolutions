import { Response } from 'express';
import { Module } from '@prisma/client';
import { IdentityRequest } from '../middleware/auth';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { professionalProfileSchema } from '../validation/authValidation';
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

const isValidModule = (value: string): value is Module => Object.values(Module).includes(value as Module);

export async function grantModuleAccess(req: IdentityRequest, res: Response) {
  const { userId, module, expiresAt } = req.body as {
    userId?: string;
    module?: string;
    expiresAt?: string | null;
  };

  if (!userId || !module) {
    return res.status(400).json({ message: 'userId and module are required' });
  }
  if (!isValidModule(module)) {
    return res.status(400).json({ message: 'Unknown module' });
  }

  let parsedExpiry: Date | null = null;
  if (expiresAt) {
    parsedExpiry = new Date(expiresAt);
    if (!Number.isFinite(parsedExpiry.getTime()) || parsedExpiry.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'expiresAt must be a valid future date' });
    }
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) return res.status(404).json({ message: 'Identity user not found' });

    const access = await prisma.moduleAccess.upsert({
      where: { userId_module: { userId, module } },
      update: { active: true, expiresAt: parsedExpiry },
      create: { userId, module, expiresAt: parsedExpiry },
    });

    auditLog('authorization.module_access_granted', {
      userId: req.userId,
      details: {
        targetUserId: userId,
        module,
        expiresAt: parsedExpiry?.toISOString() ?? null,
      },
      ...extractRequestInfo(req),
    });

    return res.json({ access, message: 'Module access granted' });
  } catch (error) {
    logger.error('Grant module access failed', {
      actorId: req.userId,
      targetUserId: userId,
      module,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Unable to grant module access' });
  }
}

export async function revokeModuleAccess(req: IdentityRequest, res: Response) {
  const { userId, module } = req.body as { userId?: string; module?: string };

  if (!userId || !module) {
    return res.status(400).json({ message: 'userId and module are required' });
  }
  if (!VALID_MODULES.includes(module as (typeof VALID_MODULES)[number])) {
    return res.status(400).json({ message: 'Unknown module' });
  }
  if (userId === req.userId) {
    // Keep account administrators from accidentally removing their own module access.
    const activeModules = await prisma.moduleAccess.findMany({
      where: { userId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { module: true },
    });
    const targetModuleIsActive = activeModules.some((access) => access.module === module);
    if (targetModuleIsActive && activeModules.length <= 1) {
      return res.status(400).json({ message: 'Cannot revoke the last active module from your own account' });
    }
  }

  try {
    const result = await prisma.moduleAccess.updateMany({
      where: { userId, module: module as (typeof VALID_MODULES)[number] },
      data: { active: false },
    });

    auditLog('authorization.module_access_revoked', {
      userId: req.userId,
      details: {
        targetUserId: userId,
        module,
        affectedRows: result.count,
      },
      ...extractRequestInfo(req),
    });

    return res.json({ message: 'Module access revoked', affectedRows: result.count });
  } catch (error) {
    logger.error('Revoke module access failed', {
      actorId: req.userId,
      targetUserId: userId,
      module,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Unable to revoke module access' });
  }
}
