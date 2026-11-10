import { Prisma } from '@prisma/client';
import { Response } from 'express';
import Joi from 'joi';
import { IdentityRequest } from '../middleware/auth';
import prisma from '../prismaClient';
import { auditLog, extractRequestInfo } from '../utils/auditLog';

const preferencesSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'system'),
  locale: Joi.string().valid('es', 'en'),
}).min(1).unknown(false);

type UserPreferences = { theme?: 'light' | 'dark' | 'system'; locale?: 'es' | 'en' };

function normalizePreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    ...(raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system' ? { theme: raw.theme } : {}),
    ...(raw.locale === 'es' || raw.locale === 'en' ? { locale: raw.locale } : {}),
  };
}

export async function getUserPreferences(req: IdentityRequest, res: Response) {
  if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { preferences: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ preferences: normalizePreferences(user.preferences) });
  } catch {
    return res.status(500).json({ message: 'Unable to load user preferences' });
  }
}

export async function updateUserPreferences(req: IdentityRequest, res: Response) {
  if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
  const { error, value } = preferencesSchema.validate(req.body, { abortEarly: true, convert: false });
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const current = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { preferences: true },
    });
    if (!current) return res.status(404).json({ message: 'User not found' });

    const preferences: UserPreferences = { ...normalizePreferences(current.preferences), ...value };
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { preferences: preferences as Prisma.InputJsonValue },
      select: { preferences: true },
    });

    auditLog('account.preferences_updated', {
      userId: req.userId,
      ...extractRequestInfo(req),
      details: { fields: Object.keys(value) },
    });
    return res.json({ preferences: normalizePreferences(updated.preferences) });
  } catch {
    return res.status(500).json({ message: 'Unable to update user preferences' });
  }
}
