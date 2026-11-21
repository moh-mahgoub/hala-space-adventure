/**
 * Narrator — one voice at a time, never overlapping.
 *
 * Backends, tried in order for each line:
 *   1. recorded   — public/audio/narration/<id>.mp3 if listed in recordings.ts
 *   2. speech     — Web Speech API with the best available Arabic voice
 *   3. captions   — no audio; caption is shown for an estimated reading time
 *
 * Interruption policy:
 *   • `say(x)` (default mode 'interrupt') stops whatever is playing, clears the
 *     queue, and starts x. This suits taps: the newest tap always wins.
 *   • `say(x, { mode: 'queue' })` appends after the current line (story sequences).
 *   • The returned promise resolves when that line finishes OR is interrupted,
 *     with `true` if it completed.
 *
 * No sound is made before `unlock()` is called from a user gesture.
 */

import { fill, isStaticTemplate, DEFAULT_CHILD_NAME, type Line } from '../content/lines'
import { RECORDED_LINES, RECORDING_EXT } from '../content/recordings'
import { pickArabicVoice } from './voices'

export type Backend = 'recorded' | 'speech' | 'captions'

export interface NarratorState {
  speaking: boolean
  /** Caption text currently being narrated (already filled in) */
  text: string | null
  backend: Backend | null
  /** Arabic voice name, or null if none was found */
  voiceName: string | null
  unlocked: boolean
}

export interface NarratorConfig {
  enabled: boolean
  volume: number
  rate: number
  childName: string
}

export interface NarratorDeps {
  getConfig: () => NarratorConfig
  synth?: SpeechSynthesis | null
  Utterance?: typeof SpeechSynthesisUtterance | null
  createAudio?: (src: string) => HTMLAudioElement
  baseUrl?: string
  recorded?: readonly string[]
  /** override timers (tests) */
  setTimeout?: (fn: () => void, ms: number) => unknown
  clearTimeout?: (t: unknown) => void
}

interface QueueItem {
  line: Line
  resolve: (completed: boolean) => void
}

export function estimateDurationMs(text: string, rate = 1): number {
  return Math.round((900 + text.length * 80) / Math.max(0.5, rate))
}

export class Narrator {
  private deps: Required<Omit<NarratorDeps, 'synth' | 'Utterance'>> & {
    synth: SpeechSynthesis | null
    Utterance: typeof SpeechSynthesisUtterance | null
  }
  private queue: QueueItem[] = []
  private current: QueueItem | null = null
  private token = 0
  private timers: unknown[] = []
  private audio: HTMLAudioElement | null = null
  private utterance: SpeechSynthesisUtterance | null = null
  private listeners = new Set<() => void>()
  private voice: SpeechSynthesisVoice | null = null
  private state: NarratorState = { speaking: false, text: null, backend: null, voiceName: null, unlocked: false }

