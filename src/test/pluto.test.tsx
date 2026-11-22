/**
 * The secret mission to Pluto: Neptune invites her on, Zizo dresses for the
 * cold, she finds the (accurate, lopsided) heart with gentle hints, and earns
 * the Pluto explorer badge. Pluto stays a dwarf planet everywhere.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { narrator } from '../audio'
import { PlutoActivity, PLUTO_IDLE_HINT_MS } from '../activities/PlutoActivity'
import { PlutoInvite } from '../components/PlutoInvite'
import { Zizo } from '../components/Zizo'
import { allClips } from '../content/clips'
import { script } from '../content/script'
import manifest from '../audio/manifest.json'
import { PLANET_IDS } from '../data/planets'
import { navigate } from '../router'
import { PlanetScreen } from '../screens/PlanetScreen'
import { SolarSystemScreen } from '../screens/SolarSystemScreen'
import { BADGES, awardStar, progressStore, resetProgress, visitedAllPlanets } from '../state/progress'

type Said = { id?: string } | { id?: string }[]
const saidIds = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.flatMap(([l]) => {
    const said = l as Said
    return (Array.isArray(said) ? said : [said]).map((x) => x.id)
  })

const MISSION_CLIPS = [
  'planets.neptune.invite',
  'zizo.pluto.jacket',
  'zizo.planets.pluto',
  'planets.pluto.hints.0',
  'planets.pluto.hints.1',
  'planets.pluto.activity.steps.0',
  'zizo.pluto.heartFound',
  'map.badgePluto',
]

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  narrator.stop()
})

describe('mission script', () => {
  it('every mission line exists, is spoken by the right voice, and is in the manifest', () => {
    const clips = new Map(allClips().map((c) => [c.id, c]))
    const ids = new Set((manifest as { id: string }[]).map((e) => e.id))
    for (const id of MISSION_CLIPS) {
      expect(clips.has(id), id).toBe(true)
      expect(ids.has(id), `${id} in manifest`).toBe(true)
      expect(clips.get(id)!.speaker, id).toBe(id.startsWith('zizo.') ? 'zizo' : 'narrator')
    }
  })

  it('keeps Pluto a dwarf planet and never "the ninth planet"', () => {
    expect(script.planets.pluto.intro).toContain('كوكب قزم')
    expect(script.planets.pluto.intro).toContain('مش واحد من الكواكب التمانية')
    // the invite is true even if she jumped straight to Neptune
    expect(script.planets.neptune.invite).toContain('آخر كوكب من الكواكب التمانية')
    for (const c of allClips()) expect(c.text, c.id).not.toMatch(/الكوكب التاسع|تسع كواكب|تسعة كواكب/)
    expect(PLANET_IDS).toHaveLength(8)
    expect(PLANET_IDS).not.toContain('pluto')
  })

  it('teaches that Pluto is cold, and calls the heart a heart-SHAPED region', () => {
    expect(script.planets.pluto.facts.join(' ')).toContain('ساقع')
    expect(script.planets.pluto.activity.steps[0]).toContain('شبه القلب')
  })
})

describe('Pluto activity: find the heart', () => {
  it('does not highlight the heart until she has had a hint', () => {
    render(<PlutoActivity onDone={() => {}} />)
    expect(screen.getByTestId('pluto-heart')).toHaveAttribute('data-hinted', 'no')
  })

  it('tapping elsewhere on Pluto gives gentle hints; the second makes the heart glow', () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    render(<PlutoActivity onDone={() => {}} />)
    fireEvent.click(screen.getByTestId('pluto-disk'))
    expect(saidIds(say)).toContain('planets.pluto.hints.0')
    expect(screen.getByTestId('pluto-heart')).toHaveAttribute('data-hinted', 'no')
    fireEvent.click(screen.getByTestId('pluto-disk'))
    expect(saidIds(say)).toContain('planets.pluto.hints.1')
    expect(screen.getByTestId('pluto-heart')).toHaveAttribute('data-hinted', 'yes')
  })

  it('waiting quietly also brings a hint', () => {
    vi.useFakeTimers()
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    render(<PlutoActivity onDone={() => {}} />)
    act(() => void vi.advanceTimersByTime(PLUTO_IDLE_HINT_MS + 50))
    expect(saidIds(say)).toContain('planets.pluto.hints.0')
  })

  it('finding the heart: praise, Zizo cheers, then the Moon comparison and done', async () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    const onDone = vi.fn()
    render(<PlutoActivity onDone={onDone} />)
    await act(async () => void fireEvent.click(screen.getByTestId('pluto-heart')))
    expect(saidIds(say)).toEqual(['planets.pluto.activity.steps.0', 'zizo.pluto.heartFound'])
    expect(screen.getByTestId('pluto-heart-found')).toBeInTheDocument()
    expect(screen.getByTestId('pluto-moon-compare')).toBeInTheDocument()
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe('Zizo dresses for the cold', () => {
  it('wears winter gear on Pluto only', () => {
    navigate({ name: 'planet', id: 'pluto', tour: false }, { replace: true })
    const { unmount } = render(<Zizo />)
    expect(screen.getByTestId('zizo')).toHaveAttribute('data-outfit', 'winter')
    expect(screen.getByTestId('zizo-winter')).toBeInTheDocument()
    unmount()
    navigate({ name: 'planet', id: 'neptune', tour: false }, { replace: true })
    render(<Zizo />)
    expect(screen.getByTestId('zizo')).toHaveAttribute('data-outfit', 'none')
  })
})

describe('Neptune → the secret mission', () => {
  beforeEach(() => resetProgress())

  it('finishing Neptune invites her to Pluto (narrator, then Zizo with his jacket)', async () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    navigate({ name: 'planet', id: 'neptune', tour: false }, { replace: true })
    render(<PlanetScreen id="neptune" tour={false} />)
    expect(screen.queryByTestId('pluto-invite')).not.toBeInTheDocument()
    // Neptune's activity: tap Neptune three times for the wind
    for (let i = 0; i < 3; i++) await act(async () => void fireEvent.click(screen.getByTestId('activity-target')))
    await screen.findByTestId('pluto-invite')
    expect(saidIds(say)).toEqual(expect.arrayContaining(['planets.neptune.activity.done', 'planets.neptune.invite', 'zizo.pluto.jacket']))
    expect(screen.getByRole('button', { name: /يلا نكتشف بلوتو/ })).toBeInTheDocument()
  })

  it('the invite is optional: it can be closed, and its button opens Pluto', () => {
    const onClose = vi.fn()
    render(<PlutoInvite tour={false} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('pluto-invite-close'))
    expect(onClose).toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('pluto-invite-go'))
    expect(location.hash).toBe('#/planet/pluto')
  })
})

describe('the Pluto explorer badge', () => {
  beforeEach(() => resetProgress())

  it('is part of the existing badge system and earned by finding the heart', () => {
    const badge = BADGES.find((b) => b.id === 'pluto')!
    expect(badge.title).toBe('شارة مستكشفة بلوتو')
    expect(badge.earned(progressStore.get())).toBe(false)
    awardStar('activity:pluto')
    expect(badge.earned(progressStore.get())).toBe(true)
  })

  it('does not count towards the eight-planet explorer badge', () => {
    progressStore.set({ visited: ['pluto'] })
    expect(visitedAllPlanets()).toBe(false)
  })

  it('first time: the badge celebration follows the Moon comparison', async () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    navigate({ name: 'planet', id: 'pluto', tour: false }, { replace: true })
    render(<PlanetScreen id="pluto" tour={false} />)
    await act(async () => void fireEvent.click(screen.getByTestId('pluto-heart')))
    await screen.findByTestId('pluto-badge-celebration')
    expect(saidIds(say)).toEqual(expect.arrayContaining(['planets.pluto.activity.done', 'map.badgePluto']))
  })
})

describe('Pluto looks like a dwarf planet in the solar system', () => {
  it('fainter dotted orbit, and a «كوكب قزم» divider before it in the strip', () => {
    render(<SolarSystemScreen />)
    expect(screen.getByTestId('strip-dwarf-divider')).toHaveTextContent('كوكب قزم')
    expect(screen.getByTestId('strip-pluto')).toHaveAccessibleName('بلوتو، كوكب قزم')
  })
})
