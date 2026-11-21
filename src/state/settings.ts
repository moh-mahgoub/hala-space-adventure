import { DEFAULT_CHILD_NAME } from '../content/lines'
import { createPersistedStore, useStore } from './store'

export type MotionPref = 'system' | 'reduce' | 'full'
export type ExploreMode = 'guided' | 'free'

export interface Settings {
  childName: string
  narration: boolean
  sfx: boolean
  music: boolean
  captions: boolean
  /** quick mute from the child-facing speaker button */
  muted: boolean
  /** 0..1 master volume */
  volume: number
  /** speech rate, 0.6..1.3 */
  rate: number
  motion: MotionPref
  mode: ExploreMode
}

export const DEFAULT_SETTINGS: Settings = {
  childName: DEFAULT_CHILD_NAME,
  narration: true,
  sfx: true,
  music: false,
  captions: true,
  muted: false,
  volume: 0.85,
  rate: 0.9,
  motion: 'system',
  mode: 'guided',
}

const clamp = (n: unknown, lo: number, hi: number, d: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d

export function sanitizeSettings(raw: Partial<Settings>): Settings {
  const d = DEFAULT_SETTINGS
  const name = typeof raw.childName === 'string' ? raw.childName.trim().slice(0, 24) : ''
  return {
    childName: name || d.childName,
    narration: typeof raw.narration === 'boolean' ? raw.narration : d.narration,
    sfx: typeof raw.sfx === 'boolean' ? raw.sfx : d.sfx,
    music: typeof raw.music === 'boolean' ? raw.music : d.music,
    captions: typeof raw.captions === 'boolean' ? raw.captions : d.captions,
    muted: raw.muted === true,
    volume: clamp(raw.volume, 0, 1, d.volume),
    rate: clamp(raw.rate, 0.6, 1.3, d.rate),
    motion: raw.motion === 'reduce' || raw.motion === 'full' ? raw.motion : 'system',
    mode: raw.mode === 'free' ? 'free' : 'guided',
  }
}

export const settingsStore = createPersistedStore<Settings>('settings', DEFAULT_SETTINGS, sanitizeSettings)

export const useSettings = () => useStore(settingsStore)
export const updateSettings = (p: Partial<Settings>) => settingsStore.set(p)

export function systemPrefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

export function isReducedMotion(s: Settings = settingsStore.get()): boolean {
  if (s.motion === 'reduce') return true
  if (s.motion === 'full') return false
  return systemPrefersReducedMotion()
}
