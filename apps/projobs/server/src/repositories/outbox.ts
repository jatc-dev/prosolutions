import type { IntegrationEvent } from '../contracts.js';
import type { Queryable } from '../db/database.js';
import { iso, json } from './mappers.js';

/** Record an integration event in the same transaction as the state change. */
export async function publishEvent(
  tx: Queryable,
  type: IntegrationEvent['type'],
  aggregateType: IntegrationEvent['aggregateType'],
  aggregateId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await tx.query(
    `INSERT INTO public.outbox_events (event_type, aggregate_type, aggregate_id, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [type, aggregateType, aggregateId, JSON.stringify(payload)],
  );
}

export async function listEvents(tx: Queryable, after: number, limit: number): Promise<IntegrationEvent[]> {
  const { rows } = await tx.query<Record<string, any>>(
    `SELECT id, event_type, aggregate_type, aggregate_id, payload, occurred_at
     FROM public.outbox_events WHERE id > $1 ORDER BY id LIMIT $2`,
    [after, limit],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    type: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    occurredAt: iso(row.occurred_at) ?? '',
    payload: json<Record<string, unknown>>(row.payload),
  }));
}
