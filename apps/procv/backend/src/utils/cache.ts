// Simple in-memory cache with TTL
// In production, you might want to use Redis or another distributed cache

interface CacheItem {
  value: string; // Store as JSON string
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheItem> = new Map();

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return JSON.parse(item.value) as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value: JSON.stringify(value), expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  // Clean up expired items periodically
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new Cache();

// Start periodic cleanup every 5 minutes
setInterval(
  () => {
    cache.cleanup();
  },
  5 * 60 * 1000,
);
