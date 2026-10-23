import { Request, Response } from 'express';
import prisma from '../prismaClient';

export async function listIdentityUsers(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string, 10) || 25));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          moduleAccess: {
            where: {
              active: true,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: { module: true, expiresAt: true },
            orderBy: { module: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users: users.map(({ moduleAccess, ...user }) => ({
        ...user,
        modules: moduleAccess.map((access) => access.module),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to list Identity users',
    });
  }
}
