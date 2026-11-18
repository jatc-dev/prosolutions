import { Request, Response } from 'express';
import Joi from 'joi';
import prisma from '../prismaClient';
import { IdentityRequest } from '../middleware/auth';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { logger } from '../utils/logger';
import { sendPlainEmail } from '../services/emailService';

// ---------------------------------------------------------------------------
// Advertising configuration (ProAdmin -> every frontend)
// ---------------------------------------------------------------------------

export const AD_PLACEMENTS = ['academy-article', 'academy-index', 'tools-result', 'jobs-listing'] as const;
const ADS_KEY = 'ads';

export interface AdsSettings {
  enabled: boolean;
  publisherId: string | null;
  placements: Record<(typeof AD_PLACEMENTS)[number], boolean>;
}

export const DEFAULT_ADS: AdsSettings = {
  enabled: false,
  publisherId: null,
  placements: { 'academy-article': true, 'academy-index': true, 'tools-result': true, 'jobs-listing': true },
};

const adsSchema = Joi.object({
  enabled: Joi.boolean().required(),
  publisherId: Joi.string()
    .pattern(/^ca-pub-\d{10,20}$/)
    .allow(null, '')
    .required()
    .messages({ 'string.pattern.base': 'publisherId must look like ca-pub-0000000000000000' }),
  placements: Joi.object(Object.fromEntries(AD_PLACEMENTS.map((placement) => [placement, Joi.boolean().required()]))).required(),
});

export async function readAdsSettings(): Promise<AdsSettings> {
  const row = await prisma.platformSetting.findUnique({ where: { key: ADS_KEY } });
  if (!row) return DEFAULT_ADS;
  const { value, error } = adsSchema.validate(row.value);
  return error ? DEFAULT_ADS : { ...value, publisherId: value.publisherId || null };
}

/** GET /api/public/platform/ads (no auth, cacheable). */
export async function getPublicAdsSettings(_req: Request, res: Response) {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ ads: await readAdsSettings() });
  } catch (error) {
    logger.warn('Ads settings unavailable', { error: error instanceof Error ? error.message : String(error) });
    return res.json({ ads: DEFAULT_ADS, degraded: true });
  }
}

export async function getAdminAdsSettings(_req: Request, res: Response) {
  return res.json({ ads: await readAdsSettings() });
}

export async function updateAdminAdsSettings(req: Request, res: Response) {
  const { value, error } = adsSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });
  const userId = (req as IdentityRequest).userId ?? null;
  const settings: AdsSettings = { ...value, publisherId: value.publisherId || null };
  await prisma.platformSetting.upsert({
    where: { key: ADS_KEY },
    create: { key: ADS_KEY, value: settings as unknown as object, updatedBy: userId },
    update: { value: settings as unknown as object, updatedBy: userId },
  });
  auditLog('platform.settings_updated', { userId: userId ?? undefined, ...extractRequestInfo(req), details: { key: ADS_KEY, enabled: settings.enabled } });
  return res.json({ ads: settings });
}

// ---------------------------------------------------------------------------
// Contact and Habeas Data requests
// ---------------------------------------------------------------------------

export const CONTACT_TOPICS = ['soporte', 'empresas', 'datos-personales', 'prensa', 'otro'] as const;

const TOPIC_LABEL: Record<(typeof CONTACT_TOPICS)[number], string> = {
  soporte: 'Soporte',
  empresas: 'Empresas y reclutadores',
  'datos-personales': 'Datos personales (Habeas Data)',
  prensa: 'Prensa y alianzas',
  otro: 'Otro',
};

export const contactSchema = Joi.object({
  topic: Joi.string().valid(...CONTACT_TOPICS).required(),
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().max(254).required(),
  message: Joi.string().trim().min(20).max(5000).required(),
  acceptPrivacyPolicy: Joi.boolean().valid(true).required(),
  // Honeypot: real users never see or fill this field.
  website: Joi.string().allow('').max(0).optional(),
});

/** POST /api/public/contact */
export async function submitContact(req: Request, res: Response) {
  const { value, error } = contactSchema.validate(req.body ?? {}, { abortEarly: true });
  if (error) {
    const honeypot = error.details[0].path[0] === 'website';
    // Bots get a generic success so they do not learn about the trap.
    if (honeypot) return res.status(201).json({ reference: 'ok' });
    return res.status(400).json({ message: error.details[0].message, field: error.details[0].path[0] });
  }

  const request = await prisma.contactRequest.create({
    data: { topic: value.topic, name: value.name, email: value.email.toLowerCase(), message: value.message },
  });
  const reference = request.id.slice(-8).toUpperCase();

  const inbox = process.env.CONTACT_INBOX?.trim();
  let notified = false;
  if (inbox) {
    notified = await sendPlainEmail({
      to: inbox,
      replyTo: value.email,
      subject: `[ProSolutions · ${TOPIC_LABEL[value.topic as keyof typeof TOPIC_LABEL]}] ${value.name} (#${reference})`,
      text: `Tema: ${TOPIC_LABEL[value.topic as keyof typeof TOPIC_LABEL]}\nNombre: ${value.name}\nCorreo: ${value.email}\nReferencia: ${reference}\n\n${value.message}`,
    });
    if (notified) await prisma.contactRequest.update({ where: { id: request.id }, data: { notified: true } });
  }
  auditLog('account.contact_request', { ...extractRequestInfo(req), details: { topic: value.topic, reference, notified } });
  return res.status(201).json({ reference });
}
