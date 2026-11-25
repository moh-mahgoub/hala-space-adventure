/**
 * Narrator — plays the PRERECORDED Egyptian-Arabic clips (storyteller + Zizo),
 * one at a time, never overlapping. No browser speech synthesis.
 *
 *  • `say(x)` (mode 'interrupt', default) stops whatever is playing, clears the
 *    queue and starts x — the newest tap always wins.
 *  • `say(x, { mode: 'queue' })` appends (dialogue sequences).
 *  • A line can expand to several clips (e.g. «دي الأرض.» + «يلا ندور تاني على زحل!»).
 *  • The returned promise resolves when the line finishes (true) or is cancelled (false).
 *  • Missing / failing clip → the caption is shown for its reading time and the
 *    problem is logged; the app never falls back to robotic speech.
 *  • Nothing plays before `unlock()` (call it inside the first tap).
 *
 * Lifecycle events (`on('start' | 'pause' | 'resume' | 'complete' | 'cancel' | 'error')`)
 * let animations follow the voice without knowing how audio is played.
 */
import { clipsForLine, type ClipPlay, type Speaker } from '../content/clips'
import type { Line } from '../content/lines'

export type Backend = 'recorded' | 'captions'

export interface NarratorState {
  speaking: boolean
  paused: boolean
  /** caption currently shown (already filled with the child's name) */
  text: string | null
  speaker: Speaker | null
  clipId: string | null
  backend: Backend | null
  unlocked: boolean
}

export interface NarratorConfig {
  enabled: boolean
  volume: number
  rate: number
  childName: string
}

export type NarratorEvent = 'start' | 'pause' | 'resume' | 'complete' | 'cancel' | 'error'
export interface NarratorEventInfo {
  clipId: string
  speaker: Speaker
}

export interface ClipSource {
  /** URL of a clip, or null if it hasn't been recorded */
  url(id: string): string | null
}

export interface NarratorDeps {
  getConfig: () => NarratorConfig
  clips: ClipSource
  createAudio?: () => HTMLAudioElement
  setTimeout?: (fn: () => void, ms: number) => unknown
  clearTimeout?: (t: unknown) => void
  warn?: (msg: string) => void
  /** true while the app is in the background: nothing new may start speaking */
  isAway?: () => boolean
}

interface QueueItem {
  clip: ClipPlay
  /** resolves the owning say() call when its LAST clip ends */
  resolve?: (completed: boolean) => void
}

/** A tiny silent WAV used to unlock the audio element inside the first tap. */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

export function estimateDurationMs(text: string, rate = 1): number {
  return Math.round((900 + text.length * 80) / Math.max(0.5, rate))
}

export class Narrator {
  private deps: Required<NarratorDeps>
  private queue: QueueItem[] = []
  private current: QueueItem | null = null
  private token = 0
  private timers: unknown[] = []
  private el: HTMLAudioElement | null = null
  private listeners = new Set<() => void>()
  private events = new Map<NarratorEvent, Set<(i: NarratorEventInfo) => void>>()
  private warned = new Set<string>()
  private preloaded = new Set<string>()
  private state: NarratorState = { speaking: false, paused: false, text: null, speaker: null, clipId: null, backend: null, unlocked: false }

  constructor(deps: NarratorDeps) {
    this.deps = {
      createAudio: () => new Audio(),
      setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
      clearTimeout: (t) => globalThis.clearTimeout(t as number),
      warn: (m) => console.warn(m),
      isAway: () => false,
      ...deps,
    }
  }

  // ── public API ─────────────────────────────────────────────────────────

  getState = (): NarratorState => this.state

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  on(event: NarratorEvent, fn: (i: NarratorEventInfo) => void): () => void {
    if (!this.events.has(event)) this.events.set(event, new Set())
    this.events.get(event)!.add(fn)
    return () => this.events.get(event)?.delete(fn)
  }

  /** Must be called inside a user gesture (first tap). */
  unlock(): void {
    if (this.state.unlocked) return
    this.setState({ unlocked: true })
    try {
      const el = this.element()
      el.src = SILENT_WAV
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } catch {
      /* fine — captions still work */
    }
  }

  say(line: Line | Line[], opts: { mode?: 'interrupt' | 'queue' } = {}): Promise<boolean> {
    const lines = Array.isArray(line) ? line : [line]
    // the child has left the app: never start talking in the background
    if (this.deps.isAway()) return Promise.resolve(false)
    if (opts.mode !== 'queue') this.stop()
    const name = this.deps.getConfig().childName
    const promises = lines.map(
      (l) =>
        new Promise<boolean>((resolve) => {
          const clips = clipsForLine(l, name)
          clips.forEach((clip, i) => this.queue.push({ clip, resolve: i === clips.length - 1 ? resolve : undefined }))
          if (!clips.length) resolve(true)
        }),
    )
    if (!this.current) this.next()
    return Promise.all(promises).then((r) => r.every(Boolean))
  }

