import { Request, Response } from 'express';

const PROCV_BACKEND_URL = (process.env.PROCV_BACKEND_URL || '').replace(/\/+$/, '');
const SECRET_SETTING_KEY = /(password|secret|token|private.?key|api.?key|credential)/i;

function safeSettings(payload: unknown) {
  const settings = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { settings?: unknown }).settings)
      ? (payload as { settings: unknown[] }).settings
      : [];
  return settings.filter((entry): entry is Record<string, unknown> =>
    Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
  ).map((setting) => {
    const key = String(setting.key || '');
    if (SECRET_SETTING_KEY.test(key)) {
      return { ...setting, value: '', isSecret: true };
    }
    return { ...setting, isSecret: false };
  });
}

async function proxyAdminRequest(req: Request, res: Response, path: string, method: 'GET' | 'PUT' | 'DELETE' = 'GET') {
  if (!PROCV_BACKEND_URL) {
    return res.status(503).json({ message: 'ProCV administration backend is not configured in this environment.' });
  }
  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ message: 'Authorization header missing' });

  try {
    const headers: Record<string, string> = { Authorization: authorization, Accept: 'application/json' };
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      const csrfResponse = await fetch(`${PROCV_BACKEND_URL}/api/csrf-token`);
      if (!csrfResponse.ok) return res.status(502).json({ message: 'Unable to initialize ProCV admin request protection.' });
      const csrfPayload = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfPayload.csrfToken) return res.status(502).json({ message: 'ProCV did not return a CSRF token.' });
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = csrfPayload.csrfToken;
      body = JSON.stringify(req.body ?? {});
    }

    const response = await fetch(`${PROCV_BACKEND_URL}/api/admin${path}`, {
      method,
      headers,
      ...(body ? { body } : {}),
    });
    const raw = await response.text();
    let payload: unknown = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = { message: raw || 'Empty response from ProCV admin API.' }; }

    if (method === 'GET' && path === '/settings' && response.ok) {
      payload = safeSettings(payload);
    }
    return res.status(response.status).json(payload);
  } catch (error) {
    return res.status(502).json({
      message: 'Unable to reach the ProCV administration service.',
      detail: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
}

export function getProcvStats(req: Request, res: Response) {
  return proxyAdminRequest(req, res, '/stats');
}
export function getProcvCharts(req: Request, res: Response) {
  const days = typeof req.query.days === 'string' ? req.query.days : '30';
  return proxyAdminRequest(req, res, `/charts?days=${encodeURIComponent(days)}`);
}
export function getProcvAuditLogs(req: Request, res: Response) {
  const page = typeof req.query.page === 'string' ? req.query.page : '1';
  const limit = typeof req.query.limit === 'string' ? req.query.limit : '25';
  return proxyAdminRequest(req, res, `/audit-logs?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`);
}
export function getProcvSettings(req: Request, res: Response) {
  return proxyAdminRequest(req, res, '/settings');
}
export function updateProcvSetting(req: Request, res: Response) {
  if (SECRET_SETTING_KEY.test(req.params.key)) {
    return res.status(403).json({ message: 'Secret settings are managed outside the platform UI.' });
  }
  return proxyAdminRequest(req, res, `/settings/${encodeURIComponent(req.params.key)}`, 'PUT');
}
export function bulkUpdateProcvSettings(req: Request, res: Response) {
  const settings = (req.body as { settings?: unknown })?.settings;
  if (!Array.isArray(settings) || settings.some((item) =>
    !item || typeof item !== 'object' || SECRET_SETTING_KEY.test(String((item as { key?: unknown }).key || '')),
  )) {
    return res.status(400).json({ message: 'Settings payload is invalid or contains a secret field.' });
  }
  return proxyAdminRequest(req, res, '/settings', 'PUT');
}
export function deleteProcvSetting(req: Request, res: Response) {
  if (SECRET_SETTING_KEY.test(req.params.key)) {
    return res.status(403).json({ message: 'Secret settings are managed outside the platform UI.' });
  }
  return proxyAdminRequest(req, res, `/settings/${encodeURIComponent(req.params.key)}`, 'DELETE');
}
