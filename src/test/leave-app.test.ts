/**
 * Leaving the app (another app, another tab, locking the iPad) stops the
 * narration and forgets what was queued; coming back is quiet.
 * Before this, iPadOS paused the voice and the old lines carried on on return.
 */
import { Narrator } from '../audio/narrator'
import { leaveApp, narrator, returnToApp, sound } from '../audio'

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

class FakeAudio {
  src = ''
  volume = 1
  playbackRate = 1
  preload = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  paused = true
  plays: string[] = []
  setAttribute() {}
  play() {
    this.plays.push(this.src)
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
}

describe('Narrator while the app is away', () => {
  it('refuses to start speaking in the background', async () => {
    let away = true
    const audio = new FakeAudio()
    const n = new Narrator({
      getConfig: () => ({ enabled: true, volume: 1, rate: 1, childName: 'حلا' }),
      clips: { url: (id) => `/a/${id}.mp3` },
      createAudio: () => audio as unknown as HTMLAudioElement,
      isAway: () => away,
    })
    n.unlock()
    await expect(n.say({ id: 'planets.saturn.intro', template: 'زحل' })).resolves.toBe(false)
    expect(audio.plays.filter((s) => !s.startsWith('data:'))).toEqual([])
    expect(n.getState().speaking).toBe(false)
    away = false
    void n.say({ id: 'planets.saturn.intro', template: 'زحل' })
    expect(audio.plays.filter((s) => !s.startsWith('data:'))).toEqual(['/a/planets.saturn.intro.mp3'])
  })
})

describe('leaving and returning to the app', () => {
  afterEach(() => {
    setVisibility('visible')
    vi.restoreAllMocks()
  })

  it('hiding the page stops the narration, clears the queue and sends the music to sleep', () => {
    const stop = vi.spyOn(narrator, 'stop')
    const sleep = vi.spyOn(sound, 'sleep')
    setVisibility('hidden')
    expect(stop).toHaveBeenCalled()
    expect(sleep).toHaveBeenCalled()
  })

  it('the queued lines of the old screen never come back', async () => {
    const pending = narrator.say([
      { id: 'planets.saturn.intro', template: 'زحل' },
      { id: 'zizo.planets.saturn', template: 'جوك' },
      { id: 'planets.saturn.activity.prompt', template: 'حركي صباعك' },
    ])
    expect(narrator.getState().text).toBeTruthy()
    setVisibility('hidden')
    await expect(pending).resolves.toBe(false)
    expect(narrator.getState()).toMatchObject({ speaking: false, text: null })
    setVisibility('visible')
    expect(narrator.getState()).toMatchObject({ speaking: false, text: null })
  })

  it('coming back wakes the sound engine but says nothing by itself', () => {
    const wake = vi.spyOn(sound, 'wake')
    const say = vi.spyOn(narrator, 'say')
    setVisibility('hidden')
    setVisibility('visible')
    expect(wake).toHaveBeenCalled()
    expect(say).not.toHaveBeenCalled()
  })

  it('pagehide (closing / switching away on iOS) also stops everything', () => {
    const stop = vi.spyOn(narrator, 'stop')
    window.dispatchEvent(new Event('pagehide'))
    expect(stop).toHaveBeenCalled()
  })

  it('exports the two hooks', () => {
    expect(leaveApp).toBeTypeOf('function')
    expect(returnToApp).toBeTypeOf('function')
  })
})
