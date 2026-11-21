/**
 * Browser-local image storage (IndexedDB). Photos NEVER leave the device:
 * there is no upload code anywhere in this app.
 *
 * If IndexedDB is unavailable (some private-browsing modes), we fall back to
 * memory: the picture works until the page is closed, and the parent panel says so.
 */
const DB_NAME = 'hala-space-images'
const STORE = 'images'
const VERSION = 1

export type ImageKey = 'photo-original' | 'photo-face' | 'cartoon-original' | 'cartoon-face'

const memory = new Map<ImageKey, Blob>()
let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const idb = globalThis.indexedDB
      if (!idb) return resolve(null)
      const req = idb.open(DB_NAME, VERSION)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) return reject(new Error('no-idb'))
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

/** true when images will survive a reload (IndexedDB works) */
export async function isPersistent(): Promise<boolean> {
  return (await openDb()) != null
}

export async function putImage(key: ImageKey, blob: Blob): Promise<void> {
  memory.set(key, blob)
  try {
    await tx('readwrite', (s) => s.put(blob, key))
  } catch {
    /* memory only */
  }
}

export async function getImage(key: ImageKey): Promise<Blob | null> {
  try {
    const v = await tx<Blob>('readonly', (s) => s.get(key) as IDBRequest<Blob>)
    if (v) return v
  } catch {
    /* fall through */
  }
  return memory.get(key) ?? null
}

export async function deleteImage(key: ImageKey): Promise<void> {
  memory.delete(key)
  try {
    await tx('readwrite', (s) => s.delete(key))
  } catch {
    /* ignore */
  }
}

/** test helper */
export function _resetForTests() {
  memory.clear()
  dbPromise = null
}
