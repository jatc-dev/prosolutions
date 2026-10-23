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
    const now = new Date();
    const rows = await prisma.moduleAccess.findMany({
      where: {
        userId,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        module: { enabled: true },
      },
      include: {
        module: {
          select: { code: true, name: true, description: true, baseUrl: true, apiAudience: true },
        },
      },
      orderBy: { module: { displayOrder: 'asc' } },
    });

    const moduleAccess = rows.map((row) => ({
      module: row.moduleCode,
      moduleCode: row.moduleCode,
      name: row.module.name,
      description: row.module.description,
      baseUrl: row.module.baseUrl,
      grantedAt: row.grantedAt,
      expiresAt: row.expiresAt,
      active: row.active,
    }));

    return res.json({ moduleAccess, modules: moduleAccess.map((entry) => entry.moduleCode) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Get module access error', { error: message });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getModuleCatalog(_req: Request, res: Response) {
  try {
    const modules = await prisma.module.findMany({
      select: {
        code: true,
        name: true,
        description: true,
        baseUrl: true,
        apiAudience: true,
        enabled: true,
        defaultForNewUsers: true,
        defaultForAdmins: true,
        displayOrder: true,
      },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ modules });
  } catch (error) {
    logger.error('Get module catalog error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function createModule(req: IdentityRequest, res: Response) {
  const {
    code,
    name,
    description,
    baseUrl,
    apiAudience,
    displayOrder = 100,
  } = req.body ?? {};

  const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(normalizedCode)) {
    return res.status(400).json({ message: 'code must be 2–32 uppercase letters, numbers, or underscores and start with a letter' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'name is required' });
  }
  if (typeof apiAudience !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(apiAudience.trim())) {
    return res.status(400).json({ message: 'apiAudience must be a valid audience identifier' });
  }
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid scheme');
    } catch {
      return res.status(400).json({ message: 'baseUrl must be a valid HTTP(S) URL' });
    }
  }
  const parsedOrder = Number(displayOrder);
  if (!Number.isInteger(parsedOrder) || parsedOrder < 0 || parsedOrder > 10000) {
    return res.status(400).json({ message: 'displayOrder must be an integer between 0 and 10000' });
  }

  try {
    const module = await prisma.module.create({
      data: {
        code: normalizedCode,
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        baseUrl: typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim().replace(/\/$/, '') : null,
        apiAudience: apiAudience.trim(),
        // A new module can never become public/entitled at creation time.
        enabled: false,
        defaultForNewUsers: false,
        defaultForAdmins: false,
        displayOrder: parsedOrder,
      },
    });
    auditLog('authorization.module_registered', {
      userId: req.userId,
      module: normalizedCode,
      ...extractRequestInfo(req),
    });
    return res.status(201).json({ module, message: 'Module registered successfully' });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'P2002') {
      return res.status(409).json({ message: 'A module with this code or API audience already exists' });
    }
    logger.error('Create module error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateModule(req: IdentityRequest, res: Response) {
  const { code } = req.params;
  const { name, description, baseUrl, apiAudience, displayOrder } = req.body ?? {};
  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ message: 'name must be a non-empty string' });
    data.name = name.trim();
  }
  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') return res.status(400).json({ message: 'description must be a string or null' });
    data.description = typeof description === 'string' ? description.trim() || null : null;
  }
  if (baseUrl !== undefined) {
    if (baseUrl === null || baseUrl === '') {
      data.baseUrl = null;
    } else {
      try {
        const parsed = new URL(baseUrl);
        if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid scheme');
        data.baseUrl = parsed.toString().replace(/\/$/, '');
      } catch {
        return res.status(400).json({ message: 'baseUrl must be a valid HTTP(S) URL or null' });
      }
    }
  }
  if (apiAudience !== undefined) {
    if (typeof apiAudience !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(apiAudience.trim())) {
      return res.status(400).json({ message: 'apiAudience must be a valid audience identifier' });
    }
    data.apiAudience = apiAudience.trim();
  }
  for (const field of ['enabled', 'defaultForNewUsers', 'defaultForAdmins'] as const) {
    if (req.body?.[field] !== undefined) {
      if (typeof req.body[field] !== 'boolean') return res.status(400).json({ message: field + ' must be boolean' });
      data[field] = req.body[field];
    }
  }
  if (displayOrder !== undefined) {
    const value = Number(displayOrder);
    if (!Number.isInteger(value) || value < 0 || value > 10000) return res.status(400).json({ message: 'displayOrder must be between 0 and 10000' });
    data.displayOrder = value;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'At least one supported field is required' });
  }

  try {
    const module = await prisma.module.update({ where: { code }, data });
    auditLog('authorization.module_updated', {
      userId: req.userId,
      module: code,
      changedFields: Object.keys(data),
      ...extractRequestInfo(req),
    });
    return res.json({ module, message: 'Module updated successfully' });
  } catch (error) {
    const codeError = (error as { code?: string }).code;
    if (codeError === 'P2025') return res.status(404).json({ message: 'Module not found' });
    if (codeError === 'P2002') return res.status(409).json({ message: 'API audience is already assigned to another module' });
    logger.error('Update module error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listUsersForModuleAdmin(req: IdentityRequest, res: Response) {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '25'), 10) || 25));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role === 'admin' || role === 'user') where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where as any,
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
            select: {
              moduleCode: true,
              active: true,
              grantedAt: true,
              expiresAt: true,
              module: { select: { code: true, name: true, enabled: true } },
            },
            orderBy: { grantedAt: 'desc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: where as any }),
    ]);

    return res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List users for module admin error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateAdminUser(req: IdentityRequest, res: Response) {
  const { id } = req.params;
  const body = req.body ?? {};
  const data: { name?: string | null; role?: string; isActive?: boolean } = {};

  if (body.name !== undefined) {
    if (body.name !== null && typeof body.name !== 'string') {
      return res.status(400).json({ message: 'name must be a string or null' });
    }
    data.name = typeof body.name === 'string' ? body.name.trim() || null : null;
  }
  if (body.role !== undefined) {
    if (body.role !== 'admin' && body.role !== 'user') {
      return res.status(400).json({ message: 'role must be admin or user' });
    }
    if (id === req.userId && body.role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own administrator role' });
    }
    data.role = body.role;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be boolean' });
    }
    if (id === req.userId && body.isActive === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'At least one supported field is required' });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const accountSecurityChanged =
      (data.role !== undefined && data.role !== existing.role) ||
      (data.isActive !== undefined && data.isActive !== existing.isActive);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (accountSecurityChanged) {
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return updated;
    });

    auditLog('authorization.user_account_updated', {
      userId: id,
      actorId: req.userId,
      changedFields: Object.keys(data),
      sessionsRevoked: accountSecurityChanged,
      ...extractRequestInfo(req),
    });
    return res.json({ user, message: 'Account updated successfully' });
  } catch (error) {
    logger.error('Update central user error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getModuleAdminMetrics(req: IdentityRequest, res: Response) {
  try {
    const days = Math.min(365, Math.max(7, Number.parseInt(String(req.query.days ?? '30'), 10) || 30));
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    start.setUTCHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    });
    const counts: Record<string, number> = {};
    for (const user of users) {
      const day = user.createdAt.toISOString().slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    }

    const labels: string[] = [];
    const data: number[] = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const day = new Date(end);
      day.setUTCDate(day.getUTCDate() - offset);
      const label = day.toISOString().slice(0, 10);
      labels.push(label);
      data.push(counts[label] ?? 0);
    }

    return res.json({ userGrowth: { labels, data } });
  } catch (error) {
    logger.error('Get module admin metrics error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function grantModuleAccess(req: IdentityRequest, res: Response) {
  const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
  const moduleCode = typeof (req.body?.moduleCode ?? req.body?.module) === 'string'
    ? String(req.body.moduleCode ?? req.body.module).trim().toUpperCase()
    : '';
  const expiresAtValue = req.body?.expiresAt;

  if (!userId || !moduleCode) {
    return res.status(400).json({ message: 'userId and moduleCode are required' });
  }

  let expiresAt: Date | null = null;
  if (expiresAtValue !== undefined && expiresAtValue !== null && expiresAtValue !== '') {
    expiresAt = new Date(expiresAtValue);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return res.status(400).json({ message: 'expiresAt must be a valid future date' });
    }
  }

  try {
    const [user, module] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.module.findUnique({ where: { code: moduleCode } }),
    ]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!module) return res.status(404).json({ message: 'Module not found in the module catalog' });
    if (!module.enabled) return res.status(409).json({ message: 'Module is disabled' });

    const access = await prisma.moduleAccess.upsert({
      where: { userId_moduleCode: { userId, moduleCode } },
      update: { active: true, expiresAt },
      create: { userId, moduleCode, expiresAt, active: true },
      include: { module: { select: { code: true, name: true } } },
    });

    auditLog('authorization.module_access_granted', {
      userId,
      module: moduleCode,
      expiresAt: expiresAt?.toISOString() ?? null,
      actorId: req.userId,
      ...extractRequestInfo(req),
    });
    return res.json({ access, message: 'Module access granted' });
  } catch (error) {
    logger.error('Grant module access error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function revokeModuleAccess(req: IdentityRequest, res: Response) {
  const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
  const moduleCode = typeof (req.body?.moduleCode ?? req.body?.module) === 'string'
    ? String(req.body.moduleCode ?? req.body.module).trim().toUpperCase()
    : '';

  if (!userId || !moduleCode) {
    return res.status(400).json({ message: 'userId and moduleCode are required' });
  }
  if (userId === req.userId && moduleCode === 'PROCV') {
    return res.status(400).json({ message: 'You cannot revoke your own ProCV access from this screen' });
  }

  try {
    const access = await prisma.moduleAccess.updateMany({
      where: { userId, moduleCode },
      data: { active: false },
    });
    if (access.count === 0) {
      return res.status(404).json({ message: 'No module grant found for this user' });
    }
    auditLog('authorization.module_access_revoked', {
      userId,
      module: moduleCode,
      actorId: req.userId,
      ...extractRequestInfo(req),
    });
    return res.json({ message: 'Module access revoked' });
  } catch (error) {
    logger.error('Revoke module access error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
}
