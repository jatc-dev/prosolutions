import { Router, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import * as z from 'zod/v4';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CVService } from '../services/cvService';
import {
  AI_SECTIONS,
  AiBusyError,
  AiRefusedError,
  AiUnavailableError,
  buildCvContext,
  improveCvText,
  isAiConfigured,
  MAX_INSTRUCTION_CHARS,
  MAX_TEXT_CHARS,
} from '../services/aiAssistantService';
import { logger } from '../utils/logger';

const improveInput = z.object({
  section: z.enum(AI_SECTIONS),
  instruction: z.string().trim().min(3).max(MAX_INSTRUCTION_CHARS),
  text: z.string().max(MAX_TEXT_CHARS).default(''),
  cvId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .optional(),
});

const userKey = (req: AuthRequest) => req.userId ?? ipKeyGenerator(req.ip ?? '0.0.0.0');

/** Per-user quotas: protects cost and fairness (in memory, per instance). */
const burstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => userKey(req as AuthRequest),
  message: {
    message: 'Vas muy rápido. Espera un minuto antes de pedir otra sugerencia.',
    code: 'ai_rate_limited',
  },
});
const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: Number(process.env.AI_DAILY_LIMIT || 30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => userKey(req as AuthRequest),
  message: {
    message: 'Alcanzaste el límite diario de sugerencias de IA. Vuelve mañana.',
    code: 'ai_daily_limit',
  },
});

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ available: isAiConfigured() });
});

router.post(
  '/improve',
  (req, res, next) => authMiddleware(req as AuthRequest, res, next),
  burstLimiter,
  dailyLimiter,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const parsed = improveInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Solicitud inválida', code: 'bad_request' });
    }
    if (!isAiConfigured()) {
      return res
        .status(503)
        .json({ message: 'El asistente de IA no está disponible.', code: 'ai_unavailable' });
    }
    try {
      let cvContext = '';
      if (parsed.data.cvId) {
        const cv = await CVService.getCVByIdAndUserId(parsed.data.cvId, req.userId!).catch(
          () => null,
        );
        cvContext = cv ? buildCvContext((cv as { data?: unknown }).data) : '';
      }
      const suggestion = await improveCvText({
        section: parsed.data.section,
        instruction: parsed.data.instruction,
        text: parsed.data.text,
        cvContext,
      });
      res.set('Cache-Control', 'no-store');
      return res.json(suggestion);
    } catch (error) {
      if (error instanceof AiRefusedError) {
        return res
          .status(422)
          .json({
            message: 'El asistente no pudo procesar esta solicitud. Reformúlala.',
            code: 'ai_refused',
          });
      }
      if (error instanceof AiBusyError) {
        return res
          .status(429)
          .json({
            message: 'El asistente está ocupado. Inténtalo en unos segundos.',
            code: 'ai_busy',
          });
      }
      if (error instanceof AiUnavailableError) {
        return res
          .status(503)
          .json({
            message: 'El asistente de IA no está disponible en este momento.',
            code: 'ai_unavailable',
          });
      }
      logger.error('AI improve failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return next(error);
    }
  },
);

export default router;
