import type { CompanyVerificationStatus } from '../contracts.js';

/** Consumer mailbox providers: an address there proves nothing about a company. */
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com',
  'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.com.mx', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.es', 'zoho.com', 'mail.com', 'yandex.com',
]);

/** While unverified, a company may keep at most this many jobs published. */
export const PENDING_COMPANY_PUBLISHED_JOB_LIMIT = 3;

function emailDomain(email: string | null): string | null {
  const domain = email?.trim().toLowerCase().split('@')[1];
  return domain && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ? domain : null;
}

function websiteHost(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export interface VerificationDecision {
  status: CompanyVerificationStatus;
  method: 'email_domain' | 'manual' | null;
}

/**
 * Automatic verification for self-service onboarding:
 *  - recruiters granted PRORECRUIT by an administrator are trusted (manual);
 *  - a corporate email on the company's own website domain verifies it;
 *  - everything else stays pending until an administrator reviews it.
 */
export function decideVerification(input: {
  email: string | null;
  website: string | null | undefined;
  grantedRecruiter: boolean;
}): VerificationDecision {
  if (input.grantedRecruiter) return { status: 'verified', method: 'manual' };
  const domain = emailDomain(input.email);
  const host = websiteHost(input.website);
  if (!domain || !host || FREE_EMAIL_DOMAINS.has(domain)) return { status: 'pending', method: null };
  const matches = host === domain || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
  return matches ? { status: 'verified', method: 'email_domain' } : { status: 'pending', method: null };
}
