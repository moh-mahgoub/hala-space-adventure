/**
 * Release gate: every clip in the manifest must be recorded and present in
 * public/ before the site is deployed. (Fails while the library is incomplete.)
 */
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import manifest from './manifest.json'

const root = path.resolve(__dirname, '../..')
const entries = manifest as { id: string; file: string; duration?: number; speaker: string }[]

describe('narration library', () => {
  it('has a recording for every clip, served under audio/ar-EG/', () => {
    const missing = entries.filter((e) => !e.duration || !existsSync(path.join(root, 'public', e.file))).map((e) => e.id)
    expect(missing, `missing recordings: ${missing.slice(0, 10).join(', ')}`).toEqual([])
    for (const e of entries) expect(e.file.startsWith('audio/ar-EG/')).toBe(true)
  })

  it('recordings are real audio of a sensible length and size', () => {
    for (const e of entries) {
      const size = statSync(path.join(root, 'public', e.file)).size
      expect(size, e.id).toBeGreaterThan(2_000)
      expect(size, e.id).toBeLessThan(400_000)
      expect(e.duration!, e.id).toBeGreaterThan(0.4)
      expect(e.duration!, e.id).toBeLessThan(40)
    }
  })

  it('both voices are in the library', () => {
    expect(new Set(entries.map((e) => e.speaker))).toEqual(new Set(['narrator', 'zizo']))
  })
})
