import { Narrator, type NarratorConfig, type NarratorEvent } from './narrator'

type Handler = (() => void) | null

class FakeAudio {
  src = ''
  volume = 1
  playbackRate = 1
  preload = ''
  onended: Handler = null
  onerror: Handler = null
  paused = true
  plays: string[] = []
  failNext = false
  setAttribute() {}
  play() {
    this.plays.push(this.src)
    this.paused = false
    if (this.failNext) {
      this.failNext = false
      return Promise.reject(new Error('NotAllowedError'))
    }
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  /** test helper: the current clip finished */
  end() {
    this.onended?.()
  }
}

const RECORDED = new Set(['start.welcome', 'zizo.intro', 'planets.saturn.intro', 'common.thisIs.earth', 'games.find.tryAgain.saturn'])
const cfg = (over: Partial<NarratorConfig> = {}): NarratorConfig => ({ enabled: true, volume: 0.8, rate: 1, childName: 'حلا', ...over })

function make(config: Partial<NarratorConfig> = {}) {
  const audio = new FakeAudio()
  const warnings: string[] = []
  const n = new Narrator({
    getConfig: () => cfg(config),
    clips: { url: (id) => (RECORDED.has(id) ? `/base/audio/${id}.mp3` : null) },
    createAudio: () => audio as unknown as HTMLAudioElement,
    warn: (m) => warnings.push(m),
  })
  const events: string[] = []
  for (const ev of ['start', 'pause', 'resume', 'complete', 'cancel', 'error'] as NarratorEvent[]) n.on(ev, (i) => events.push(`${ev}:${i.clipId}`))
  return { n, audio, warnings, events }
}

const L = (id: string, template = 'نص', params?: Record<string, string>) => ({ id, template, params })
const realPlays = (a: FakeAudio) => a.plays.filter((s) => !s.startsWith('data:'))

describe('Narrator (prerecorded clips)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('makes no sound before the first tap unlocks audio (captions only)', () => {
    const { n, audio } = make()
    void n.say(L('start.welcome', 'أهلاً يا {name}'))
    expect(realPlays(audio)).toEqual([])
    expect(n.getState()).toMatchObject({ backend: 'captions', text: 'أهلاً يا حلا' })
  })

  it('unlocks with a silent sound inside the tap, then plays the recorded clip', () => {
    const { n, audio } = make()
    n.unlock()
    expect(audio.plays[0]).toMatch(/^data:audio\/wav/)
    void n.say(L('start.welcome', 'أهلاً يا {name}'))
    expect(realPlays(audio)).toEqual(['/base/audio/start.welcome.mp3'])
    expect(n.getState()).toMatchObject({ backend: 'recorded', speaker: 'narrator', clipId: 'start.welcome' })
  })

  it('applies volume and narration speed to the recording', () => {
    const { n, audio } = make({ volume: 0.4, rate: 0.8 })
    n.unlock()
    void n.say(L('start.welcome'))
    expect(audio.volume).toBe(0.4)
    expect(audio.playbackRate).toBe(0.8)
  })

  it('a new line interrupts the old one — voices never overlap', async () => {
    const { n, audio, events } = make()
    n.unlock()
    const first = n.say(L('start.welcome'))
    void n.say(L('planets.saturn.intro'))
    await expect(first).resolves.toBe(false)
    expect(realPlays(audio)).toEqual(['/base/audio/start.welcome.mp3', '/base/audio/planets.saturn.intro.mp3'])
    expect(events).toContain('cancel:start.welcome')
    expect(n.getState().clipId).toBe('planets.saturn.intro')
  })

  it('plays a narrator → Zizo exchange in order, with Zizo as the speaker', async () => {
    const { n, audio, events } = make()
    n.unlock()
    const done = n.say([L('start.welcome'), L('zizo.intro')])
    audio.end()
    await vi.advanceTimersByTimeAsync(400)
    expect(n.getState()).toMatchObject({ speaker: 'zizo', clipId: 'zizo.intro' })
    audio.end()
    await expect(done).resolves.toBe(true)
    expect(events).toEqual(['start:start.welcome', 'complete:start.welcome', 'start:zizo.intro', 'complete:zizo.intro'])
    expect(n.getState().speaking).toBe(false)
  })

  it('composes a game line from pieces («دي الأرض.» + «يلا ندور تاني على زحل!»)', async () => {
    const { n, audio } = make()
    n.unlock()
    const p = n.say(L('games.find.wrong', 'ده {chosen}. يلا ندور تاني على {planet}!', { chosen: 'الأرض', planet: 'زحل', chosenId: 'earth', planetId: 'saturn' }))
    expect(n.getState().text).toBe('دي الأرض.')
    audio.end()
    await vi.advanceTimersByTimeAsync(300)
    expect(n.getState().text).toBe('يلا ندور تاني على زحل!')
    audio.end()
    await expect(p).resolves.toBe(true)
    expect(realPlays(audio)).toEqual(['/base/audio/common.thisIs.earth.mp3', '/base/audio/games.find.tryAgain.saturn.mp3'])
  })

  it('a missing recording shows the caption (no robotic speech) and is logged once', async () => {
    const { n, audio, warnings } = make()
    n.unlock()
    const p = n.say(L('planets.mars.intro', 'ده المريخ!'))
    expect(n.getState()).toMatchObject({ backend: 'captions', text: 'ده المريخ!' })
    expect(realPlays(audio)).toEqual([])
    expect(warnings).toEqual([expect.stringContaining('planets.mars.intro')])
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(p).resolves.toBe(true)
  })

  it('a clip that fails to play falls back to its caption and reports an error', async () => {
    const { n, audio, events } = make()
    n.unlock()
    audio.failNext = true
    const p = n.say(L('start.welcome', 'أهلاً'))
    await vi.advanceTimersByTimeAsync(0)
    expect(n.getState().backend).toBe('captions')
    expect(events).toContain('error:start.welcome')
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(p).resolves.toBe(true)
  })

  it('mute / narration off → captions only', () => {
    const { n, audio } = make({ enabled: false })
    n.unlock()
    void n.say(L('start.welcome'))
    expect(realPlays(audio)).toEqual([])
    expect(n.getState().backend).toBe('captions')
  })

  it('pause and resume', () => {
    const { n, audio, events } = make()
    n.unlock()
    void n.say(L('start.welcome'))
    n.pause()
    expect(audio.paused).toBe(true)
    expect(n.getState().paused).toBe(true)
    n.resume()
    expect(audio.paused).toBe(false)
    expect(events).toEqual(['start:start.welcome', 'pause:start.welcome', 'resume:start.welcome'])
  })

  it('stop() cancels everything, including queued clips, and nothing stale plays later', async () => {
    const { n, audio } = make()
    n.unlock()
    const p = n.say([L('start.welcome'), L('zizo.intro')])
    n.stop()
    await expect(p).resolves.toBe(false)
    audio.end() // a late 'ended' from the old clip must not start the queue again
    await vi.advanceTimersByTimeAsync(1000)
    expect(realPlays(audio)).toEqual(['/base/audio/start.welcome.mp3'])
    expect(n.getState()).toMatchObject({ speaking: false, text: null })
  })

  it('captions use the current child name even though the recording says حلا', () => {
    const { n } = make({ childName: 'ليلى' })
    n.unlock()
    void n.say(L('start.welcome', 'أهلاً يا {name}'))
    expect(n.getState()).toMatchObject({ backend: 'recorded', text: 'أهلاً يا ليلى' })
  })
})
