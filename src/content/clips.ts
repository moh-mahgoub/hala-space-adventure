/**
 * Clip catalogue — which prerecorded clips exist, who speaks them, and how a
 * line the app wants to say turns into a sequence of clips.
 *
 *  • Static lines (no blanks except the child's name) are ONE clip, id = line id.
 *  • Lines with game-time blanks ({planet}, {chosen}…) are pre-expanded per
 *    planet, e.g. `games.find.question.saturn`, or composed from pieces, e.g.
 *    `common.thisIs.earth` + `games.find.tryAgain.saturn`.
 *
 * Used by the runtime player AND by the development-time generator (via
 * audio-pipeline/build-manifest.mjs), so the two can never disagree.
 */
import { BODIES, PLANET_IDS, TOUR_ORDER, type BodyId } from '../data/planets'
import { DEFAULT_CHILD_NAME, fill, templateFor, type Line, type Params } from './lines'
import { script } from './script'
import { STORY } from './story'

export type Speaker = 'narrator' | 'zizo'

export interface ClipDef {
  id: string
  speaker: Speaker
  /** canonical text, with the default name filled in (what the recording says) */
  text: string
  /** pronunciation-only spelling sent to the voice (never shown on screen) */
  synthText?: string
  emotion: string
}

/**
 * Pronunciation help for the voice. Applied only to the listed clips (so
 * recordings that already sound right are not re-recorded). Display text never changes.
 */
export const PRONUNCIATION: { from: string; to: string; ids: string[] }[] = [
  {
    // «المشتري» — guide the voice to el-moshtari
    from: 'المشتري',
    to: 'المُشْتَرِي',
    ids: [
      'games.find.correct.jupiter',
      'games.order.wrong.jupiter',
      'games.size.question.jupiter.earth',
      'games.size.question.jupiter.mars',
      'games.size.question.jupiter.uranus',
      'games.size.question.jupiter.neptune',
      'story.jupiter.0',
    ],
  },
]

export function synthTextFor(id: string, text: string): string | undefined {
  let out = text
  for (const p of PRONUNCIATION) if (p.ids.includes(id)) out = out.split(p.from).join(p.to)
  return out === text ? undefined : out
}

/** One clip to play now, with its caption (filled with the CURRENT child's name). */
export interface ClipPlay {
  id: string
  speaker: Speaker
  caption: string
}

// ── speakers & emotions ──────────────────────────────────────────────────

const ZIZO_EMOTION: Record<string, string> = {
  'zizo.intro': 'playful',
  'zizo.neverMind': 'playful',
  'reactions.sun': 'surprised',
  'reactions.saturn': 'surprised',
  'reactions.correct': 'celebrating',
  'reactions.journey': 'celebrating',
  'reactions.moonFlag': 'celebrating',
  'reactions.rover': 'playful',
  'reactions.mission': 'celebrating',
  'reactions.alien': 'playful',
  'reactions.bigHelmet': 'laughing',
  'reactions.upsideDown': 'silly',
  'reactions.sticker': 'celebrating',
  'zizo.pluto.jacket': 'silly',
  'zizo.pluto.heartFound': 'laughing',
}

/** Narrator lines whose emotion isn't implied by their id pattern. */
const NARRATOR_EMOTION: Record<string, string> = {
  'planets.neptune.invite': 'excited',
  'map.badgePluto': 'proud',
}

function storyStep(id: string) {
  const [, chapterId, idx] = id.split('.')
  return STORY.find((c) => c.id === chapterId)?.steps[Number(idx)]
}

export function voiceOf(id: string): { speaker: Speaker; emotion: string } {
  if (id.startsWith('zizo.') || id.startsWith('reactions.')) {
    const emotion = ZIZO_EMOTION[id] ?? (id.startsWith('zizo.celebrate') ? 'celebrating' : id.startsWith('zizo.planets') ? 'silly' : 'playful')
    return { speaker: 'zizo', emotion }
  }
  if (id.startsWith('story.')) {
    const step = storyStep(id)
    const isMain = id.split('.').length === 3
    if (isMain && step?.type === 'say' && step.speaker === 'zizo') return { speaker: 'zizo', emotion: 'playful' }
    return { speaker: 'narrator', emotion: isMain ? 'storytelling' : 'warm' }
  }
  if (NARRATOR_EMOTION[id]) return { speaker: 'narrator', emotion: NARRATOR_EMOTION[id] }
  if (/\.intro$/.test(id) && id.startsWith('planets.')) return { speaker: 'narrator', emotion: 'excited' }
  if (/\.facts\./.test(id) || id.startsWith('common.numbers') || id === 'games.dayNight.explain') return { speaker: 'narrator', emotion: 'explaining' }
  if (/\.(done|correct|placed)(\.|$)/.test(id) || id.startsWith('common.praise') || /allVisited|allStars|allPlanets|tourEnd/.test(id))
    return { speaker: 'narrator', emotion: 'proud' }
  if (/\.steps\./.test(id) || id.startsWith('space.') || id.startsWith('home.')) return { speaker: 'narrator', emotion: 'excited' }
  return { speaker: 'narrator', emotion: 'warm' }
}

// ── expansions for lines with game-time blanks ───────────────────────────

const name = (id: BodyId) => BODIES[id].nameAr
const thisIsText = (id: BodyId) => `${BODIES[id].genderAr === 'f' ? 'دي' : 'ده'} ${name(id)}.`
const ORDINALS = script.common.ordinals

