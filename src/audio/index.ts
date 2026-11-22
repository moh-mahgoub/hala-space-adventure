/** App-wide audio singletons, wired to the settings store. */
import { useSyncExternalStore } from 'react'
import { line, type Line, type Params } from '../content/lines'
import { settingsStore } from '../state/settings'
import { Narrator, type NarratorState } from './narrator'
import { SoundEngine, type Sfx } from './sfx'
import { enablePlaybackAudio } from './iosAudioSession'
import manifest from './manifest.json'
import { onRouteChange } from '../router'

/** Clips that have actually been recorded (the generator records their duration). */
const recorded = new Map((manifest as { id: string; file: string; duration?: number }[]).filter((e) => e.duration).map((e) => [e.id, e.file]))
export const recordedClipCount = () => recorded.size
export const totalClipCount = () => (manifest as unknown[]).length

export const narrator = new Narrator({
  getConfig: () => {
    const s = settingsStore.get()
    return { enabled: s.narration && !s.muted, volume: s.volume, rate: s.rate, childName: s.childName }
  },
  clips: {
    url: (id) => {
      const file = recorded.get(id)
      return file ? `${import.meta.env.BASE_URL}${file}` : null
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

