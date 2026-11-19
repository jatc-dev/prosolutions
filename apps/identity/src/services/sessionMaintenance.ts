import { logger } from '../utils/logger';
import { auditLog } from '../utils/auditLog';
import { purgeStaleSessions } from './tokenService';

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 60 * 1000;

export async function runSessionPurge(): Promise<number> {
  try {
    const deleted = await purgeStaleSessions();
    if (deleted > 0) {
      auditLog('maintenance.sessions_purged', { details: { deleted } });
    }
    return deleted;
  } catch (error) {
    logger.warn('Session purge failed', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/** Periodically delete expired and long-revoked sessions. Returns a stop function. */
export function startSessionMaintenance(): () => void {
  const first = setTimeout(() => void runSessionPurge(), FIRST_RUN_DELAY_MS);
  const interval = setInterval(() => void runSessionPurge(), PURGE_INTERVAL_MS);
  first.unref();
  interval.unref();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
