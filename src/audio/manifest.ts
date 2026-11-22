/**
 * Prerecorded-audio manifest (shared by the runtime player and the
 * development-time generator). Every spoken clip is one entry; components refer
 * to clips by stable `id` only — never by file path.
 */
export type Speaker = 'narrator' | 'zizo'

export type AudioCategory =
  | 'welcome'
  | 'planets'
  | 'stories'
  | 'games'
  | 'rewards'
  | 'common'
  | 'reactions'
  | 'jokes'
  | 'celebrations'
  | 'hints'

export interface AudioEntry {
  /** stable id, e.g. "planets.saturn.intro" */
  id: string
  speaker: Speaker
  /** canonical Arabic text (what captions show) */
  text: string
  /** optional pronunciation-only variant sent to the TTS provider */
  synthText?: string
  /** delivery direction, e.g. "excited" */
  emotion: string
  /** path relative to the site base, e.g. "audio/ar-EG/narrator/planets/planets.saturn.intro.mp3" */
  file: string
  category: AudioCategory
  /** seconds, filled in after generation */
  duration?: number
  /** scene / screen association (for preloading) */
  scene?: string
  /** optional animation cue fired with the clip */
  animation?: string
  /** content hash of speaker+voice+synthesis text → regenerate only when it changes */
  hash?: string
}

export const AUDIO_ROOT = 'audio/ar-EG'

/** File path for a clip. Ids are used verbatim (safe characters only). */
export function audioFile(speaker: Speaker, category: AudioCategory, id: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error(`invalid audio id: ${id}`)
  return `${AUDIO_ROOT}/${speaker}/${category}/${id}.mp3`
}

/** Default speaker/category for an existing script id (Stage B may override per line). */
export function classify(id: string): { speaker: Speaker; category: AudioCategory } {
  const [root, sub] = id.split('.')
  switch (root) {
    case 'reactions':
      return { speaker: 'zizo', category: 'reactions' }
    case 'zizo':
      return {
        speaker: 'zizo',
        category: sub === 'planets' ? 'jokes' : sub === 'celebrate' ? 'celebrations' : sub === 'neverMind' ? 'hints' : 'reactions',
      }
    case 'planets':
      return { speaker: 'narrator', category: 'planets' }
    case 'story':
      return { speaker: 'narrator', category: 'stories' }
    case 'games':
      return { speaker: 'narrator', category: 'games' }
    case 'map':
      return { speaker: 'narrator', category: 'rewards' }
    case 'common':
      return sub === 'praise' ? { speaker: 'narrator', category: 'rewards' } : { speaker: 'narrator', category: 'common' }
    default:
      return { speaker: 'narrator', category: 'welcome' }
  }
}

/** Placeholders other than {name} can't be prerecorded as one clip. */
export function needsRestructure(text: string): boolean {
  return [...text.matchAll(/\{(\w+)\}/g)].some((m) => m[1] !== 'name')
}
