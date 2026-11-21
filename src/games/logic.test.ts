import { BODIES, PLANET_IDS } from '../data/planets'
import {
  MIN_SIZE_RATIO, biggerOf, checkAnswer, correctSlotFor, isCorrectSlot, isDaytime, keepAway, makeChoiceRound,
  makeChoiceRounds, makeSizeRounds, nearestSlot, nextEmptySlot, scatterStars, seeded, shouldHint, shuffle, sizeRatio,
  stepToward, touching,
} from './logic'

describe('choice games', () => {
  it('makes rounds with 3 distinct choices that include the target', () => {
    const rng = seeded(42)
    for (let i = 0; i < 200; i++) {
      const r = makeChoiceRound(PLANET_IDS, rng)
      expect(r.choices).toHaveLength(3)
      expect(new Set(r.choices).size).toBe(3)
      expect(r.choices).toContain(r.target)
    }
  })

  it('does not repeat the target in a game of 5', () => {
    const rounds = makeChoiceRounds(5, PLANET_IDS, seeded(7))
    expect(new Set(rounds.map((r) => r.target)).size).toBe(5)
    rounds.forEach((r) => expect(r.choices).toContain(r.target))
  })

  it('checks answers and gives a hint after two wrong tries (never a penalty)', () => {
    const r = { target: 'saturn' as const, choices: ['saturn', 'mars', 'earth'] as const }
    expect(checkAnswer({ ...r, choices: [...r.choices] }, 'saturn')).toBe('correct')
    expect(checkAnswer({ ...r, choices: [...r.choices] }, 'mars')).toBe('wrong')
    expect(shouldHint(0)).toBe(false)
    expect(shouldHint(1)).toBe(false)
    expect(shouldHint(2)).toBe(true)
  })

  it('size rounds compare clearly different planets and know the bigger one', () => {
    const rounds = makeSizeRounds(5, seeded(3))
    expect(rounds).toHaveLength(5)
    for (const r of rounds) {
      expect(sizeRatio(r.a, r.b)).toBeGreaterThanOrEqual(MIN_SIZE_RATIO)
      expect(BODIES[r.bigger].diameterKm).toBe(Math.max(BODIES[r.a].diameterKm, BODIES[r.b].diameterKm))
    }
    expect(biggerOf('earth', 'jupiter')).toBe('jupiter')
    expect(biggerOf('mars', 'venus')).toBe('venus')
  })

  it('shuffle keeps all elements', () => {
    expect(shuffle(PLANET_IDS, seeded(1)).sort()).toEqual([...PLANET_IDS].sort())
  })
})

describe('ordering game', () => {
  it('knows the correct slots', () => {
    expect(isCorrectSlot('mercury', 0)).toBe(true)
    expect(isCorrectSlot('earth', 2)).toBe(true)
    expect(isCorrectSlot('earth', 3)).toBe(false)
    expect(correctSlotFor('neptune')).toBe(7)
  })

  it('accepts forgiving drops near a slot', () => {
    const centres = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }]
    expect(nearestSlot({ x: 130, y: 40 }, centres, 80)).toBe(1)
    expect(nearestSlot({ x: 500, y: 500 }, centres, 80)).toBe(-1)
  })

  it('finds the next empty slot', () => {
    expect(nextEmptySlot(['mercury', null, null])).toBe(1)
    expect(nextEmptySlot(['mercury', 'venus'])).toBe(-1)
  })
})

describe('day and night', () => {
  it('is day on the side facing the Sun and night on the other side', () => {
    expect(isDaytime(0)).toBe(true)
    expect(isDaytime(Math.PI)).toBe(false)
    expect(isDaytime(-0.7)).toBe(true)
    expect(isDaytime(2)).toBe(false)
    expect(isDaytime(2 * Math.PI)).toBe(true) // a full turn = a new day
  })
})

describe('space explorer', () => {
  it('moves toward a target without overshooting', () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 1)).toEqual({ x: 10, y: 0 })
    const p = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 10, 1)
    expect(p.x).toBeCloseTo(10)
  })

  it('detects touching and keeps the ship away from the Sun', () => {
    expect(touching({ x: 0, y: 0 }, 5, { x: 8, y: 0 }, 5)).toBe(true)
    expect(touching({ x: 0, y: 0 }, 5, { x: 20, y: 0 }, 5)).toBe(false)
    const p = keepAway({ x: 1, y: 0 }, { x: 0, y: 0 }, 10)
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(10)
  })

  it('scatters stars inside the field and away from planets', () => {
    const avoid = [{ x: 0.5, y: 0.5, r: 0.1 }]
    const stars = scatterStars(12, avoid, seeded(9))
    expect(stars).toHaveLength(12)
    for (const s of stars) {
      expect(s.x).toBeGreaterThan(0)
      expect(s.x).toBeLessThan(1)
      expect(Math.hypot(s.x - 0.5, s.y - 0.5)).toBeGreaterThan(0.1)
    }
  })
})
