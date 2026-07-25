import { Injectable } from '@nestjs/common';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
  tags: string[];
  createdAt: number;
  hits: number;
};

type CacheMetric = {
  hits: number;
  misses: number;
  staleHits: number;
  writes: number;
  invalidations: number;
  deduplicated: number;
};

@Injectable()
export class MemoryCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly metric: CacheMetric = { hits: 0, misses: 0, staleHits: 0, writes: 0, invalidations: 0, deduplicated: 0 };

  get<T>(key: string, allowStale = false): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) { this.metric.misses += 1; return undefined; }
    const now = Date.now();
    if (entry.expiresAt > now) {
      entry.hits += 1;
      this.metric.hits += 1;
      return entry.value as T;
    }
    if (allowStale && entry.staleUntil > now) {
      entry.hits += 1;
      this.metric.staleHits += 1;
      return entry.value as T;
    }
    if (entry.staleUntil <= now) this.entries.delete(key);
    this.metric.misses += 1;
    return undefined;
  }

  set<T>(key: string, value: T, ttlMs: number, tags: string[] = [], staleTtlMs = ttlMs * 10): T {
    const now = Date.now();
    this.entries.set(key, { value, expiresAt: now + ttlMs, staleUntil: now + ttlMs + Math.max(0, staleTtlMs), tags, createdAt: now, hits: 0 });
    this.metric.writes += 1;
    return value;
  }

  async remember<T>(key: string, ttlMs: number, factory: () => Promise<T>, tags: string[] = [], staleTtlMs = ttlMs * 10): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) { this.metric.deduplicated += 1; return pending; }
    const promise = factory()
      .then((value) => this.set(key, value, ttlMs, tags, staleTtlMs))
      .catch((error) => {
        const stale = this.get<T>(key, true);
        if (stale !== undefined) return stale;
        throw error;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  invalidateTag(tag: string): void {
    for (const [key, entry] of this.entries) {
      if (entry.tags.includes(tag)) { this.entries.delete(key); this.metric.invalidations += 1; }
    }
  }

  invalidateKey(key: string): void {
    if (this.entries.delete(key)) this.metric.invalidations += 1;
  }

  clear(): void { this.entries.clear(); this.inFlight.clear(); }

  stats() {
    return {
      entries: this.entries.size,
      inFlight: this.inFlight.size,
      ...this.metric,
      hitRate: this.metric.hits + this.metric.staleHits + this.metric.misses === 0
        ? 0
        : Number((((this.metric.hits + this.metric.staleHits) / (this.metric.hits + this.metric.staleHits + this.metric.misses)) * 100).toFixed(2)),
    };
  }
}