  /** Stop and clear everything. Pending say() promises resolve with false. */
  stop(): void {
    this.token++
    const pending = [...this.queue]
    this.queue = []
    const cur = this.current
    this.current = null
    this.halt()
    if (cur) this.emit('cancel', cur.clip)
    cur?.resolve?.(false)
    pending.forEach((p) => p.resolve?.(false))
    if (this.state.speaking || this.state.text) this.setState({ speaking: false, paused: false, text: null, speaker: null, clipId: null, backend: null })
  }

  pause(): void {
    if (!this.current || this.state.paused) return
    this.el?.pause()
    this.setState({ paused: true })
    this.emit('pause', this.current.clip)
  }

  resume(): void {
    if (!this.current || !this.state.paused) return
    this.setState({ paused: false })
    const p = this.el?.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
    this.emit('resume', this.current.clip)
  }

  /** Hint the browser to fetch clips likely to play next (e.g. a screen's facts). */
  preload(lines: Line[]): void {
    if (typeof document === 'undefined') return
    const name = this.deps.getConfig().childName
    for (const l of lines)
      for (const c of clipsForLine(l, name)) {
        const url = this.deps.clips.url(c.id)
        if (!url || this.preloaded.has(url)) continue
        this.preloaded.add(url)
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'audio'
        link.href = url
        document.head.appendChild(link)
      }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private element(): HTMLAudioElement {
    if (!this.el) {
      this.el = this.deps.createAudio()
      this.el.preload = 'auto'
      this.el.setAttribute?.('playsinline', '')
    }
    return this.el
  }

  private setState(patch: Partial<NarratorState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private emit(ev: NarratorEvent, clip: ClipPlay) {
    this.events.get(ev)?.forEach((fn) => fn({ clipId: clip.id, speaker: clip.speaker }))
  }

  private halt() {
    this.timers.forEach((t) => this.deps.clearTimeout(t))
    this.timers = []
    if (this.el) {
      this.el.onended = this.el.onerror = null
      try {
        this.el.pause()
      } catch {
        /* ignore */
      }
    }
  }

  private next() {
    const item = this.queue.shift()
    if (!item) {
      this.current = null
      this.setState({ speaking: false, paused: false, text: null, speaker: null, clipId: null, backend: null })
      return
    }
    this.current = item
    const my = ++this.token
    const cfg = this.deps.getConfig()
    const { clip } = item
    const done = (completed: boolean) => this.finish(my, completed)
    const url = clip.id ? this.deps.clips.url(clip.id) : null

    if (url && cfg.enabled && cfg.volume > 0 && this.state.unlocked) {
      const el = this.element()
      el.onended = () => done(true)
      el.onerror = () => {
        if (my !== this.token) return
        this.warnOnce(clip.id, `[narration] clip failed to play: ${clip.id}`)
        this.emit('error', clip)
        this.captionOnly(clip, cfg, done)
      }
      el.volume = cfg.volume
      el.src = url
      el.playbackRate = cfg.rate
      this.setState({ speaking: true, paused: false, text: clip.caption, speaker: clip.speaker, clipId: clip.id, backend: 'recorded' })
      this.emit('start', clip)
      const p = el.play()
      if (p && typeof p.catch === 'function')
        p.catch(() => {
          if (my !== this.token) return
          this.emit('error', clip)
          this.captionOnly(clip, cfg, done)
        })
      // safety net: if 'ended' never fires (backgrounded tab, broken file)
      this.timers.push(this.deps.setTimeout(() => done(true), estimateDurationMs(clip.caption, cfg.rate) * 3 + 6000))
      return
    }
    if (!url && clip.id) this.warnOnce(clip.id, `[narration] no recording for "${clip.id}" — showing captions`)
    this.setState({ speaking: true, paused: false, text: clip.caption, speaker: clip.speaker, clipId: clip.id, backend: 'captions' })
    this.emit('start', clip)
    this.captionOnly(clip, cfg, done)
  }

  private captionOnly(clip: ClipPlay, cfg: NarratorConfig, done: (c: boolean) => void) {
    this.setState({ backend: 'captions', text: clip.caption, speaker: clip.speaker })
    this.timers.push(this.deps.setTimeout(() => done(true), estimateDurationMs(clip.caption, cfg.rate)))
  }

  private finish(token: number, completed: boolean) {
    if (token !== this.token || !this.current) return
    const item = this.current
    this.halt()
    this.current = null
    this.emit(completed ? 'complete' : 'cancel', item.clip)
    item.resolve?.(completed)
    if (this.queue.length) {
      // a short, natural pause between clips / speakers
      const pause = this.queue[0].clip.speaker !== item.clip.speaker ? 350 : 200
      this.timers.push(this.deps.setTimeout(() => token === this.token && this.next(), pause))
    } else {
      this.setState({ speaking: false, paused: false, text: null, speaker: null, clipId: null, backend: null })
    }
  }

  private warnOnce(id: string, msg: string) {
    if (this.warned.has(id)) return
    this.warned.add(id)
    this.deps.warn(msg)
  }
}
