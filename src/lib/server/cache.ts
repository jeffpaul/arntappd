import "server-only";

/** A small in-memory cache with a size bound and per-entry expiry. */
export class TtlCache<V> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh recency.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V, ttlMs = this.ttlMs): void {
    this.map.delete(key);
    this.map.set(key, { value, expires: Date.now() + ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
}

/**
 * Keep one instance per process across dev hot reloads, so caches and budgets
 * are not reset every time a file changes.
 */
export function singleton<T>(name: string, make: () => T): T {
  const g = globalThis as unknown as Record<string, T | undefined>;
  const key = `__arntappd_${name}`;
  if (!g[key]) g[key] = make();
  return g[key] as T;
}
