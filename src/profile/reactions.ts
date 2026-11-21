/**
 * Character reactions: the child's astronaut responds to what she actually did
 * (tapped the Sun, found Saturn's rings, answered correctly, finished the journey…).
 * `react()` shows the animated reaction and returns the narration line so the
 * caller can put it in the right place in its own narration sequence.
 */
import { line, type Line } from '../content/lines'
import type { Pose } from '../components/character/AstronautCharacter'
import { surprises } from './surprises'

export type ReactionKind =
  | 'sun'
  | 'saturn'
  | 'correct'
  | 'journey'
  | 'moonFlag'
  | 'rover'
  | 'mission'
  | 'alien'
  | 'bigHelmet'
  | 'upsideDown'
  | 'sticker'

export const REACTION_POSE: Record<ReactionKind, Pose> = {
  sun: 'wave',
  saturn: 'cheer',
  correct: 'cheer',
  journey: 'dance',
  moonFlag: 'flag',
  rover: 'wave',
  mission: 'dance',
  alien: 'wave',
  bigHelmet: 'stand',
  upsideDown: 'float',
  sticker: 'cheer',
}

export interface ReactionEvent {
  id: number
  kind: ReactionKind
  pose: Pose
  line: Line
  bigHelmet: boolean
  upsideDown: boolean
  sticker: boolean
}

type Listener = (e: ReactionEvent) => void
const listeners = new Set<Listener>()
let counter = 0

export function onReaction(fn: Listener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Trigger a reaction. Occasionally (rarely) a happy reaction comes with a
 * surprise twist: an oversized helmet or a funny sticker.
 */
let lastAt = 0
/** ms since the last reaction (lets callers avoid stacking reactions) */
export function msSinceLastReaction(now = Date.now()): number {
  return now - lastAt
}

export function react(kind: ReactionKind, opts: { allowSurprise?: boolean; line?: Line } = {}): Line {
  const allow = opts.allowSurprise ?? (kind === 'correct' || kind === 'mission')
  let bigHelmet = kind === 'bigHelmet'
  let sticker = kind === 'sticker'
  if (allow && !bigHelmet && !sticker) {
    if (surprises.maybe('bigHelmet')) bigHelmet = true
    else if (kind === 'mission' && surprises.maybe('sticker')) sticker = true
  }
  const ev: ReactionEvent = {
    id: ++counter,
    kind,
    pose: REACTION_POSE[kind],
    line: opts.line ?? line(`reactions.${kind}`),
    bigHelmet,
    upsideDown: kind === 'upsideDown',
    sticker,
  }
  lastAt = Date.now()
  listeners.forEach((l) => l(ev))
  return ev.line
}
