import prisma from '../prismaClient';

/**
 * Personal-data consent purposes (Ley 1581 de 2012 / GDPR).
 * Bump a purpose's version whenever its legal text changes materially; users
 * are then asked again because their stored decision refers to an old text.
 */
export const CONSENT_PURPOSES = {
  /** Required: processing of account data under the privacy policy. */
  privacy_policy: { version: '2026-11', required: true },
  /** Optional: product news and tips by email. */
  marketing_emails: { version: '2026-11', required: false },
  /** Optional: job alert emails based on saved searches. */
  job_alert_emails: { version: '2026-11', required: false },
} as const;

export type ConsentPurpose = keyof typeof CONSENT_PURPOSES;

export function isConsentPurpose(value: unknown): value is ConsentPurpose {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CONSENT_PURPOSES, value);
}

export interface ConsentStatus {
  purpose: ConsentPurpose;
  required: boolean;
  currentVersion: string;
  granted: boolean;
  /** Version the stored decision refers to (null if never decided). */
  version: string | null;
  decidedAt: string | null;
  /** True when the user must (re)confirm: required and not granted for the current version. */
  actionRequired: boolean;
}

export async function recordConsent(input: {
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  source: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  client?: Pick<typeof prisma, 'userConsent'>;
}) {
  const client = input.client ?? prisma;
  return client.userConsent.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      version: CONSENT_PURPOSES[input.purpose].version,
      granted: input.granted,
      source: input.source.slice(0, 60),
      ipAddress: input.ipAddress ? input.ipAddress.slice(0, 120) : null,
      userAgent: input.userAgent ? input.userAgent.slice(0, 500) : null,
    },
  });
}

export async function getConsentStatus(userId: string): Promise<ConsentStatus[]> {
  const rows = await prisma.userConsent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return (Object.keys(CONSENT_PURPOSES) as ConsentPurpose[]).map((purpose) => {
    const definition = CONSENT_PURPOSES[purpose];
    const latest = rows.find((row) => row.purpose === purpose);
    const granted = Boolean(latest?.granted && latest.version === definition.version);
    return {
      purpose,
      required: definition.required,
      currentVersion: definition.version,
      granted,
      version: latest?.version ?? null,
      decidedAt: latest?.createdAt.toISOString() ?? null,
      actionRequired: definition.required && !granted,
    };
  });
}

export async function getConsentHistory(userId: string) {
  return prisma.userConsent.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { purpose: true, version: true, granted: true, source: true, createdAt: true },
  });
}
