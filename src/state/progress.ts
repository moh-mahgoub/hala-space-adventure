import { ALL_BODY_IDS, PLANET_IDS, isBodyId, type BodyId } from '../data/planets'
import { createPersistedStore, useStore } from './store'

/**
 * Learning progress. Stars are a finite set of achievements (each earned once),
 * so there is no endless reward loop — but everything stays replayable.
 */
export interface Progress {
  visited: BodyId[]
  /** achievement keys, e.g. "visit:earth", "activity:mars", "game:find", "story:sun" */
  stars: string[]
  /** shown the "all 8 planets" celebration already */
  celebratedAll: boolean
}

export const GAME_IDS = ['find', 'order', 'dayNight', 'explorer', 'shadow', 'size'] as const
export type GameId = (typeof GAME_IDS)[number]

export const EMPTY_PROGRESS: Progress = { visited: [], stars: [], celebratedAll: false }

export function sanitizeProgress(raw: Partial<Progress>): Progress {
  const visited = Array.isArray(raw.visited) ? [...new Set(raw.visited.filter(isBodyId))] : []
  const stars = Array.isArray(raw.stars) ? [...new Set(raw.stars.filter((s) => typeof s === 'string'))] : []
  return { visited, stars, celebratedAll: raw.celebratedAll === true }
}

export const progressStore = createPersistedStore<Progress>('progress', EMPTY_PROGRESS, sanitizeProgress)
export const useProgress = () => useStore(progressStore)

/** Award a star once. Returns true if it is new. */
export function awardStar(key: string): boolean {
  if (progressStore.get().stars.includes(key)) return false
  progressStore.set((p) => ({ stars: [...p.stars, key] }))
  return true
}

/** Mark a body as visited (also awards its visit star). Returns true if newly visited. */
export function markVisited(id: BodyId): boolean {
  const p = progressStore.get()
  if (p.visited.includes(id)) return false
  progressStore.set({ visited: [...p.visited, id] })
  awardStar(`visit:${id}`)
  return true
}

export function visitedAllPlanets(p: Progress = progressStore.get()): boolean {
  return PLANET_IDS.every((id) => p.visited.includes(id))
}

export function resetProgress(): void {
  progressStore.replace(EMPTY_PROGRESS)
}

/** Every star that exists in the app, for "X of Y". */
export function allStarKeys(storyChapterIds: string[]): string[] {
  return [
    ...ALL_BODY_IDS.map((id) => `visit:${id}`),
    ...ALL_BODY_IDS.map((id) => `activity:${id}`),
    ...GAME_IDS.map((g) => `game:${g}`),
    ...storyChapterIds.map((c) => `story:${c}`),
  ]
}

export interface Badge {
  id: string
  icon: string
  title: string
  earned: (p: Progress) => boolean
}

export const BADGES: Badge[] = [
  { id: 'first', icon: '🚀', title: 'أول رحلة', earned: (p) => p.visited.length > 0 },
  { id: 'sunmoon', icon: '🌞', title: 'صاحبة الشمس والقمر', earned: (p) => p.visited.includes('sun') && p.visited.includes('moon') },
  { id: 'explorer', icon: '🪐', title: 'مستكشفة الكواكب', earned: (p) => visitedAllPlanets(p) },
  { id: 'scientist', icon: '🔬', title: 'عالمة صغيرة', earned: (p) => p.stars.filter((s) => s.startsWith('activity:')).length >= 5 },
  { id: 'gamer', icon: '🎮', title: 'بطلة الألعاب', earned: (p) => GAME_IDS.every((g) => p.stars.includes(`game:${g}`)) },
  { id: 'story', icon: '📖', title: 'حكاية الكواكب', earned: (p) => p.stars.includes('story:home') },
  /** the secret mission: found the heart on the dwarf planet Pluto */
  { id: 'pluto', icon: '🤍', title: 'شارة مستكشفة بلوتو', earned: (p) => p.stars.includes('activity:pluto') },
]
