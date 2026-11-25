/** App-wide audio singletons, wired to the settings store. */
import { useSyncExternalStore } from 'react'
import { line, type Line, type Params } from '../content/lines'
import { settingsStore } from '../state/settings'
import { Narrator, type NarratorState } from './narrator'
import { SoundEngine, type Sfx } from './sfx'
import { enablePlaybackAudio } from './iosAudioSession'
import manifest from './manifest.json'
import { onRouteChange } from '../router'

type Entry = { id: string; file: string; duration?: number; audioSha?: string }
/**
 * Clips that have actually been recorded (the generator records their duration),
 * addressed by content: `…/clip.mp3?v=<audioSha>`. A re-recorded clip gets a new
 * address, so neither the offline cache nor the browser can keep the old take
 * (audit finding A002-03).
 */
export function clipAddress(e: Entry, base = import.meta.env.BASE_URL): string {
  return e.audioSha ? `${base}${e.file}?v=${e.audioSha}` : `${base}${e.file}`
}
const recorded = new Map((manifest as Entry[]).filter((e) => e.duration).map((e) => [e.id, clipAddress(e)]))
export const recordedClipCount = () => recorded.size
export const totalClipCount = () => (manifest as unknown[]).length

export const narrator = new Narrator({
  getConfig: () => {
    const s = settingsStore.get()
    return { enabled: s.narration && !s.muted, volume: s.volume, rate: s.rate, childName: s.childName }
  },
  clips: {
    url: (id) => {
      return recorded.get(id) ?? null
    },
  },
})

export const sound = new SoundEngine(() => {
  const s = settingsStore.get()
  return { sfx: s.sfx, music: s.music, volume: s.muted ? 0 : s.volume }
})

// Music gently dips while anyone is speaking
narrator.subscribe(() => sound.duck(narrator.getState().speaking))

// A new screen never inherits the previous screen's narration
onRouteChange(() => narrator.stop())

let wasAudible = true
settingsStore.subscribe(() => {
  sound.applyConfig()
  const s = settingsStore.get()
  const audible = s.narration && !s.muted
  // cut the voice immediately when muted (the caption is cleared too)
  if (wasAudible && !audible) narrator.stop()
  wasAudible = audible
})

/** Unlock all audio — call from the first user gesture. */
export function unlockAudio() {
  enablePlaybackAudio() // iPad: play even when the device is in silent mode
  narrator.unlock()
  sound.unlock()
}

/** Narrate a script line by id (interrupts whatever is playing). */
export function say(id: string, params?: Params) {
  return narrator.say(line(id, params))
}

/** Narrate several lines in sequence. */
export function sayAll(lines: (string | Line)[]) {
  return narrator.say(lines.map((l) => (typeof l === 'string' ? line(l) : l)))
}

export function sfx(name: Sfx) {
  sound.play(name)
}

export function useNarrator(): NarratorState {
  return useSyncExternalStore(narrator.subscribe, narrator.getState, narrator.getState)
}

export { line }

