import { readJSON, writeJSON, STORAGE_PREFIX } from './storage'
import { DEFAULT_SETTINGS, sanitizeSettings, settingsStore, isReducedMotion } from './settings'
import { BADGES, awardStar, markVisited, progressStore, resetProgress, sanitizeProgress, visitedAllPlanets } from './progress'
import { PLANET_IDS } from '../data/planets'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
    settingsStore.replace(DEFAULT_SETTINGS)
  })

  it('defaults the child name to حلا', () => {
    expect(DEFAULT_SETTINGS.childName).toBe('حلا')
    expect(sanitizeSettings({}).childName).toBe('حلا')
    expect(sanitizeSettings({ childName: '   ' }).childName).toBe('حلا')
  })

  it('persists to localStorage', () => {
    settingsStore.set({ childName: 'ليلى', music: true, rate: 1.1 })
    const raw = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'settings')!)
    expect(raw).toMatchObject({ childName: 'ليلى', music: true, rate: 1.1 })
  })

  it('sanitizes bad values', () => {
    const s = sanitizeSettings({ volume: 7, rate: -2, motion: 'weird' as never, mode: 'x' as never, narration: 'yes' as never })
    expect(s.volume).toBe(1)
    expect(s.rate).toBe(0.6)
    expect(s.motion).toBe('system')
    expect(s.mode).toBe('guided')
    expect(s.narration).toBe(true)
  })

  it('reduced motion: parent override beats the system setting', () => {
    expect(isReducedMotion({ ...DEFAULT_SETTINGS, motion: 'reduce' })).toBe(true)
    expect(isReducedMotion({ ...DEFAULT_SETTINGS, motion: 'full' })).toBe(false)
  })
})

describe('progress', () => {
  beforeEach(() => resetProgress())

  it('awards each star only once', () => {
    expect(awardStar('game:find')).toBe(true)
    expect(awardStar('game:find')).toBe(false)
    expect(progressStore.get().stars).toEqual(['game:find'])
  })

  it('marks visits, awards a visit star and persists', () => {
    expect(markVisited('mars')).toBe(true)
    expect(markVisited('mars')).toBe(false)
    expect(progressStore.get().stars).toContain('visit:mars')
    expect(readJSON<{ visited: string[] }>('progress', { visited: [] }).visited).toEqual(['mars'])
  })

  it('detects when all eight planets are visited and earns the explorer badge', () => {
    PLANET_IDS.slice(0, 7).forEach(markVisited)
    expect(visitedAllPlanets()).toBe(false)
    markVisited('neptune')
    expect(visitedAllPlanets()).toBe(true)
    expect(BADGES.find((b) => b.id === 'explorer')!.earned(progressStore.get())).toBe(true)
  })

  it('reset clears progress', () => {
    markVisited('earth')
    resetProgress()
    expect(progressStore.get()).toEqual({ visited: [], stars: [], celebratedAll: false })
  })

  it('ignores corrupt stored data', () => {
    expect(sanitizeProgress({ visited: ['vulcan', 'earth', 'earth'] as never, stars: [1, 'a'] as never })).toEqual({
      visited: ['earth'],
      stars: ['a'],
      celebratedAll: false,
    })
  })
})

describe('storage', () => {
  it('survives a broken localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded')
    })
    expect(() => writeJSON('x', { a: 1 })).not.toThrow()
    spy.mockRestore()
    localStorage.setItem(STORAGE_PREFIX + 'bad', '{not json')
    expect(readJSON('bad', 42)).toBe(42)
  })
})
