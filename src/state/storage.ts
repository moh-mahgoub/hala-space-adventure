/** Safe localStorage wrapper — private mode / blocked storage must never crash the app. */
export const STORAGE_PREFIX = 'hala-space:'

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_PREFIX + key)
  } catch {
    /* ignore */
  }
}
