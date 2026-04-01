/**
 * In-memory cache with TTL.
 * Works on both server (persists across requests in the same process)
 * and client (persists for the browser tab session).
 *
 * Default TTL: CACHE_TIME env var (minutes), fallback 15 min.
 * Per-call TTL can be overridden via the third argument of setCached().
 */

// parseInt(undefined) = NaN on client side — guard with || 15
const DEFAULT_TTL_MS = (parseInt(process.env.CACHE_TIME ?? '', 10) || 15) * 60 * 1000

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

/** @param ttlMs - override default TTL for this entry (milliseconds) */
export function setCached(key: string, data: unknown, ttlMs?: number): void {
  store.set(key, { data, expiresAt: Date.now() + (ttlMs ?? DEFAULT_TTL_MS) })
}
