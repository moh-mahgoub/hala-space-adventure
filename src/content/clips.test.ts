import { BODIES, PLANET_IDS, TOUR_ORDER } from '../data/planets'
import { allClips, clipsForLine, sizePairs, voiceOf } from './clips'
import { line } from './lines'
import { STORY } from './story'

const clips = allClips()
const ids = new Set(clips.map((c) => c.id))

describe('clip catalogue', () => {
  it('has unique ids, a speaker and text for every clip', () => {
    expect(ids.size).toBe(clips.length)
    for (const c of clips) {
      expect(['narrator', 'zizo']).toContain(c.speaker)
      expect(c.text.trim().length, c.id).toBeGreaterThan(0)
      expect(c.text, c.id).not.toMatch(/\{\w+\}/) // every blank is filled for recording
      expect(c.text).not.toContain('هالة')
    }
  })

  it('records the child’s name as حلا', () => {
    expect(clips.find((c) => c.id === 'start.welcome')!.text).toContain('يا حلا')
  })

  it('gives Zizo his own lines and the storyteller everything else', () => {
    expect(voiceOf('zizo.planets.saturn').speaker).toBe('zizo')
    expect(voiceOf('reactions.correct').speaker).toBe('zizo')
    expect(voiceOf('planets.saturn.intro').speaker).toBe('narrator')
    expect(voiceOf('games.find.question').speaker).toBe('narrator')
    // story lines marked speaker: 'zizo'
    for (const c of STORY)
      c.steps.forEach((s, i) => {
        if (s.type === 'say' && s.speaker === 'zizo') expect(voiceOf(`story.${c.id}.${i}`).speaker).toBe('zizo')
      })
    const zizoCount = clips.filter((c) => c.speaker === 'zizo').length
    expect(zizoCount).toBeGreaterThan(20)
    expect(zizoCount).toBeLessThan(clips.length / 4) // Zizo stays occasional
  })

  it('pre-records every per-planet variant the games need', () => {
    for (const p of PLANET_IDS) {
      for (const base of ['games.find.question', 'games.find.tryAgain', 'games.find.hint', 'games.find.correct', 'games.order.placed', 'games.order.wrong'])
        expect(ids.has(`${base}.${p}`), `${base}.${p}`).toBe(true)
    }
    for (const b of TOUR_ORDER) {
      expect(ids.has(`common.thisIs.${b}`)).toBe(true)
      expect(ids.has(`space.suggest.${b}`)).toBe(true)
    }
    for (const [a, b] of sizePairs()) expect(ids.has(`games.size.question.${a}.${b}`)).toBe(true)
  })

  it('uses the right grammatical gender: دي الأرض, ده زحل', () => {
    expect(clips.find((c) => c.id === 'common.thisIs.earth')!.text).toBe('دي الأرض.')
    expect(clips.find((c) => c.id === 'common.thisIs.sun')!.text).toBe('دي الشمس.')
    expect(clips.find((c) => c.id === 'common.thisIs.saturn')!.text).toBe('ده زحل.')
  })
})

describe('line → clips at runtime', () => {
  const play = (id: string, params?: Record<string, string>) => clipsForLine(line(id, params), 'حلا')

  it('static lines are one clip with the same id', () => {
    expect(play('planets.saturn.intro')).toEqual([{ id: 'planets.saturn.intro', speaker: 'narrator', caption: expect.stringContaining('زحل') }])
  })

  it('per-planet lines pick the planet’s recording', () => {
    const r = play('games.find.question', { planet: 'زحل', planetId: 'saturn' })
    expect(r.map((c) => c.id)).toEqual(['games.find.question.saturn'])
    expect(r[0].caption).toBe('يا حلا، فين كوكب زحل؟')
  })

  it('wrong answers are composed: “دي الأرض.” + “يلا ندور تاني على زحل!”', () => {
    const r = play('games.find.wrong', { chosen: 'الأرض', planet: 'زحل', chosenId: 'earth', planetId: 'saturn' })
    expect(r.map((c) => c.id)).toEqual(['common.thisIs.earth', 'games.find.tryAgain.saturn'])
    expect(r.map((c) => c.caption)).toEqual(['دي الأرض.', 'يلا ندور تاني على زحل!'])
  })

  it('every clip the runtime can ask for exists in the catalogue', () => {
    const asked: string[] = []
    for (const a of PLANET_IDS)
      for (const b of PLANET_IDS) {
        if (a === b) continue
        for (const k of ['find', 'shadow', 'size'])
          asked.push(...play(`games.${k}.wrong`, { chosen: BODIES[a].nameAr, planet: BODIES[b].nameAr, chosenId: a, planetId: b }).map((c) => c.id))
      }
    for (const [a, b] of sizePairs()) asked.push(...play('games.size.question', { aId: a, bId: b }).map((c) => c.id))
    for (const p of PLANET_IDS) asked.push(...play('games.order.placed', { planetId: p, planet: BODIES[p].nameAr }).map((c) => c.id))
    for (const id of asked) expect(ids.has(id), id).toBe(true)
  })

  it('captions use the current child’s name', () => {
    expect(clipsForLine(line('start.welcome'), 'ليلى')[0].caption).toContain('يا ليلى')
  })
})