  constructor(deps: NarratorDeps) {
    const g = globalThis as typeof globalThis & { speechSynthesis?: SpeechSynthesis }
    this.deps = {
      getConfig: deps.getConfig,
      synth: deps.synth !== undefined ? deps.synth : (g.speechSynthesis ?? null),
      Utterance:
        deps.Utterance !== undefined
          ? deps.Utterance
          : typeof SpeechSynthesisUtterance !== 'undefined'
            ? SpeechSynthesisUtterance
            : null,
      createAudio: deps.createAudio ?? ((src) => new Audio(src)),
      baseUrl: deps.baseUrl ?? '/',
      recorded: deps.recorded ?? RECORDED_LINES,
      setTimeout: deps.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms)),
      clearTimeout: deps.clearTimeout ?? ((t) => globalThis.clearTimeout(t as number)),
    }
    this.refreshVoice()
    const synth = this.deps.synth
    if (synth && 'addEventListener' in synth) {
      try {
        synth.addEventListener('voiceschanged', () => this.refreshVoice())
      } catch {
        /* old Safari */
      }
    }
  }

  // ── public API ─────────────────────────────────────────────────────────

  getState = (): NarratorState => this.state

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  get hasArabicVoice(): boolean {
    return this.voice != null
  }

  get speechSupported(): boolean {
    return this.deps.synth != null && this.deps.Utterance != null
  }

  /** Must be called from inside a user gesture (tap/click/key). */
  unlock(): void {
    if (this.state.unlocked) return
    this.setState({ unlocked: true })
    // iOS Safari needs a speak() call inside the first gesture to allow later speech.
    const { synth, Utterance } = this.deps
    if (synth && Utterance) {
      try {
        const u = new Utterance(' ')
        u.volume = 0
        synth.speak(u)
      } catch {
        /* ignore */
      }
    }
    this.refreshVoice()
  }

  say(line: Line | Line[], opts: { mode?: 'interrupt' | 'queue' } = {}): Promise<boolean> {
    const lines = Array.isArray(line) ? line : [line]
    if (opts.mode !== 'queue') this.stop()
    const promises = lines.map(
      (l) =>
        new Promise<boolean>((resolve) => {
          this.queue.push({ line: l, resolve })
        }),
    )
    if (!this.current) this.next()
    return Promise.all(promises).then((r) => r.every(Boolean))
  }

  /** Stop speaking and clear the queue. Pending promises resolve with false. */
  stop(): void {
    this.token++
    const pending = [...this.queue]
    this.queue = []
    const cur = this.current
    this.current = null
    this.haltPlayback()
    cur?.resolve(false)
    pending.forEach((p) => p.resolve(false))
    if (this.state.speaking || this.state.text) this.setState({ speaking: false, text: null, backend: null })
  }

  // ── internals ──────────────────────────────────────────────────────────

  private setState(patch: Partial<NarratorState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private refreshVoice() {
    try {
      const voices = this.deps.synth?.getVoices?.() ?? []
      this.voice = pickArabicVoice(voices)
    } catch {
      this.voice = null
    }
    if (this.state.voiceName !== (this.voice?.name ?? null)) this.setState({ voiceName: this.voice?.name ?? null })
  }

  private haltPlayback() {
    this.timers.forEach((t) => this.deps.clearTimeout(t))
    this.timers = []
    if (this.audio) {
      try {
        this.audio.onended = this.audio.onerror = null
        this.audio.pause()
      } catch {
        /* ignore */
      }
      this.audio = null
    }
    if (this.utterance) {
      this.utterance.onend = this.utterance.onerror = null
      this.utterance = null
      try {
        this.deps.synth?.cancel()
      } catch {
        /* ignore */
      }
    }
  }

  private next() {
    const item = this.queue.shift()
    if (!item) {
      this.current = null
      this.setState({ speaking: false, text: null, backend: null })
      return
    }
    this.current = item
    const myToken = ++this.token
    const cfg = this.deps.getConfig()
    const text = fill(item.line.template, cfg.childName, item.line.params)
    if (!text.trim()) {
      this.finish(myToken, true)
      return
    }

    const done = (completed: boolean) => this.finish(myToken, completed)

    if (cfg.enabled && this.state.unlocked && cfg.volume > 0) {
      const rec = this.recordingFor(item.line, cfg.childName)
      if (rec) {
        this.playRecording(rec, text, cfg, myToken, done)
        return
      }
      if (this.canSpeak()) {
        this.speak(text, cfg, myToken, done)
        return
      }
    }
    this.captionOnly(text, cfg, done)
  }

  private finish(token: number, completed: boolean) {
    if (token !== this.token || !this.current) return
    const item = this.current
    this.haltPlayback()
    this.current = null
    item.resolve(completed)
    // small gap between queued lines feels more natural
    if (this.queue.length) {
      const t = this.deps.setTimeout(() => {
        if (token === this.token) this.next()
      }, 250)
      this.timers.push(t)
    } else {
      this.setState({ speaking: false, text: null, backend: null })
    }
  }

  private recordingFor(line: Line, childName: string): string | null {
    if (!line.id || !this.deps.recorded.includes(line.id)) return null
    if (!isStaticTemplate(line.template) || (line.params && Object.keys(line.params).length)) return null
    if (line.template.includes('{name}') && childName !== DEFAULT_CHILD_NAME) return null
    return `${this.deps.baseUrl}audio/narration/${line.id}.${RECORDING_EXT}`
  }

  private canSpeak(): boolean {
    return this.speechSupported && this.voice != null
  }

  private playRecording(
    src: string,
    text: string,
    cfg: NarratorConfig,
    token: number,
    done: (c: boolean) => void,
  ) {
    let audio: HTMLAudioElement
    try {
      audio = this.deps.createAudio(src)
    } catch {
      this.fallbackFromRecording(text, cfg, token, done)
      return
    }
    this.audio = audio
    audio.volume = cfg.volume
    audio.onended = () => done(true)
    audio.onerror = () => {
      if (token === this.token) this.fallbackFromRecording(text, cfg, token, done)
    }
    this.setState({ speaking: true, text, backend: 'recorded' })
    const p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (token === this.token) this.fallbackFromRecording(text, cfg, token, done)
      })
    }
  }

  private fallbackFromRecording(text: string, cfg: NarratorConfig, token: number, done: (c: boolean) => void) {
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null
      this.audio = null
    }
    if (this.canSpeak()) this.speak(text, cfg, token, done)
    else this.captionOnly(text, cfg, done)
  }

  private speak(text: string, cfg: NarratorConfig, token: number, done: (c: boolean) => void) {
    const { synth, Utterance } = this.deps
    if (!synth || !Utterance) return this.captionOnly(text, cfg, done)
    const u = new Utterance(text)
    u.lang = this.voice?.lang || 'ar-EG'
    if (this.voice) u.voice = this.voice
    u.rate = cfg.rate
    u.pitch = 1.1
    u.volume = cfg.volume
    let started = false
    u.onstart = () => {
      started = true
    }
    u.onend = () => done(true)
    u.onerror = (e: SpeechSynthesisErrorEvent | Event) => {
      const err = (e as SpeechSynthesisErrorEvent).error
      if (err === 'interrupted' || err === 'canceled') return
      // speech failed — show the caption for its reading time instead
      if (token === this.token) {
        this.utterance = null
        this.captionOnly(text, cfg, done)
      }
    }
    this.utterance = u
    this.setState({ speaking: true, text, backend: 'speech' })
    try {
      // Chrome can get stuck "paused"; resume() is harmless elsewhere
      synth.resume?.()
      synth.speak(u)
    } catch {
      this.utterance = null
      this.captionOnly(text, cfg, done)
      return
    }
    // Safety net: some engines never fire onend (or never start).
    const est = estimateDurationMs(text, cfg.rate)
    this.timers.push(
      this.deps.setTimeout(() => {
        if (token === this.token && !started) {
          // never started — engine is silent; degrade to captions for the remaining time
          this.utterance = null
          try {
            synth.cancel()
          } catch {
            /* ignore */
          }
          this.captionOnly(text, cfg, done, est * 0.6)
        }
      }, 2500),
    )
    this.timers.push(this.deps.setTimeout(() => done(true), est * 2.5 + 4000))
  }

  private captionOnly(text: string, cfg: NarratorConfig, done: (c: boolean) => void, ms?: number) {
    this.setState({ speaking: true, text, backend: 'captions' })
    this.timers.push(this.deps.setTimeout(() => done(true), ms ?? estimateDurationMs(text, cfg.rate)))
  }
}
