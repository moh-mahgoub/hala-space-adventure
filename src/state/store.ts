import { useSyncExternalStore } from 'react'
import { readJSON, writeJSON } from './storage'

/** Minimal persisted store (no external deps). */
export interface Store<T> {
  get(): T
  set(patch: Partial<T> | ((prev: T) => Partial<T>)): void
  replace(next: T): void
  subscribe(fn: () => void): () => void
}

export function createPersistedStore<T extends object>(
  key: string,
  defaults: T,
  sanitize: (raw: Partial<T>) => T,
): Store<T> {
  let state: T = sanitize({ ...defaults, ...readJSON<Partial<T>>(key, {}) })
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch
      state = sanitize({ ...state, ...p })
      writeJSON(key, state)
      emit()
    },
    replace(next) {
      state = sanitize(next)
      writeJSON(key, state)
      emit()
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
