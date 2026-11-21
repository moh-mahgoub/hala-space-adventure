import { createSurprises } from './surprises'

describe('surprises are rare', () => {
  it('respects chance and a global cooldown', () => {
    let t = 0
    const s = createSurprises({ rng: () => 0, now: () => t, chance: 0.35, cooldownMs: 1000 })
    expect(s.maybe('bigHelmet')).toBe(true)
    expect(s.maybe('alien')).toBe(false) // cooldown
    t = 1500
    expect(s.maybe('alien')).toBe(true)
    t = 2600 // global cooldown over, but the same surprise needs 3× longer
    expect(s.maybe('bigHelmet')).toBe(false)
  })

  it('does not fire when the dice say no', () => {
    const s = createSurprises({ rng: () => 0.9, now: () => 0 })
    expect(s.maybe('sticker')).toBe(false)
  })

  it('fires rarely over many chances', () => {
    let t = 0
    const s = createSurprises({ now: () => (t += 5_000) }) // a chance every 5 s
    let fired = 0
    for (let i = 0; i < 720; i++) if (s.maybe(i % 2 ? 'bigHelmet' : 'sticker')) fired++ // one hour
    expect(fired).toBeGreaterThan(0)
    expect(fired).toBeLessThanOrEqual(40) // never more than once per 90 s
  })

  it('debug switch forces on/off', () => {
    localStorage.setItem('hala-space:debug-surprises', 'always')
    expect(createSurprises({ rng: () => 0.99 }).maybe('alien')).toBe(true)
    localStorage.setItem('hala-space:debug-surprises', 'never')
    expect(createSurprises({ rng: () => 0 }).maybe('alien')).toBe(false)
    localStorage.removeItem('hala-space:debug-surprises')
  })
})
