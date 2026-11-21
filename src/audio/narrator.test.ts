import { Narrator, type NarratorConfig } from './narrator'
import { pickArabicVoice, scoreVoice } from './voices'

type Listener = (() => void) | null

class FakeUtterance {
  text: string
  lang = ''
  voice: unknown = null
  rate = 1
  pitch = 1
  volume = 1
  onstart: Listener = null
  onend: Listener = null
  onerror: ((e: { error: string }) => void) | null = null
  constructor(text: string) {
    this.text = text
  }
}

function fakeSynth(
  voices: { lang: string; name: string; localService: boolean; default: boolean }[],
  behaviour: 'normal' | 'slow' | 'silent' = 'normal',
) {
  const spoken: FakeUtterance[] = []
  return {
    spoken,
    synth: {
      // 'slow': engine is busy loading but hasn't fired onstart yet; 'silent': engine is dead
      speaking: behaviour === 'slow',
      pending: false,
      getVoices: () => voices,
      speak: (u: FakeUtterance) => {
        spoken.push(u)
        if (u.text.trim() && behaviour === 'normal') queueMicrotask(() => u.onstart?.())
      },
      cancel: vi.fn(),
      resume: vi.fn(),
      addEventListener: vi.fn(),
    },
  }
}

const AR = { lang: 'ar-SA', name: 'Maged', localService: true, default: false }
const cfg = (over: Partial<NarratorConfig> = {}): NarratorConfig => ({ enabled: true, volume: 1, rate: 1, childName: 'حلا', ...over })

function make(
  opts: {
    voices?: (typeof AR)[]
    config?: Partial<NarratorConfig>
    recorded?: string[]
    audioFails?: boolean
    engine?: 'normal' | 'slow' | 'silent'
  } = {},
) {
  const f = fakeSynth(opts.voices ?? [AR], opts.engine)
  const audios: { src: string; play: ReturnType<typeof vi.fn>; onended: Listener; onerror: Listener; pause: () => void; volume: number }[] = []
  const n = new Narrator({
    getConfig: () => cfg(opts.config),
    synth: f.synth as unknown as SpeechSynthesis,
    Utterance: FakeUtterance as unknown as typeof SpeechSynthesisUtterance,
    recorded: opts.recorded ?? [],
    baseUrl: '/base/',
    createAudio: (src) => {
      const a = {
        src,
        volume: 1,
        onended: null as Listener,
        onerror: null as Listener,
        pause: () => {},
        play: vi.fn(() => (opts.audioFails ? Promise.reject(new Error('404')) : Promise.resolve())),
      }
      audios.push(a)
      return a as unknown as HTMLAudioElement
    },
  })
  return { n, spoken: f.spoken, audios, synth: f.synth }
}

describe('voice selection', () => {
  it('prefers Egyptian Arabic, then other Arabic, never English', () => {
    const v = [
      { lang: 'en-US', name: 'Samantha', localService: true, default: true },
      { lang: 'ar-SA', name: 'Maged', localService: true, default: false },
      { lang: 'ar-EG', name: 'Microsoft Salma Online (Natural)', localService: false, default: false },
    ]
    expect(pickArabicVoice(v)?.lang).toBe('ar-EG')
    expect(pickArabicVoice(v.slice(0, 2))?.name).toBe('Maged')
    expect(pickArabicVoice(v.slice(0, 1))).toBeNull()
    expect(scoreVoice({ lang: 'en-GB', name: 'x', localService: true, default: false })).toBe(-1)
  })
})