/** Templates whose blanks are expanded per body: id → bodies it is recorded for. */
const PER_BODY: Record<string, readonly BodyId[]> = {
  'space.suggest': TOUR_ORDER,
  'games.find.question': PLANET_IDS,
  'games.find.tryAgain': PLANET_IDS,
  'games.find.hint': PLANET_IDS,
  'games.find.correct': PLANET_IDS,
  'games.shadow.correct': PLANET_IDS,
  'games.size.correct': PLANET_IDS,
  'games.order.placed': PLANET_IDS,
  'games.order.wrong': PLANET_IDS,
}

/** Size-game questions are recorded per ordered pair actually used by the game. */
export function sizePairs(): [BodyId, BodyId][] {
  const pairs: [BodyId, BodyId][] = []
  for (const a of PLANET_IDS)
    for (const b of PLANET_IDS) {
      if (a === b) continue
      const da = BODIES[a].diameterKm
      const db = BODIES[b].diameterKm
      if (Math.max(da, db) / Math.min(da, db) >= 1.5) pairs.push([a, b])
    }
  return pairs
}

/** Lines never recorded as a whole (they're composed from pieces at runtime). */
const COMPOSED_ONLY = new Set(['games.find.wrong', 'games.shadow.wrong', 'games.size.wrong', 'games.size.question'])

function paramsFor(template: string, body: BodyId): Params {
  const p: Params = { planet: name(body) }
  const order = BODIES[body].order
  if (template.includes('{ordinal}') && order) p.ordinal = ORDINALS[order - 1]
  return p
}

// ── every clip that must exist ───────────────────────────────────────────

function staticScriptIds(): string[] {
  const ids: string[] = []
  const walk = (o: unknown, p: string[]) => {
    if (typeof o === 'string') ids.push(p.join('.'))
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, [...p, k])
  }
  walk(script, [])
  for (const c of STORY)
    c.steps.forEach((s, i) => {
      ids.push(`story.${c.id}.${i}`)
      if ('done' in s) ids.push(`story.${c.id}.${i}.done`)
      if (s.type === 'choice') s.options.forEach((_, j) => ids.push(`story.${c.id}.${i}.reply${j}`))
    })
  // not spoken: icon lists, game names (labels), ordinals (only inside other lines)
  return ids.filter((id) => !id.includes('factIcons') && !id.startsWith('games.names') && !id.startsWith('common.ordinals'))
}

export function allClips(): ClipDef[] {
  const out: ClipDef[] = []
  const add = (id: string, text: string, voiceId = id) => {
    const synthText = synthTextFor(id, text)
    out.push({ id, text, ...(synthText ? { synthText } : {}), ...voiceOf(voiceId) })
  }
  for (const id of staticScriptIds()) {
    if (COMPOSED_ONLY.has(id)) continue
    const template = templateFor(id)
    if (PER_BODY[id]) {
      for (const b of PER_BODY[id]) add(`${id}.${b}`, fill(template, DEFAULT_CHILD_NAME, paramsFor(template, b)), id)
      continue
    }
    add(id, fill(template, DEFAULT_CHILD_NAME))
  }
  for (const b of TOUR_ORDER) add(`common.thisIs.${b}`, thisIsText(b), 'common.thisIs')
  for (const b of TOUR_ORDER) add(`common.names.${b}`, `${name(b)}!`, 'common.names')
  for (const [a, b] of sizePairs()) add(`games.size.question.${a}.${b}`, `مين أكبر: ${name(a)} ولا ${name(b)}؟`, 'games.size.question')
  return out
}

// ── runtime: line → clips ────────────────────────────────────────────────

const bodyParam = (params: Params | undefined, key: string): BodyId | undefined => {
  const v = params?.[key]
  return typeof v === 'string' && v in BODIES ? (v as BodyId) : undefined
}

/**
 * Turn a line into the clips to play. Callers pass body ids as params
 * (planetId, chosenId, aId, bId) next to the display names.
 */
export function clipsForLine(line: Line, childName: string): ClipPlay[] {
  const caption = (id: string, text: string): ClipPlay => ({ id, speaker: voiceOf(id).speaker, caption: text })
  const id = line.id
  if (!id) return [{ id: '', speaker: 'narrator', caption: fill(line.template, childName, line.params) }]
  const planet = bodyParam(line.params, 'planetId')
  const chosen = bodyParam(line.params, 'chosenId')

  if (PER_BODY[id] && planet) {
    const t = templateFor(id)
    return [caption(`${id}.${planet}`, fill(t, childName, { ...line.params, ...paramsFor(t, planet) }))]
  }
  if ((id === 'games.find.wrong' || id === 'games.shadow.wrong' || id === 'games.size.wrong') && chosen) {
    const tail =
      id === 'games.find.wrong' && planet
        ? caption(`games.find.tryAgain.${planet}`, fill(templateFor('games.find.tryAgain'), childName, { planet: name(planet) }))
        : id === 'games.shadow.wrong'
          ? caption('games.shadow.wrongTail', templateFor('games.shadow.wrongTail'))
          : caption('games.size.wrongTail', templateFor('games.size.wrongTail'))
    return [caption(`common.thisIs.${chosen}`, thisIsText(chosen)), tail]
  }
  if (id === 'games.size.question') {
    const a = bodyParam(line.params, 'aId')
    const b = bodyParam(line.params, 'bId')
    if (a && b) return [caption(`games.size.question.${a}.${b}`, `مين أكبر: ${name(a)} ولا ${name(b)}؟`)]
  }
  if (id === 'common.names' && planet) return [caption(`common.names.${planet}`, `${name(planet)}!`)]
  return [caption(id, fill(line.template, childName, line.params))]
}
