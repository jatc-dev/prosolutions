import type { Database, Queryable } from '../db/database.js';
import { alertSearchParams, dueAlerts, markAlertSent } from '../repositories/alerts.js';
import { searchJobs } from '../repositories/jobs.js';
import type { Mailer, MailMessage } from './mailer.js';
import {
  applicationReceivedCandidate,
  applicationReceivedRecruiter,
  jobAlertDigest,
  stageChangedCandidate,
} from './templates.js';

type Log = (message: string, meta?: Record<string, unknown>) => void;

export interface NotificationDeps {
  db: Database;
  mailer: Mailer;
  log: Log;
  /** Public web origin used in links, e.g. https://projobs.prosolutions.page */
  webUrl: string;
  /** Public API origin used for unsubscribe links. */
  apiUrl: string;
}

const MAX_ATTEMPTS = 5;
const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Emails produced by one outbox event (pure; easy to test). */
export function messagesForEvent(type: string, payload: Record<string, unknown>, webUrl: string): MailMessage[] {
  const messages: MailMessage[] = [];
  if (type === 'projobs.application.submitted') {
    const jobTitle = str(payload.jobTitle) ?? 'la vacante';
    const candidateEmail = str(payload.candidateEmail);
    if (candidateEmail) {
      messages.push(
        applicationReceivedCandidate({
          to: candidateEmail,
          candidateName: str(payload.candidateName),
          jobTitle,
          companyName: str(payload.companyName) ?? 'la empresa',
          webUrl,
        }),
      );
    }
    const recruiters = Array.isArray(payload.recruiterEmails) ? payload.recruiterEmails : [];
    for (const to of new Set(recruiters.filter((email): email is string => typeof email === 'string' && email.includes('@')))) {
      messages.push(
        applicationReceivedRecruiter({
          to,
          candidateName: str(payload.candidateName),
          jobTitle,
          matchScore: num(payload.matchScore),
          webUrl,
          jobId: str(payload.jobId) ?? '',
        }),
      );
    }
  }
  if (type === 'projobs.application.stage_changed') {
    const to = str(payload.candidateEmail);
    const message = to
      ? stageChangedCandidate({
          to,
          candidateName: str(payload.candidateName),
          jobTitle: str(payload.jobTitle) ?? 'la vacante',
          companyName: str(payload.companyName) ?? 'la empresa',
          toStage: str(payload.toStage) ?? '',
          webUrl,
        })
      : null;
    if (message) messages.push(message);
  }
  return messages;
}

/** Deliver pending outbox events once. Returns the number of events handled. */
export async function deliverPendingEvents(deps: NotificationDeps, batchSize = 20): Promise<number> {
  return deps.db.withContext({ userId: null }, async (tx: Queryable) => {
    const { rows } = await tx.query<{ id: string; event_type: string; payload: unknown }>(
      `SELECT id, event_type, payload FROM public.outbox_events
       WHERE processed_at IS NULL AND attempts < $1
       ORDER BY id LIMIT $2 FOR UPDATE SKIP LOCKED`,
      [MAX_ATTEMPTS, batchSize],
    );
    for (const row of rows) {
      const payload = (typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload) as Record<string, unknown>;
      try {
        for (const message of messagesForEvent(row.event_type, payload ?? {}, deps.webUrl)) {
          await deps.mailer.send(message);
        }
        await tx.query('UPDATE public.outbox_events SET processed_at = now(), attempts = attempts + 1 WHERE id = $1', [row.id]);
      } catch (error) {
        deps.log('notification delivery failed', { eventId: row.id, error: error instanceof Error ? error.message : String(error) });
        await tx.query('UPDATE public.outbox_events SET attempts = attempts + 1 WHERE id = $1', [row.id]);
      }
    }
    return rows.length;
  });
}

/** Send due job alerts once. Returns the number of alerts evaluated. */
export async function deliverDueAlerts(deps: NotificationDeps, now = new Date()): Promise<number> {
  const alerts = await deps.db.withContext({ userId: null }, (tx) => dueAlerts(tx, now));
  for (const alert of alerts) {
    try {
      const params = alertSearchParams(alert.query, alert.frequency);
      if (params) {
        const result = await deps.db.withContext({ userId: null }, (tx) => searchJobs(tx, params));
        if (result.total > 0) {
          // Web search URLs use `salary` for the API's `salaryMin`.
          const webQuery = { ...alert.query };
          if (webQuery.salaryMin) {
            webQuery.salary = webQuery.salaryMin;
            delete webQuery.salaryMin;
          }
          const search = new URLSearchParams(webQuery).toString();
          await deps.mailer.send(
            jobAlertDigest({
              to: alert.email,
              label: alert.label,
              jobs: result.items,
              total: result.total,
              webUrl: deps.webUrl,
              searchUrl: `${deps.webUrl}/${search ? `?${search}` : ''}`,
              unsubscribeUrl: `${deps.apiUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(alert.unsubscribeToken)}`,
            }),
          );
        }
      }
      await deps.db.withContext({ userId: null }, (tx) => markAlertSent(tx, alert.id, now));
    } catch (error) {
      deps.log('job alert delivery failed', { alertId: alert.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return alerts.length;
}

/**
 * In-process worker: outbox notifications every minute, alerts every 30
 * minutes. On a sleeping free-tier instance work simply resumes on wake-up
 * (the outbox and alert timestamps make delivery catch up, at least once).
 */
export function startNotificationWorker(deps: NotificationDeps): () => void {
  let running = false;
  const guard = (task: () => Promise<unknown>) => async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (error) {
      deps.log('notification worker error', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      running = false;
    }
  };
  const outbox = setInterval(guard(() => deliverPendingEvents(deps)), 60_000);
  const alerts = setInterval(guard(() => deliverDueAlerts(deps)), 30 * 60_000);
  const kickoff = setTimeout(guard(() => deliverPendingEvents(deps)), 5_000);
  outbox.unref();
  alerts.unref();
  kickoff.unref();
  return () => {
    clearInterval(outbox);
    clearInterval(alerts);
    clearTimeout(kickoff);
  };
}
