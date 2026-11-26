/**
 * Human review: in the story's Mars chapter the narration says the robot car
 * raises its arm and says hi, but no car was shown. Now it drives onto Mars and
 * waves back (with a little robot beep) while that line is said.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { narrator, sound } from '../audio'
import { StoryScreen } from '../screens/StoryScreen'
import { STORY } from '../content/story'

describe('story: the Mars robot car waves back', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  async function reachTap(chapterId: string) {
    vi.useFakeTimers()
    vi.spyOn(narrator, 'say').mockImplementation(() => new Promise(() => {})) // lines keep "playing"
    render(<StoryScreen chapter={STORY.findIndex((c) => c.id === chapterId)} />)
    for (let i = 0; i < 10 && !screen.queryByTestId('story-target'); i++) await act(async () => void fireEvent.click(screen.getByTestId('story-next')))
    return screen.getByTestId('story-target')
  }

  it('no rover before the tap; after it the rover appears, waves with a 👋, beeps once it has arrived', async () => {
    const play = vi.spyOn(sound, 'play').mockImplementation(() => {})
    const target = await reachTap('mars')
    expect(screen.queryByTestId('story-rover')).toBeNull()
    await act(async () => void fireEvent.click(target))
    expect(screen.getByTestId('story-rover')).toBeInTheDocument()
    expect(screen.getByTestId('mars-rover')).toHaveAttribute('data-waving', 'yes')
    expect(screen.getByTestId('story-rover-hello')).toHaveTextContent('👋')
    expect(play).not.toHaveBeenCalledWith('beep')
    await act(async () => void vi.advanceTimersByTime(1000))
    expect(play).toHaveBeenCalledWith('beep')
    // she and Zizo wave back
    expect(screen.getByTestId('story-astronaut-wave')).toBeInTheDocument()
  })

  it('Mars itself no longer wobbles in that scene (the rover gets the attention)', async () => {
    const target = await reachTap('mars')
    await act(async () => void fireEvent.click(target))
    const planet = screen.getByTestId('story-rover').parentElement!.firstElementChild as HTMLElement
    expect(planet.style.animation ?? '').not.toContain('wiggle')
  })

  it('other "wave" chapters are unchanged: no rover', async () => {
    const waveChapters = STORY.filter((c) => c.steps.some((s) => s.type === 'tap' && s.effect === 'wave'))
    expect(waveChapters.length).toBeGreaterThan(0)
    const target = await reachTap(waveChapters[0].id)
    await act(async () => void fireEvent.click(target))
    expect(screen.queryByTestId('story-rover')).toBeNull()
  })
})
