import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as { sub: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Admin middleware error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({ message: 'Invalid token' });
  }
}
