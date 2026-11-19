import { Request, Response } from 'express';
import { IdentityRequest } from '../middleware/auth';
import { auditLog, extractRequestInfo } from '../utils/auditLog';

/**
 * ProAdmin -> ProJobs moderation. ProIdentity enforces the RBAC permission
 * (projobs.catalog.read / projobs.catalog.moderate) and calls ProJobs'
 * service-to-service API with PROJOBS_INTERNAL_TOKEN, which browsers never see.
 */
const PROJOBS_API_URL = () => (process.env.PROJOBS_API_URL || '').replace(/\/+$/, '');
const PROJOBS_INTERNAL_TOKEN = () => process.env.PROJOBS_INTERNAL_TOKEN || '';

const STATUS_FILTER = /^(pending|verified|rejected|suspended|all)$/;
const MODERATION_FILTER = /^(reported|paused|all)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function callProjobs(res: Response, path: string, init: { method?: string; body?: unknown } = {}) {
  const base = PROJOBS_API_URL();
  const token = PROJOBS_INTERNAL_TOKEN();
  if (!base || !token) {
    return res.status(503).json({ message: 'ProJobs administration is not configured in this environment.' });
  }
  try {
    const response = await fetch(`${base}/internal${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { message: 'Unexpected response from ProJobs.' };
    }
    return res.status(response.status).json(payload);
  } catch {
    return res.status(502).json({ message: 'Unable to reach the ProJobs service.' });
  }
}

export function listCompaniesForReview(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' && STATUS_FILTER.test(req.query.status) ? req.query.status : 'pending';
  return callProjobs(res, `/companies?status=${status}`);
}

export async function moderateCompany(req: Request, res: Response) {
  const companyId = String(req.params.companyId || '');
  if (!UUID.test(companyId)) return res.status(404).json({ message: 'Company not found' });
  const { status, note } = (req.body ?? {}) as { status?: unknown; note?: unknown };
  if (typeof status !== 'string' || !/^(verified|rejected|suspended|pending)$/.test(status)) {
    return res.status(400).json({ message: 'status must be verified, rejected, suspended or pending' });
  }
  auditLog('projobs.company_moderated', {
    userId: (req as IdentityRequest).userId,
    ...extractRequestInfo(req),
    details: { companyId, status },
  });
  return callProjobs(res, `/companies/${companyId}/verification`, {
    method: 'POST',
    body: { status, note: typeof note === 'string' ? note.slice(0, 500) : null },
  });
}

export function listJobsForModeration(req: Request, res: Response) {
  const filter = typeof req.query.filter === 'string' && MODERATION_FILTER.test(req.query.filter) ? req.query.filter : 'reported';
  return callProjobs(res, `/jobs/moderation?filter=${filter}`);
}

export async function moderateJob(req: Request, res: Response) {
  const jobId = String(req.params.jobId || '');
  if (!UUID.test(jobId)) return res.status(404).json({ message: 'Job not found' });
  const { action, note } = (req.body ?? {}) as { action?: unknown; note?: unknown };
  if (action !== 'pause' && action !== 'restore' && action !== 'dismiss') {
    return res.status(400).json({ message: 'action must be pause, restore or dismiss' });
  }
  auditLog('projobs.job_moderated', {
    userId: (req as IdentityRequest).userId,
    ...extractRequestInfo(req),
    details: { jobId, action },
  });
  return callProjobs(res, `/jobs/${jobId}/moderation`, {
    method: 'POST',
    body: { action, note: typeof note === 'string' ? note.slice(0, 500) : null },
  });
}
