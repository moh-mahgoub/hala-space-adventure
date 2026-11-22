/**
 * Completeness checks: every celestial body the app MENTIONS must be a body the
 * child can VISIT, and every visitable body must have a complete scene and all
 * its recordings.
 *
 * Why this exists: Pluto was mentioned in narration («…كوكب قزم صغير اسمه بلوتو»)
 * but had no scene and no recordings, and no test connected "mentioned" with
 * "has a scene". The first test below would have failed on that.
 */
import { render, screen } from '@testing-library/react'
import { ACTIVITIES } from '../activities'
import { PlanetArt } from '../components/PlanetArt'
import manifest from '../audio/manifest.json'
import { allClips } from '../content/clips'
import { script } from '../content/script'
import { BODIES, TOUR_ORDER, type BodyId } from '../data/planets'
import { MapScreen } from '../screens/MapScreen'
import { SolarSystemScreen } from '../screens/SolarSystemScreen'

/** Arabic names of solar-system objects a script might mention. */
const OTHER_KNOWN_OBJECTS = [
  'بلوتو', 'سيريس', 'إيريس', 'هاوميا', 'ماكيماكي', // dwarf planets
  'شارون', 'فوبوس', 'ديموس', 'آيو', 'أوروبا', 'جانيميد', 'كاليستو', 'تيتان', 'إنسيلادوس', 'تريتون', // moons
]
const spoken = allClips()

/** Names said in narration that are NOT a body the child can visit. */
function orphanMentions(visitable: readonly BodyId[]): string[] {
  const visitableNames = new Set(visitable.map((id) => BODIES[id].nameAr))
  const allNames = [...new Set([...TOUR_ORDER.map((id) => BODIES[id].nameAr), ...OTHER_KNOWN_OBJECTS])]
  const orphans: string[] = []
  for (const name of allNames) {
    const where = spoken.filter((c) => c.text.includes(name)).map((c) => c.id)
    if (where.length && !visitableNames.has(name)) orphans.push(`${name} (mentioned in ${where.slice(0, 3).join(', ')})`)
  }
  return orphans
}
const entries = manifest as { id: string; duration?: number }[]
const recorded = new Set(entries.filter((e) => e.duration).map((e) => e.id))

describe('every body the narration mentions can be visited', () => {
  it('no solar-system object is named without a scene of its own', () => {
    expect(orphanMentions(TOUR_ORDER), 'mentioned but not visitable').toEqual([])
  })

  it('would have caught the original gap (Pluto mentioned, no scene)', () => {
    const withoutPluto = TOUR_ORDER.filter((id) => id !== 'pluto')
    expect(orphanMentions(withoutPluto).join(' ')).toContain('بلوتو')
  })
})

describe.each(TOUR_ORDER.map((id) => [id]))('%s: complete scene', (id: BodyId) => {
  const s = script.planets[id]

  it('has narration: intro, 2–3 facts with icons, an activity, a short line and a Zizo joke', () => {
    expect(s.intro).toContain(BODIES[id].nameAr.replace(/^ال/, ''))
    expect(s.facts.length).toBeGreaterThanOrEqual(2)
    expect(s.factIcons.length).toBe(s.facts.length)
    expect(s.activity.prompt.length).toBeGreaterThan(10)
    expect(s.activity.done.length).toBeGreaterThan(10)
    expect(s.short.length).toBeGreaterThan(5)
    expect((script.zizo.planets as Record<string, string>)[id], 'Zizo joke').toBeTruthy()
  })

  it('has an interactive activity and real artwork', () => {
    expect(ACTIVITIES[id]).toBeTypeOf('function')
    const { container } = render(<PlanetArt id={id} />)
    // more than just the outline/shading: a texture or the sun's own drawing
    expect(container.querySelectorAll('path, ellipse, rect, circle').length).toBeGreaterThanOrEqual(5)
  })

  it('has every one of its recordings', () => {
    const needed = [
      `planets.${id}.intro`,
      ...s.facts.map((_, i) => `planets.${id}.facts.${i}`),
      `planets.${id}.short`,
      `planets.${id}.activity.prompt`,
      `planets.${id}.activity.done`,
      ...s.activity.steps.map((_, i) => `planets.${id}.activity.steps.${i}`),
      `zizo.planets.${id}`,
      `space.suggest.${id}`,
      `common.thisIs.${id}`,
      `common.names.${id}`,
    ]
    const missing = needed.filter((c) => !recorded.has(c))
    expect(missing, `${id}: unrecorded clips`).toEqual([])
  })
})

describe('every body appears wherever bodies are listed', () => {
  it('solar-system strip', () => {
    render(<SolarSystemScreen />)
    for (const id of TOUR_ORDER) expect(screen.getByTestId(`strip-${id}`)).toBeInTheDocument()
  })

  it('explorer map', () => {
    render(<MapScreen />)
    for (const id of TOUR_ORDER) expect(screen.getByTestId(`map-${id}`)).toBeInTheDocument()
  })
})
