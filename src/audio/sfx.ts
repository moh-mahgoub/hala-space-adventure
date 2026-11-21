/**
 * Sound effects and ambient music, synthesized with the Web Audio API —
 * no audio files to download, works offline, no licensing questions.
 * Everything is soft: there are deliberately no "wrong answer" buzzers.
 */

export type Sfx = 'tap' | 'pop' | 'success' | 'gentle' | 'star' | 'whoosh' | 'celebrate' | 'launch' | 'chime'

type Ctx = AudioContext

const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]

export interface SoundConfig {
  sfx: boolean
  music: boolean
  volume: number
}

export class SoundEngine {
  private ctx: Ctx | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicNodes: AudioNode[] = []
  private musicTimer: ReturnType<typeof setTimeout> | null = null
  private getConfig: () => SoundConfig

  constructor(getConfig: () => SoundConfig) {
    this.getConfig = getConfig
  }

  get available(): boolean {
    const g = globalThis as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown }
    return !!(g.AudioContext || g.webkitAudioContext)
  }

  /** Call from a user gesture. */
  unlock(): void {
    if (!this.available) return
    try {
      if (!this.ctx) {
        const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
        const C = (g.AudioContext || g.webkitAudioContext)!
        this.ctx = new C()
        this.master = this.ctx.createGain()
        this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      // iOS: play a silent buffer inside the gesture to fully unlock
      const buf = this.ctx.createBuffer(1, 1, 22050)
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.connect(this.ctx.destination)
      src.start(0)
      this.applyConfig()
    } catch {
      this.ctx = null
    }
  }

  applyConfig(): void {
    const cfg = this.getConfig()
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(cfg.volume, this.ctx.currentTime, 0.05)
    if (cfg.music) this.startMusic()
    else this.stopMusic()
  }

  play(name: Sfx): void {
    const cfg = this.getConfig()
    if (!cfg.sfx || !this.ctx || !this.master || cfg.volume <= 0) return
    try {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      const t = this.ctx.currentTime
      switch (name) {
        case 'tap':
          this.tone(740, t, 0.07, 'sine', 0.18)
          break
        case 'pop':
          this.sweep(900, 300, t, 0.12, 'sine', 0.22)
          break
        case 'success':
          ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.09, 0.22, 'triangle', 0.2))
          break
        case 'gentle':
          this.tone(587.33, t, 0.18, 'sine', 0.12)
          this.tone(493.88, t + 0.16, 0.25, 'sine', 0.1)
          break
        case 'star':
          ;[1318.5, 1568, 2093].forEach((f, i) => this.tone(f, t + i * 0.06, 0.18, 'sine', 0.12))
          break
        case 'whoosh':
          this.noise(t, 0.5, 400, 3000, 0.18)
          break
        case 'launch':
          this.noise(t, 1.4, 150, 2500, 0.25)
          this.sweep(110, 440, t, 1.4, 'sawtooth', 0.04)
          break
        case 'chime':
          this.tone(1046.5, t, 0.3, 'sine', 0.08)
          break
        case 'celebrate':
          ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.1, 0.3, 'triangle', 0.18))
          ;[2093, 1760, 2349, 2637].forEach((f, i) => this.tone(f, t + 0.55 + i * 0.08, 0.2, 'sine', 0.08))
          break
      }
    } catch {
      /* never let sound break the app */
    }
  }

  private env(g: GainNode, t: number, dur: number, peak: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, peak: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    this.env(g, t, dur, peak)
    o.connect(g).connect(this.master!)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private sweep(f0: number, f1: number, t: number, dur: number, type: OscillatorType, peak: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    this.env(g, t, dur, peak)
    o.connect(g).connect(this.master!)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private noise(t: number, dur: number, f0: number, f1: number, peak: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(f0, t)
    filter.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter).connect(g).connect(this.master!)
    src.start(t)
    src.stop(t + dur)
  }

  // ── ambient music: a soft pad plus occasional bell notes ──────────────
  private startMusic() {
    if (!this.ctx || !this.master || this.musicGain) return
    const ctx = this.ctx
    this.musicGain = ctx.createGain()
    this.musicGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    this.musicGain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 3)
    this.musicGain.connect(this.master)
    const pad = [130.81, 196.0, 261.63]
    pad.forEach((f, i) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      o.detune.value = i * 4 - 4
      const g = ctx.createGain()
      g.gain.value = 0.12
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.07 + i * 0.03
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.06
      lfo.connect(lfoGain).connect(g.gain)
      o.connect(g).connect(this.musicGain!)
      o.start()
      lfo.start()
      this.musicNodes.push(o, lfo)
    })
    const bell = () => {
      if (!this.ctx || !this.musicGain) return
      const t = this.ctx.currentTime
      const f = PENTA[Math.floor(Math.random() * PENTA.length)] * 2
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      this.env(g, t, 2.2, 0.05)
      o.connect(g).connect(this.musicGain)
      o.start(t)
      o.stop(t + 2.3)
      this.musicTimer = setTimeout(bell, 1800 + Math.random() * 2600)
    }
    this.musicTimer = setTimeout(bell, 1500)
  }

  private stopMusic() {
    if (this.musicTimer) clearTimeout(this.musicTimer)
    this.musicTimer = null
    if (!this.musicGain || !this.ctx) return
    const g = this.musicGain
    const nodes = this.musicNodes
    g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4)
    setTimeout(() => {
      nodes.forEach((n) => {
        try {
          ;(n as OscillatorNode).stop()
        } catch {
          /* ignore */
        }
      })
      g.disconnect()
    }, 1500)
    this.musicGain = null
    this.musicNodes = []
  }
}
