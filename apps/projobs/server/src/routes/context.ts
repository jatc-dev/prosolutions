import type { AppConfig } from '../config.js';
import type { IdentityVerifier } from '../auth/identity.js';
import type { Database } from '../db/database.js';
import type { ProCvClient } from '../integrations/procv.js';
import type { ExternalJobsProvider } from '../integrations/externalJobs.js';

export type Logger = (message: string, meta?: Record<string, unknown>) => void;

/** Dependencies injected into every router (swappable in tests). */
export interface AppDeps {
  config: AppConfig;
  db: Database;
  verify: IdentityVerifier;
  procv: ProCvClient;
  /** Partner job feeds that are switched on (empty: the section stays hidden). */
  externalJobs?: ExternalJobsProvider[];
  log: Logger;
}
