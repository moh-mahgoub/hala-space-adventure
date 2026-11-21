import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { BODIES, TOUR_ORDER } from '../data/planets'
import { DEFAULT_CHILD_NAME, fill, isStaticTemplate, templateFor } from './lines'
import { script } from './script'
import { STORY } from './story'

const ARABIC = /[؀-ۿ]/

function allStrings(o: unknown, out: string[] = []): string[] {
  if (typeof o === 'string') out.push(o)
  else if (o && typeof o === 'object') Object.values(o).forEach((v) => allStrings(v, out))
  return out
}

describe('Arabic content', () => {
  it('defaults the child name to حلا', () => {
    expect(DEFAULT_CHILD_NAME).toBe('حلا')
  })

  it('never spells the name as هالة anywhere in the source', () => {
    const root = path.resolve(__dirname, '..')
    const files: string[] = []
    const walk = (d: string) =>
      readdirSync(d).forEach((f) => {
        const p = path.join(d, f)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|tsx|css)$/.test(f) && !f.endsWith('.test.ts')) files.push(p)
      })
    walk(root)
    files.push(path.resolve(root, '../index.html'), path.resolve(root, '../public/manifest.webmanifest'))
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toContain('هالة')
  })

  it('every body has an intro, 2–3 facts with icons, an activity and a short line, all in Arabic', () => {
    for (const id of TOUR_ORDER) {
      const p = script.planets[id]
      expect(p.intro).toMatch(ARABIC)
      expect(p.facts.length).toBeGreaterThanOrEqual(2)
      expect(p.facts.length).toBeLessThanOrEqual(3)
      expect(p.factIcons.length).toBe(p.facts.length)
      expect(p.activity.prompt).toMatch(ARABIC)
      expect(p.activity.done).toMatch(ARABIC)
      expect(p.short).toMatch(ARABIC)
      // the intro names the body
      expect(p.intro).toContain(BODIES[id].nameAr.replace(/^ال/, ''))
    }
  })

  it('only uses known placeholders', () => {
    const allowed = new Set(['name', 'planet', 'chosen', 'ordinal', 'a', 'b'])
    for (const s of [...allStrings(script), ...allStrings(STORY)]) {
      for (const m of s.matchAll(/\{(\w+)\}/g)) expect(allowed.has(m[1]), `${m[1]} in "${s}"`).toBe(true)
    }
  })

  it('resolves every story line id', () => {
    STORY.forEach((c) =>
      c.steps.forEach((step, i) => {
        expect(templateFor(`story.${c.id}.${i}`)).toBe(step.text)
        if (step.type === 'tap' || step.type === 'count') expect(templateFor(`story.${c.id}.${i}.done`)).toBe(step.done)
        if (step.type === 'choice') step.options.forEach((o, j) => expect(templateFor(`story.${c.id}.${i}.reply${j}`)).toBe(o.reply))
      }),
    )
  })

  it('story visits all eight planets, has choices and a happy ending', () => {
    const bodies = STORY.map((c) => c.body).filter(Boolean)
    for (const id of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) expect(bodies).toContain(id)
    expect(STORY.some((c) => c.steps.some((s) => s.type === 'choice'))).toBe(true)
    expect(STORY.at(-1)!.steps.at(-1)!.text).toContain('تصبحي على خير')
  })

  it('fills the child name and parameters', () => {
    expect(fill('أهلاً يا {name}!', 'حلا')).toBe('أهلاً يا حلا!')
    expect(fill('فين {planet}؟', 'ليلى', { planet: 'زحل' })).toBe('فين زحل؟')
    expect(fill('يا {name}', '')).toBe('يا حلا')
    expect(isStaticTemplate('أهلاً يا {name}')).toBe(true)
    expect(isStaticTemplate('فين {planet}')).toBe(false)
  })

  it('resolves script ids by path', () => {
    expect(templateFor('planets.earth.facts.1')).toBe(script.planets.earth.facts[1])
    expect(templateFor('common.numbers.2')).toBe('تلاتة')
  })
})
