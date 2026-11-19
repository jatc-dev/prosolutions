import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CVService } from '../services/cvService';
import { buildPdfHtml } from '../utils/templates';
import { renderToPdf } from '../utils/pdfGenerator';
import { withSafeProfileImage } from '../utils/safeImage';
import { parseCVFileToDraft } from '../services/cvImportService';
import { ATSService } from '../services/atsService';
import { CVAtsService } from '../services/cvAtsService';
import { createCvSchema, updateCvSchema } from '../validation/cvValidation';
import { logger } from '../utils/logger';

function parseStoredCvData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function summarizeCvDataShape(data: Record<string, unknown>) {
  const rootKeys = Object.keys(data);
  const personal = (
    data.personal && typeof data.personal === 'object'
      ? (data.personal as Record<string, unknown>)
      : {}
  ) as Record<string, unknown>;

  return {
    rootKeys,
    hasPersonal: rootKeys.includes('personal'),
    personalKeys: Object.keys(personal),
    hasSummary: typeof personal.summary === 'string' && personal.summary.trim().length > 0,
    hasValueProposition:
      typeof personal.valueProposition === 'string' && personal.valueProposition.trim().length > 0,
  };
}

function normalizeCvDataInput(input: unknown): Record<string, unknown> {
  if (input === undefined || input === null) {
    return {};
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('CV data must be a JSON object');
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new Error('Invalid CV data JSON payload');
    }
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  throw new Error('CV data must be an object');
}

export async function listCVs(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await CVService.getUserCVs(userId, page, limit);
    const normalized = result.cvs.map(cv => ({
      ...cv,
      data: parseStoredCvData(cv.data),
    }));

    logger.debug('CV list loaded', {
      userId,
      page,
      limit,
      count: normalized.length,
    });

    return res.json({
      cvs: normalized,
      pagination: {
        page,
        limit,
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function getCV(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;

    const cv = await CVService.getCVByIdAndUserId(id, userId);
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    const normalizedData = parseStoredCvData(cv.data);
    logger.debug('CV loaded', {
      userId,
      cvId: id,
      dataShape: summarizeCvDataShape(normalizedData),
    });

    return res.json({
      cv: {
        ...cv,
        data: normalizedData,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function createCV(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { error, value } = createCvSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, template, data } = value;
    const normalizedData = normalizeCvDataInput(data);

    logger.info('Creating CV', {
      userId,
      titleLength: title.length,
      template: template || 'sidebar',
      dataShape: summarizeCvDataShape(normalizedData),
    });

    const cv = await CVService.createCV(userId, title, template, normalizedData);

    return res.status(201).json({
      cv: {
        ...cv,
        data: parseStoredCvData(cv.data),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('CV data')) {
      return res.status(400).json({ message: error.message });
    }
    logger.error('Create CV failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function updateCV(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const { error, value } = updateCvSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, template, data } = value;
    const normalizedData = normalizeCvDataInput(data);

    logger.info('Updating CV', {
      userId,
      cvId: id,
      hasTitleUpdate: typeof title === 'string',
      hasTemplateUpdate: typeof template === 'string',
      dataShape: summarizeCvDataShape(normalizedData),
    });

    const updated = await CVService.updateCV(id, userId, title, template, normalizedData);

    return res.json({
      cv: {
        ...updated,
        data: parseStoredCvData(updated.data),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('CV data')) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message === 'CV not found') {
      return res.status(404).json({ message: 'CV not found' });
    }
    logger.error('Update CV failed', {
      cvId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function deleteCV(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;

    await CVService.deleteCV(id, userId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === 'CV not found') {
      return res.status(404).json({ message: 'CV not found' });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function exportPDF(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;

    const exportedCv = await CVService.exportCVToPDF(id, userId);
    // SSRF defence: remote photos are fetched under strict rules and inlined;
    // anything that does not qualify is dropped from the PDF.
    const normalizedCv = await withSafeProfileImage(exportedCv, {
      onRejected: (reason) => logger.warn('Profile image omitted from PDF export', { reason }),
    });
    const html = buildPdfHtml(normalizedCv as any);
    const pdf = await renderToPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${normalizedCv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cv'}.pdf"`,
    );
    res.send(pdf);
  } catch (error) {
    if (error instanceof Error && error.message === 'CV not found') {
      return res.status(404).json({ message: 'CV not found' });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function listCVVersions(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;

    const versions = await CVService.getCVVersions(id, userId);
    return res.json({ versions });
  } catch (error) {
    if (error instanceof Error && error.message === 'CV not found') {
      return res.status(404).json({ message: 'CV not found' });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function restoreVersion(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id, versionId } = req.params;

    const updated = await CVService.restoreCVVersion(id, userId, versionId);

    return res.json({
      cv: {
        ...updated,
        data: parseStoredCvData(updated.data),
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'CV not found' || error.message === 'Version not found')
    ) {
      return res.status(404).json({ message: error.message });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function parseCVUpload(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const result = await parseCVFileToDraft(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
    );

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(400).json({ message });
  }
}

export async function analyzeDraftATS(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { data, jobDescription = '' } = req.body || {};

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'CV data is required' });
    }

    const analysis = ATSService.analyzeCV(data, String(jobDescription || ''));
    return res.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function analyzeCVATS(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const { jobDescription = '', data } = req.body || {};

    const saved = await CVAtsService.analyzeAndPersist(
      id,
      userId,
      data,
      String(jobDescription || ''),
    );
    const history = await CVAtsService.getHistory(id, userId, 12);

    return res.json({
      analysis: saved.analysis,
      tailoring: saved.tailoring,
      history,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'CV not found') {
      return res.status(404).json({ message: 'CV not found' });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function listCVATSHistory(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const limit = Number(req.query.limit || 12);

    const history = await CVAtsService.getHistory(id, userId, limit);
    return res.json(history);
  } catch (error) {
    if (error instanceof Error && error.message === 'CV not found') {
      return res.status(404).json({ message: 'CV not found' });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function tailorDraftATS(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { data, jobDescription = '' } = req.body || {};

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: 'CV data is required' });
    }

    const tailoring = ATSService.tailorCV(data, String(jobDescription || ''));
    return res.json({ tailoring });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}

export async function tailorCVATS(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const { jobDescription = '', data } = req.body || {};

    const cv = await CVService.getCVByIdAndUserId(id, userId);
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    const sourceData = data && typeof data === 'object' ? data : JSON.parse(cv.data ?? '{}');
    const tailoring = ATSService.tailorCV(sourceData, String(jobDescription || ''));

    return res.json({ tailoring });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ message });
  }
}
