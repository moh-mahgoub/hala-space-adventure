/**
 * Audit finding A002-03 (app side): every recorded clip is addressed by the
 * fingerprint of its actual MP3, and the fingerprint in the manifest must match
 * the file on disk. If a recording is replaced without updating the manifest,
 * this fails — and the release gate stops the deploy.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import manifest from './manifest.json'
import { clipAddress } from '.'

type Entry = { id: string; file: string; duration?: number; audioSha?: string; hash: string }
const entries = (manifest as Entry[]).filter((e) => e.duration)

describe('content-addressed clips (A002-03)', () => {
  it('every recorded clip carries the fingerprint of its MP3 file', () => {
    const wrong: string[] = []
    for (const e of entries) {
      const path = resolve(__dirname, '../../public', e.file)
      if (!existsSync(path)) continue // missing files are reported by the release gate in library.test.ts
      const sha = createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12)
      if (e.audioSha !== sha) wrong.push(`${e.id}: manifest ${e.audioSha ?? '(none)'} ≠ file ${sha}`)
    }
    expect(wrong, 'recordings changed without updating src/audio/manifest.json (run npm run audio:manifest)').toEqual([])
  })

  it('the fingerprint is of the AUDIO, not of the text (a re-take of the same line still gets a new address)', () => {
    for (const e of entries) {
      expect(e.audioSha).toMatch(/^[0-9a-f]{12}$/)
      expect(e.audioSha).not.toBe(e.hash)
    }
  })

  it('clip addresses are …/file.mp3?v=<fingerprint>', () => {
    const e = entries.find((x) => x.id === 'home.hello')!
    expect(clipAddress(e, '/hala-space-adventure/')).toBe(`/hala-space-adventure/${e.file}?v=${e.audioSha}`)
    // a different recording at the same path = a different address
    expect(clipAddress({ ...e, audioSha: '000000000000' }, '/x/')).not.toBe(clipAddress(e, '/x/'))
  })
})