describe('Narrator', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('makes no sound before unlock (shows captions instead)', async () => {
    const { n, spoken } = make()
    void n.say({ id: 'x', template: 'أهلاً يا {name}' })
    expect(spoken).toHaveLength(0)
    expect(n.getState().text).toBe('أهلاً يا حلا')
    expect(n.getState().backend).toBe('captions')
  })

  it('speaks with the Arabic voice after unlock and fills the name', () => {
    const { n, spoken } = make({ config: { childName: 'ليلى' } })
    n.unlock()
    void n.say({ template: 'يا {name}' })
    const real = spoken.filter((u) => u.text.trim())
    expect(real).toHaveLength(1)
    expect(real[0].text).toBe('يا ليلى')
    expect(real[0].lang).toBe('ar-SA')
    expect(n.getState().backend).toBe('speech')
  })

  it('interrupts: a new line stops the current one (no overlap)', async () => {
    const { n, synth } = make()
    n.unlock()
    const first = n.say({ template: 'واحد' })
    void n.say({ template: 'اتنين' })
    expect(synth.cancel).toHaveBeenCalled()
    await expect(first).resolves.toBe(false)
    expect(n.getState().text).toBe('اتنين')
  })

  it('queues lines in order when asked', async () => {
    const { n, spoken } = make()
    n.unlock()
    const done = n.say([{ template: 'واحد' }, { template: 'اتنين' }])
    const real = () => spoken.filter((u) => u.text.trim())
    expect(real().map((u) => u.text)).toEqual(['واحد'])
    real()[0].onend?.()
    await vi.advanceTimersByTimeAsync(300)
    expect(real().map((u) => u.text)).toEqual(['واحد', 'اتنين'])
    real()[1].onend?.()
    await expect(done).resolves.toBe(true)
    expect(n.getState().speaking).toBe(false)
  })

  it('falls back to captions when no Arabic voice exists', async () => {
    const { n, spoken } = make({ voices: [] })
    n.unlock()
    const p = n.say({ template: 'مرحبا' })
    expect(spoken.filter((u) => u.text.trim())).toHaveLength(0)
    expect(n.getState()).toMatchObject({ backend: 'captions', text: 'مرحبا', speaking: true })
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(p).resolves.toBe(true)
  })

  it('falls back to captions when narration is turned off', () => {
    const { n, spoken } = make({ config: { enabled: false } })
    n.unlock()
    void n.say({ template: 'مرحبا' })
    expect(spoken.filter((u) => u.text.trim())).toHaveLength(0)
    expect(n.getState().backend).toBe('captions')
  })

  it('degrades to captions if a speech error happens', () => {
    const { n, spoken } = make()
    n.unlock()
    void n.say({ template: 'مرحبا' })
    spoken.at(-1)!.onerror?.({ error: 'synthesis-failed' })
    expect(n.getState().backend).toBe('captions')
  })

  it('plays recorded audio when available, with the default name only', () => {
    const { n, audios } = make({ recorded: ['start.welcome'] })
    n.unlock()
    void n.say({ id: 'start.welcome', template: 'أهلاً يا {name}' })
    expect(audios[0].src).toBe('/base/audio/narration/start.welcome.mp3')
    expect(n.getState().backend).toBe('recorded')

    const other = make({ recorded: ['start.welcome'], config: { childName: 'ليلى' } })
    other.n.unlock()
    void other.n.say({ id: 'start.welcome', template: 'أهلاً يا {name}' })
    expect(other.audios).toHaveLength(0)
    expect(other.n.getState().backend).toBe('speech')
  })

  it('falls back to speech if a recording fails to load', async () => {
    const { n, spoken } = make({ recorded: ['a.b'], audioFails: true })
    n.unlock()
    void n.say({ id: 'a.b', template: 'سلام' })
    await vi.advanceTimersByTimeAsync(0)
    expect(spoken.filter((u) => u.text.trim()).map((u) => u.text)).toEqual(['سلام'])
    expect(n.getState().backend).toBe('speech')
  })

  it('keeps waiting for a slow engine that is busy (does not cut real speech)', async () => {
    const { n, synth } = make({ engine: 'slow' })
    n.unlock()
    void n.say({ template: 'مرحبا' })
    await vi.advanceTimersByTimeAsync(4500)
    expect(n.getState().backend).toBe('speech')
    expect(synth.cancel).not.toHaveBeenCalled()
  })

  it('degrades to captions if the engine never starts and is idle', async () => {
    const { n } = make({ engine: 'silent' })
    n.unlock()
    const p = n.say({ template: 'مرحبا' })
    await vi.advanceTimersByTimeAsync(4500)
    expect(n.getState().backend).toBe('captions')
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(p).resolves.toBe(true)
  })

  it('finds an Arabic voice that loads late (Safari) instead of staying silent', async () => {
    const voices: (typeof AR)[] = []
    const { n, spoken } = make({ voices })
    n.unlock()
    expect(n.hasArabicVoice).toBe(false)
    voices.push(AR) // the list fills in after a moment, with no 'voiceschanged' event
    await vi.advanceTimersByTimeAsync(300)
    expect(n.hasArabicVoice).toBe(true)
    void n.say({ template: 'مرحبا' })
    expect(spoken.filter((u) => u.text.trim()).map((u) => u.text)).toEqual(['مرحبا'])
  })

  it('waits briefly after cancel() before speaking again (Safari drops it otherwise)', async () => {
    const { n, spoken } = make()
    n.unlock()
    void n.say({ template: 'واحد' })
    void n.say({ template: 'اتنين' }) // interrupts → cancel()
    const real = () => spoken.filter((u) => u.text.trim()).map((u) => u.text)
    expect(real()).toEqual(['واحد'])
    expect(n.getState().text).toBe('اتنين') // caption shows right away
    await vi.advanceTimersByTimeAsync(200)
    expect(real()).toEqual(['واحد', 'اتنين'])
  })

  it('does not call cancel() when a line ends by itself', async () => {
    const { n, spoken, synth } = make()
    n.unlock()
    void n.say({ template: 'واحد' })
    spoken.filter((u) => u.text.trim())[0].onend?.()
    await vi.advanceTimersByTimeAsync(10)
    expect(synth.cancel).not.toHaveBeenCalled()
  })

  it('stop() clears everything', async () => {
    const { n } = make()
    n.unlock()
    const p = n.say([{ template: 'واحد' }, { template: 'اتنين' }])
    n.stop()
    await expect(p).resolves.toBe(false)
    expect(n.getState()).toMatchObject({ speaking: false, text: null })
  })
})
