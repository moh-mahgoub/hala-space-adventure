#!/usr/bin/env node
// Builds src/audio/manifest.json — every clip the app can play — from the clip
// catalogue (src/content/clips.ts). Keeps the duration of clips whose content and
// voice are unchanged, so only new or edited lines need regenerating.
//   npm run audio:manifest
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { allClips } from '../src/content/clips.ts'
import { audioFile, classify } from '../src/audio/manifest.ts'
import { estimate } from './lib/cost.mjs'
import { VOICES } from './voices.config.mjs'

export const MANIFEST = 'src/audio/manifest.json'

/**
 * Fingerprint of the recording itself (first 12 hex of SHA-256 of the MP3 bytes).
 * The app puts it in each clip's address (…/clip.mp3?v=<audioSha>), so a
 * re-recorded clip gets a new address and the offline cache can't keep the old
 * take (audit finding A002-03). Not to be confused with `hash`, which only
 * describes the TEXT and voice settings and stays the same for a re-take.
 */
export function audioDigest(file) {
  const p = path.join('public', file)
  return existsSync(p) ? createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 12) : undefined
}

export function clipHash(c) {
  const v = VOICES[c.speaker]
  return createHash('sha1').update(`${v.provider}|${v.model}|${v.voice}|${v.fx}|${c.emotion}|${c.synthText ?? c.text}`).digest('hex').slice(0, 12)
}

export function buildManifest() {
  const previous = existsSync(MANIFEST) ? Object.fromEntries(JSON.parse(readFileSync(MANIFEST, 'utf8')).map((e) => [e.id, e])) : {}
  return allClips().map((c) => {
    const { category } = classify(c.id)
    const hash = clipHash(c)
    const entry = { id: c.id, speaker: c.speaker, category, text: c.text, emotion: c.emotion, file: audioFile(c.speaker, category, c.id), hash }
    if (c.synthText) entry.synthText = c.synthText
    const prev = previous[c.id]
    if (prev?.take) entry.take = prev.take // how many times this clip has been recorded
    if (prev && prev.hash === hash && prev.duration) entry.duration = prev.duration
    if (entry.duration) {
      const sha = audioDigest(entry.file)
      if (sha) entry.audioSha = sha
    }
    return entry
  })
}

if (process.argv[1]?.endsWith('build-manifest.mjs')) {
  const entries = buildManifest()
  writeFileSync(MANIFEST, JSON.stringify(entries, null, 1) + '\n')
  const chars = entries.reduce((s, e) => s + e.text.length, 0)
  const count = (sp) => entries.filter((e) => e.speaker === sp).length
  console.log(`Manifest: ${entries.length} clips (narrator ${count('narrator')}, zizo ${count('zizo')}), ${chars} characters`)
  console.log(`Needing (re)generation: ${entries.filter((e) => !e.duration).length}`)
  console.log(`Gemini estimate for a full pass: ≈ $${estimate('gemini', chars).usd} (list price)`)
}
