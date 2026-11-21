/** App-wide audio singletons, wired to the settings store. */
import { useSyncExternalStore } from 'react'
import { line, type Line, type Params } from '../content/lines'
import { settingsStore } from '../state/settings'
import { Narrator, type NarratorState } from './narrator'
import { SoundEngine, type Sfx } from './sfx'

export const narrator = new Narrator({
  getConfig: () => {
    const s = settingsStore.get()
    return { enabled: s.narration && !s.muted, volume: s.volume, rate: s.rate, childName: s.childName }
  },
  baseUrl: import.meta.env.BASE_URL,
})

export const sound = new SoundEngine(() => {
  const s = settingsStore.get()
  return { sfx: s.sfx, music: s.music, volume: s.muted ? 0 : s.volume }
})

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
