/**
 * Human review (live review page), three findings:
 *  1. After a planet's activity, only the next-planet button glowed — the facts
 *     were never suggested. Now the glow goes to the unheard facts first.
 *  2. «اسمعي تاني» after finishing the activity asked her to do it again, but the
 *     activity didn't react. Now it replays the introduction only.
 *  3. Counting skipped the last number (Mercury «خمسة», Jupiter «عشرة», the
 *     story's «تمانية»). Now the last number is said before the congratulations.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { narrator } from '../audio'
import { MercuryActivity } from '../activities/MercuryActivity'
import { JupiterActivity } from '../activities/JupiterActivity'
import { navigate } from '../router'
import { PlanetScreen } from '../screens/PlanetScreen'
import { StoryScreen } from '../screens/StoryScreen'
import { STORY } from '../content/story'
import { PLANET_IDS } from '../data/planets'
import { DEFAULT_SETTINGS, settingsStore } from '../state/settings'
import { resetProgress } from '../state/progress'

type L = { id?: string }
const said = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.flatMap(([l]) => (Array.isArray(l) ? (l as L[]) : [l as L]).map((x) => x.id))

beforeEach(() => {
  resetProgress()
  settingsStore.replace({ ...DEFAULT_SETTINGS, mode: 'guided' })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function finishSun() {
  navigate({ name: 'planet', id: 'sun', tour: false }, { replace: true })
  render(<PlanetScreen id="sun" tour={false} />)
  for (let i = 0; i < 3; i++) await act(async () => void fireEvent.click(screen.getByTestId('activity-target')))
}

describe('1. after the activity, the glow suggests the facts first, then the next planet', () => {
  it('nothing glows before the activity is done', async () => {
    vi.spyOn(narrator, 'say').mockResolvedValue(true)
    render(<PlanetScreen id="sun" tour={false} />)
    expect(screen.getByTestId('fact-0')).toHaveAttribute('data-suggested', 'no')
    expect(screen.getByTestId('nav-next')).toHaveAttribute('data-pulse', 'no')
  })

  it('then one unheard fact at a time, and the next-planet button only after all facts', async () => {
    vi.spyOn(narrator, 'say').mockResolvedValue(true)
    await finishSun()
    const facts = screen.getAllByTestId(/^fact-\d$/)
    for (let i = 0; i < facts.length; i++) {
      expect(screen.getByTestId(`fact-${i}`)).toHaveAttribute('data-suggested', 'yes')
      expect(screen.getByTestId('nav-next')).toHaveAttribute('data-pulse', 'no')
      await act(async () => void fireEvent.click(screen.getByTestId(`fact-${i}`)))
      expect(screen.getByTestId(`fact-${i}`)).toHaveAttribute('data-suggested', 'no')
    }
    expect(screen.getByTestId('nav-next')).toHaveAttribute('data-pulse', 'yes')
  })

  it('in free mode nothing glows', async () => {
    settingsStore.replace({ ...DEFAULT_SETTINGS, mode: 'free' })
    vi.spyOn(narrator, 'say').mockResolvedValue(true)
    await finishSun()
    expect(screen.getByTestId('fact-0')).toHaveAttribute('data-suggested', 'no')
    expect(screen.getByTestId('nav-next')).toHaveAttribute('data-pulse', 'no')
  })
})

describe('2. «اسمعي تاني» matches the state of the activity', () => {
  it('before finishing: introduction + instruction; after: introduction only; «نلعب تاني» brings the instruction back', async () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    render(<PlanetScreen id="sun" tour={false} />)
    say.mockClear()
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'اسمعي تاني' })))
    expect(said(say)).toEqual(['planets.sun.intro', 'planets.sun.activity.prompt'])

    for (let i = 0; i < 3; i++) await act(async () => void fireEvent.click(screen.getByTestId('activity-target')))
    say.mockClear()
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'اسمعي تاني' })))
    expect(said(say)).toEqual(['planets.sun.intro'])

    say.mockClear()
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: /نلعب تاني/ })))
    expect(said(say)).toContain('planets.sun.activity.prompt')
  })
})

describe('3. counting says the last number before the congratulations', () => {
  it('Mercury: «خمسة», then done', async () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    const onDone = vi.fn()
    render(<MercuryActivity onDone={onDone} />)
    for (let i = 0; i < 5; i++) await act(async () => void fireEvent.click(screen.getByTestId(`crater-${i}`)))
    expect(said(say)).toEqual(['common.numbers.0', 'common.numbers.1', 'common.numbers.2', 'common.numbers.3', 'common.numbers.4'])
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('Mercury: the ending waits for «خمسة» to be said', async () => {
    let finish: (v: boolean) => void = () => {}
    vi.spyOn(narrator, 'say').mockImplementation((l) =>
      (l as L).id === 'common.numbers.4' ? new Promise<boolean>((r) => (finish = r)) : Promise.resolve(true),
    )
    const onDone = vi.fn()
    render(<MercuryActivity onDone={onDone} />)
    for (let i = 0; i < 5; i++) await act(async () => void fireEvent.click(screen.getByTestId(`crater-${i}`)))
    expect(onDone).not.toHaveBeenCalled()
    await act(async () => finish(true))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('Jupiter: «عشرة», then done', async () => {
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    const onDone = vi.fn()
    render(<JupiterActivity onDone={onDone} />)
    for (let i = 0; i < 10; i++) await act(async () => void fireEvent.click(screen.getByTestId('drop-earth')))
    expect(said(say)).toContain('common.numbers.9')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('story: «تمانية», then the ending', async () => {
    vi.useFakeTimers()
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    render(<StoryScreen chapter={STORY.findIndex((c) => c.steps.some((s) => s.type === 'count'))} />)
    for (let i = 0; i < 12 && !screen.queryByTestId(`count-${PLANET_IDS[0]}`); i++) await act(async () => void vi.advanceTimersByTime(700))
    say.mockClear()
    for (const id of PLANET_IDS) await act(async () => void fireEvent.click(screen.getByTestId(`count-${id}`)))
    await act(async () => void vi.advanceTimersByTime(50))
    const ids = said(say)
    expect(ids).toContain('common.numbers.7')
    expect(ids.indexOf('common.numbers.7')).toBeLessThan(ids.findIndex((x) => x?.endsWith('.done')))
  })
})

describe('4. «خلصتي!» is a status label, not something that looks tappable', () => {
  it('is not a button and ignores taps; «نلعب تاني» is the only button there', async () => {
    vi.spyOn(narrator, 'say').mockResolvedValue(true)
    await finishSun()
    const label = screen.getByTestId('activity-done-label')
    expect(label).toHaveTextContent('خلصتي!')
    expect(label.closest('button')).toBeNull()
    expect(label.className).toContain('pointer-events-none')
    expect(label.className).not.toMatch(/rounded-full bg-|px-4 py-2/) // no pill shape
    expect(screen.getByRole('button', { name: /نلعب تاني/ })).toBeInTheDocument()
  })
})

describe('5. Saturn: the ring magnifier closes after the explanation, and opens again on a tap', async () => {
  const { SaturnActivity, MAGNIFIER_LINGER_MS } = await import('../activities/SaturnActivity')
  it('opens, closes once nothing is being said, re-opens (with the explanation) when the rings are tapped again', async () => {
    vi.useFakeTimers()
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true)
    const onDone = vi.fn()
    render(<SaturnActivity onDone={onDone} />)
    // look from above and below, then the rings become tappable
    for (const n of ['من فوق', 'من فوق', 'من تحت', 'من تحت', 'من تحت', 'من تحت', 'من تحت', 'من تحت']) {
      const b = screen.queryByRole('button', { name: n })
      if (!b) break // the tilt buttons go away once the rings are ready to tap
      await act(async () => void fireEvent.click(b))
    }
    await act(async () => void fireEvent.click(screen.getByTestId('saturn-rings')))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('ring-zoom')).toBeInTheDocument()
    await act(async () => void vi.advanceTimersByTime(MAGNIFIER_LINGER_MS + 100))
    expect(screen.queryByTestId('ring-zoom')).toBeNull()

    say.mockClear()
    await act(async () => void fireEvent.click(screen.getByTestId('saturn-rings')))
    expect(screen.getByTestId('ring-zoom')).toBeInTheDocument()
    expect(said(say)).toEqual(['planets.saturn.activity.done'])
    expect(onDone).toHaveBeenCalledTimes(1) // not "finished" again
  })
})

describe('6. Pluto: a clear way out at the end of the journey', () => {
  it('Pluto has an end button to the solar system (Neptune keeps its next button)', async () => {
    vi.spyOn(narrator, 'say').mockResolvedValue(true)
    const { unmount } = render(<PlanetScreen id="pluto" tour={false} />)
    expect(screen.queryByTestId('nav-next')).toBeNull()
    await act(async () => void fireEvent.click(screen.getByTestId('nav-end')))
    expect(location.hash).toBe('#/space')
    unmount()
    render(<PlanetScreen id="neptune" tour={false} />)
    expect(screen.getByTestId('nav-next')).toBeInTheDocument()
    expect(screen.queryByTestId('nav-end')).toBeNull()
  })

  it('the end button glows only after Pluto\'s heart and facts', async () => {
    vi.spyOn(narrator, 'say').mockResolvedValue(true)
    render(<PlanetScreen id="pluto" tour={false} />)
    expect(screen.getByTestId('nav-end')).toHaveAttribute('data-pulse', 'no')
    await act(async () => void fireEvent.click(screen.getByTestId('pluto-heart')))
    expect(screen.getByTestId('nav-end')).toHaveAttribute('data-pulse', 'no')
    for (let i = 0; i < 3; i++) await act(async () => void fireEvent.click(screen.getByTestId(`fact-${i}`)))
    expect(screen.getByTestId('nav-end')).toHaveAttribute('data-pulse', 'yes')
  })
})
