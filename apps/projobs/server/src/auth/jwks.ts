import { createPublicKey, type KeyObject } from 'node:crypto';

/**
 * In-memory cache of ProIdentity's public signing keys (JWKS).
 *
 * Verification stays synchronous: keys are loaded at startup and refreshed in
 * the background. A token signed with an unknown `kid` triggers a refresh
 * (rate-limited) and is rejected; the client simply retries after refreshing
 * its session, which picks up the rotated key.
 */
export interface KeyStore {
  getKey(kid: string): KeyObject | undefined;
  refresh(): Promise<void>;
  readonly size: number;
}

interface Jwk {
  kty?: string;
  crv?: string;
  kid?: string;
  alg?: string;
  use?: string;
  x?: string;
  y?: string;
}

const MIN_REFRESH_INTERVAL_MS = 30_000;

export function keysFromJwks(body: unknown): Map<string, KeyObject> {
  const keys = new Map<string, KeyObject>();
  const list = (body as { keys?: unknown })?.keys;
  if (!Array.isArray(list)) return keys;
  for (const raw of list as Jwk[]) {
    if (!raw || raw.kty !== 'EC' || raw.crv !== 'P-256' || typeof raw.kid !== 'string') continue;
    if (raw.use && raw.use !== 'sig') continue;
    try {
      keys.set(raw.kid, createPublicKey({ key: { kty: raw.kty, crv: raw.crv, x: raw.x, y: raw.y }, format: 'jwk' }));
    } catch {
      // Skip malformed keys; the remaining keys stay usable.
    }
  }
  return keys;
}

export function createJwksKeyStore(options: {
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}): KeyStore {
  const fetchImpl = options.fetchImpl ?? fetch;
  let keys = new Map<string, KeyObject>();
  let lastAttempt = 0;
  let inflight: Promise<void> | null = null;

  async function load(): Promise<void> {
    lastAttempt = Date.now();
    const response = await fetchImpl(options.url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });
    if (!response.ok) throw new Error(`JWKS request failed with ${response.status}`);
    const next = keysFromJwks(await response.json());
    if (next.size > 0) keys = next;
  }

  function refresh(): Promise<void> {
    if (!inflight) {
      inflight = load()
        .catch((error: unknown) => {
          options.log?.('jwks refresh failed', { error: error instanceof Error ? error.message : String(error) });
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  }

  return {
    getKey(kid: string) {
      const key = keys.get(kid);
      if (!key && Date.now() - lastAttempt > MIN_REFRESH_INTERVAL_MS) void refresh();
      return key;
    },
    refresh,
    get size() {
      return keys.size;
    },
  };
}

/** Fixed key store, used by tests and for static configuration. */
export function staticKeyStore(keys: Map<string, KeyObject>): KeyStore {
  return {
    getKey: (kid) => keys.get(kid),
    refresh: async () => undefined,
    get size() {
      return keys.size;
    },
  };
}
