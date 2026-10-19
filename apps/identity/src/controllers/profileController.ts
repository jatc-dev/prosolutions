import { Request, Response } from 'express';
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

export async function grantModuleAccess(req: Request, res: Response) {
  const { userId, module, expiresAt } = req.body;

  if (!userId || !module) {
    return res.status(400).json({ message: 'userId and module are required' });
  }

  try {
    const access = await prisma.moduleAccess.upsert({
      where: { userId_module: { userId, module } },
      update: { active: true, expiresAt: expiresAt ? new Date(expiresAt) : null },
      create: { userId, module, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });

    return res.json({ access, message: 'Module access granted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function revokeModuleAccess(req: Request, res: Response) {
  const { userId, module } = req.body;

  if (!userId || !module) {
    return res.status(400).json({ message: 'userId and module are required' });
  }

  try {
    await prisma.moduleAccess.updateMany({
      where: { userId, module },
      data: { active: false },
    });

    return res.json({ message: 'Module access revoked' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}
