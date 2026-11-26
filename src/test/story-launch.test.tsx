/**
 * Human review: in the story's first chapter the rocket had already flown away
 * before the storyteller reached «انطلاق!». The lift-off (and its roar) must now
 * wait until the countdown line has been said.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { narrator, sound } from '../audio'
import { LAUNCH_MS } from '../components/character/SpaceshipPilot'
import { StoryScreen } from '../screens/StoryScreen'

const ids = (l: unknown) => (Array.isArray(l) ? l : [l]).map((x: { id?: string }) => x.id)

describe('story: the rocket launches on «انطلاق!», not before', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('stays on the ground (shaking) during the countdown, lifts off with its roar when it ends, then the chapter ends', async () => {
    vi.useFakeTimers()
    let finishCountdown: (v: boolean) => void = () => {}
    vi.spyOn(narrator, 'say').mockImplementation((l) => {
      if (ids(l).includes('story.start.3.done')) return new Promise<boolean>((r) => (finishCountdown = r))
      return Promise.resolve(true) // every other line "finishes" at once
    })
    const play = vi.spyOn(sound, 'play').mockImplementation(() => {})

    render(<StoryScreen chapter={0} />)
    // the narrated lines run by themselves until the story asks for the tap
    for (let i = 0; i < 10 && !screen.queryByTestId('story-target'); i++) await act(async () => void vi.advanceTimersByTime(600))
    /** the rocket's wrapper (a button while it waits for the tap, then a plain box) */
    const rocket = () => screen.getByTestId('spaceship-pilot').parentElement!

    await act(async () => void fireEvent.click(screen.getByTestId('story-target')))
    // countdown running: she has boarded, the rocket shakes but has NOT lifted off, no roar yet
    expect(rocket().style.animation).toBe('')
    expect(play).not.toHaveBeenCalledWith('launch')
    await act(async () => void vi.advanceTimersByTime(6000)) // even long after the old 1.2 s + 2.2 s
    expect(rocket().style.animation).toBe('')
    expect(screen.queryByTestId('next-chapter')).toBeNull()

    // «...انطلاق!» has been said → lift-off and roar together
    await act(async () => finishCountdown(true))
    expect(rocket().style.animation).toContain('launch')
    expect(play).toHaveBeenCalledWith('launch')
    expect(screen.queryByTestId('next-chapter')).toBeNull() // the overlay doesn't cover the launch

    await act(async () => void vi.advanceTimersByTime(LAUNCH_MS + 300))
    expect(screen.getByTestId('next-chapter')).toBeInTheDocument()
  })
})
