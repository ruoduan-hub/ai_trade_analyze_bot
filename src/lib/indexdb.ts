import { openDB, type IDBPDatabase } from 'idb'
import type { AnalysisRecord } from '@/types'

const DB_NAME = 'crypto-advisor'
const DB_VERSION = 1
const STORE_NAME = 'analyses'

let dbInstance: IDBPDatabase | null = null

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
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

export async function clearAllAnalyses(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}

export async function countAnalyses(): Promise<number> {
  const db = await getDB()
  return db.count(STORE_NAME)
}
