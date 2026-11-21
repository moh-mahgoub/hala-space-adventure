/**
 * Surprise moments are special because they are RARE: each eligible moment
 * has a small chance, and after one fires there's a long cooldown.
 * rng/clock are injectable for tests.
 */
export type SurpriseKind = 'bigHelmet' | 'upsideDown' | 'alien' | 'sticker'

export interface SurpriseOptions {
  rng?: () => number
  now?: () => number
  chance?: number
  cooldownMs?: number
}

/** Debug/test switch: localStorage['hala-space:debug-surprises'] = 'always' | 'never' */
function debugMode(): 'always' | 'never' | null {
  try {
    const v = globalThis.localStorage?.getItem('hala-space:debug-surprises')
    return v === 'always' || v === 'never' ? v : null
  } catch {
    return null
  }
}

export function createSurprises({ rng = Math.random, now = () => Date.now(), chance = 0.35, cooldownMs = 90_000 }: SurpriseOptions = {}) {
  let last = -Infinity
  const seen = new Map<SurpriseKind, number>()
  return {
    /** Should this surprise happen now? Records it if yes. */
    maybe(kind: SurpriseKind): boolean {
      const dbg = debugMode()
      if (dbg) return dbg === 'always'
      const t = now()
      if (t - last < cooldownMs) return false
      // the same surprise doesn't repeat too soon either
      if (t - (seen.get(kind) ?? -Infinity) < cooldownMs * 3) return false
      if (rng() >= chance) return false
      last = t
      seen.set(kind, t)
      return true
    },
  }
}

export const surprises = createSurprises()
