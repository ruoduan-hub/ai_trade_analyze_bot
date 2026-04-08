import { openDB, type IDBPDatabase } from 'idb'
import type { AnalysisRecord } from '@/types'
import type { MarketOption } from '@/app/api/markets/route'

const DB_NAME = 'crypto-advisor'
const DB_VERSION = 4
const STORE_NAME = 'analyses'
const MARKETS_STORE = 'markets-cache'

/** markets-cache 中的缓存条目结构 */
interface MarketsCacheEntry {
  key: string           // 固定为 'markets'
  data: MarketOption[]
  cachedAt: number      // Date.now()
}

/** 3 天缓存，单位 ms */
const MARKETS_CACHE_TTL = 3 * 24 * 60 * 60 * 1000

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (oldVersion < 2) {
        // v1 升级：analyses store 已存在，只新增 markets-cache store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
        db.createObjectStore(MARKETS_STORE, { keyPath: 'key' })
      }
      if (oldVersion < 3) {
        // v2→v3：markets-cache 数据结构变更（symbol 字段格式从 CCXT unified 改为 base/quote）
        // 重建 store 以清空旧缓存，强制重新从 API 拉取
        if (db.objectStoreNames.contains(MARKETS_STORE)) {
          db.deleteObjectStore(MARKETS_STORE)
        }
        db.createObjectStore(MARKETS_STORE, { keyPath: 'key' })
      }
      if (oldVersion < 4) {
        // v3→v4：MarketOption 新增 info 字段（精度、手续费、杠杆等合约信息）
        // 清空旧缓存，强制重新拉取带 info 字段的数据
        if (db.objectStoreNames.contains(MARKETS_STORE)) {
          db.deleteObjectStore(MARKETS_STORE)
        }
        db.createObjectStore(MARKETS_STORE, { keyPath: 'key' })
      }
    },
  })
  return dbInstance
}

export async function saveAnalysis(record: AnalysisRecord): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, record)
}

export async function getAllAnalyses(): Promise<AnalysisRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex(STORE_NAME, 'timestamp')
  return all.reverse() // newest first
}

export async function getAnalysis(id: string): Promise<AnalysisRecord | undefined> {
  const db = await getDB()
  return db.get(STORE_NAME, id)
}

export async function updateAnalysis(id: string, patch: Partial<AnalysisRecord>): Promise<void> {
  const db = await getDB()
  const existing = await db.get(STORE_NAME, id)
  if (existing) {
    await db.put(STORE_NAME, { ...existing, ...patch })
  }
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function clearAllAnalyses(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}

export async function countAnalyses(): Promise<number> {
  const db = await getDB()
  return db.count(STORE_NAME)
}

// ─── Markets 缓存（3 天 TTL）────────────────────────────────────────────────

/**
 * 从 IndexedDB 读取市场列表缓存。
 * 若缓存不存在或已超过 3 天，返回 null。
 */
export async function getCachedMarkets(): Promise<MarketOption[] | null> {
  const db = await getDB()
  const entry: MarketsCacheEntry | undefined = await db.get(MARKETS_STORE, 'markets')
  if (!entry) return null
  if (Date.now() - entry.cachedAt > MARKETS_CACHE_TTL) return null
  return entry.data
}

/**
 * 将市场列表写入 IndexedDB 缓存，同时记录写入时间戳。
 */
export async function setCachedMarkets(data: MarketOption[]): Promise<void> {
  const db = await getDB()
  const entry: MarketsCacheEntry = { key: 'markets', data, cachedAt: Date.now() }
  await db.put(MARKETS_STORE, entry)
}
