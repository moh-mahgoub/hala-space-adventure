/**
 * Pure game logic (no React, no DOM) — unit-tested in logic.test.ts.
 */
import { BODIES, PLANET_IDS, type BodyId, type PlanetId } from '../data/planets'

export type Rng = () => number

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Small seeded RNG for reproducible tests */
export function seeded(seed: number): Rng {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 1_000_000) / 1_000_000
  }
}

// ── Choice games (Find the planet / Whose shadow?) ────────────────────────

export interface ChoiceRound {
  target: BodyId
  choices: BodyId[]
}

/**
 * Pick a target and `n` distinct choices that include it.
 * Avoids repeating the previous target.
 */
export function makeChoiceRound(pool: readonly BodyId[], rng: Rng = Math.random, avoid?: BodyId, n = 3): ChoiceRound {
  const candidates = pool.filter((p) => p !== avoid)
  const target = candidates[Math.floor(rng() * candidates.length)]
  const others = shuffle(
    pool.filter((p) => p !== target),
    rng,
  ).slice(0, n - 1)
  return { target, choices: shuffle([target, ...others], rng) }
}

export function makeChoiceRounds(count: number, pool: readonly BodyId[] = PLANET_IDS, rng: Rng = Math.random): ChoiceRound[] {
  const rounds: ChoiceRound[] = []
  const usedTargets = new Set<BodyId>()
  for (let i = 0; i < count; i++) {
    // prefer targets not yet asked in this game
    const fresh = pool.filter((p) => !usedTargets.has(p))
    const r = makeChoiceRound(fresh.length ? fresh : pool, rng, rounds[i - 1]?.target)
    // choices may come from the full pool
    const others = shuffle(
      pool.filter((p) => p !== r.target),
      rng,
    ).slice(0, 2)
    const round = { target: r.target, choices: shuffle([r.target, ...others], rng) }
    usedTargets.add(round.target)
    rounds.push(round)
  }
  return rounds
}

export type Answer = 'correct' | 'wrong'

export function checkAnswer(round: ChoiceRound, choice: BodyId): Answer {
  return choice === round.target ? 'correct' : 'wrong'
}

/** After this many wrong tries the correct answer starts glowing */
export const HINT_AFTER = 2

export function shouldHint(wrongTries: number): boolean {
  return wrongTries >= HINT_AFTER
}

// ── Which is bigger? ──────────────────────────────────────────────────────

export interface SizeRound {
  a: PlanetId
  b: PlanetId
  bigger: PlanetId
}

export function biggerOf(a: BodyId, b: BodyId): BodyId {
  return BODIES[a].diameterKm >= BODIES[b].diameterKm ? a : b
}

/** Pairs must differ by at least this ratio so the answer is meaningful (no Uranus vs Neptune). */
export const MIN_SIZE_RATIO = 1.5

export function sizeRatio(a: BodyId, b: BodyId): number {
  const da = BODIES[a].diameterKm
  const db = BODIES[b].diameterKm
  return Math.max(da, db) / Math.min(da, db)
}

export function validSizePairs(): [PlanetId, PlanetId][] {
  const pairs: [PlanetId, PlanetId][] = []
  PLANET_IDS.forEach((a, i) =>
    PLANET_IDS.slice(i + 1).forEach((b) => {
      if (sizeRatio(a, b) >= MIN_SIZE_RATIO) pairs.push([a, b])
    }),
  )
  return pairs
}

export function makeSizeRounds(count: number, rng: Rng = Math.random): SizeRound[] {
  const pairs = shuffle(validSizePairs(), rng).slice(0, count)
  return pairs.map(([x, y]) => {
    const [a, b] = rng() > 0.5 ? [x, y] : [y, x]
    return { a, b, bigger: biggerOf(a, b) as PlanetId }
  })
}

// ── Build the solar system (ordering) ─────────────────────────────────────

/** slot index 0 = closest to the Sun */
export function isCorrectSlot(planet: PlanetId, slotIndex: number): boolean {
  return PLANET_IDS[slotIndex] === planet
}

export function correctSlotFor(planet: PlanetId): number {
  return PLANET_IDS.indexOf(planet)
}

export interface Point {
  x: number
  y: number
}

/** Index of the nearest slot centre within maxDist (forgiving drop), or -1 */
export function nearestSlot(p: Point, centres: readonly Point[], maxDist: number): number {
  let best = -1
  let bestD = Infinity
  centres.forEach((c, i) => {
    const d = Math.hypot(c.x - p.x, c.y - p.y)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return bestD <= maxDist ? best : -1
}

/** The next empty slot (used for the easy-mode highlight) */
export function nextEmptySlot(filled: readonly (PlanetId | null)[]): number {
  return filled.findIndex((f) => f == null)
}

// ── Day & night ────────────────────────────────────────────────────────────

/**
 * Sun is at angle 0 (to the right of Earth, in screen coordinates).
 * A place on Earth's rim at `angle` (radians) is in daylight when it faces the Sun.
 */
export function isDaytime(angle: number): boolean {
  return Math.cos(angle) > 0
}

// ── Space explorer ─────────────────────────────────────────────────────────

/** Move `pos` toward `target` by at most speed*dt. Returns a new point. */
export function stepToward(pos: Point, target: Point, speed: number, dt: number): Point {
  const dx = target.x - pos.x
  const dy = target.y - pos.y
  const d = Math.hypot(dx, dy)
  const step = speed * dt
  if (d <= step || d === 0) return { ...target }
  return { x: pos.x + (dx / d) * step, y: pos.y + (dy / d) * step }
}

export function touching(a: Point, ra: number, b: Point, rb: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= ra + rb
}

/** Keep a point at least `minDist` away from `centre` (the ship can't fly into the Sun). */
export function keepAway(p: Point, centre: Point, minDist: number): Point {
  const dx = p.x - centre.x
  const dy = p.y - centre.y
  const d = Math.hypot(dx, dy)
  if (d >= minDist) return p
  if (d === 0) return { x: centre.x - minDist, y: centre.y }
  return { x: centre.x + (dx / d) * minDist, y: centre.y + (dy / d) * minDist }
}

/** Scatter `n` stars avoiding the given circles. Coordinates are 0..1. */
export function scatterStars(
  n: number,
  avoid: { x: number; y: number; r: number }[],
  rng: Rng = Math.random,
  margin = 0.06,
): Point[] {
  const out: Point[] = []
  let guard = 0
  while (out.length < n && guard++ < 5000) {
    const p = { x: margin + rng() * (1 - 2 * margin), y: margin + 0.06 + rng() * (1 - 2 * margin - 0.06) }
    if (avoid.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < a.r + 0.05)) continue
    if (out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 0.08)) continue
    out.push(p)
  }
  return out
}
