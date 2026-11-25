import { logger } from '../utils/logger';
import { auditLog } from '../utils/auditLog';
import { purgeStaleSessions } from './tokenService';
import { purgeDueDeletions } from './userLifecycle';

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

const DELETION_INTERVAL_MS = 60 * 60 * 1000;

/** Erase accounts whose admin-scheduled deletion date has passed. */
export async function runScheduledDeletions(): Promise<number> {
  try {
    const erased = await purgeDueDeletions();
    if (erased > 0) auditLog('maintenance.scheduled_deletions', { details: { erased } });
    return erased;
  } catch (error) {
    logger.warn('Scheduled deletions failed', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/** Periodically delete expired sessions and run due account deletions. Returns a stop function. */
export function startSessionMaintenance(): () => void {
  const first = setTimeout(() => {
    void runSessionPurge();
    void runScheduledDeletions();
  }, FIRST_RUN_DELAY_MS);
  const interval = setInterval(() => void runSessionPurge(), PURGE_INTERVAL_MS);
  const deletions = setInterval(() => void runScheduledDeletions(), DELETION_INTERVAL_MS);
  first.unref();
  interval.unref();
  deletions.unref();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
    clearInterval(deletions);
  };
}
