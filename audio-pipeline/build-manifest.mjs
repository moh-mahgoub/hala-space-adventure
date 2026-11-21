#!/usr/bin/env node
// Builds a DRAFT manifest from today's scripts (src/content) to size the Stage B
// library. Stage B turns this into the final, reviewed manifest.
//   npm run audio:manifest:draft
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { script } from '../src/content/script.ts'
import { STORY } from '../src/content/story.ts'
import { audioFile, classify, needsRestructure } from '../src/audio/manifest.ts'
import { estimate } from './lib/cost.mjs'

const lines = []
function walk(o, p) {
  if (typeof o === 'string') lines.push([p.join('.'), o])
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, [...p, k])
}
walk(script, [])
for (const c of STORY) {
  c.steps.forEach((s, i) => {
    lines.push([`story.${c.id}.${i}`, s.text])
    if (s.done) lines.push([`story.${c.id}.${i}.done`, s.done])
    if (s.options) s.options.forEach((o, j) => lines.push([`story.${c.id}.${i}.reply${j}`, o.reply]))
  })
}
const spoken = lines.filter(([id]) => !id.includes('factIcons') && !id.startsWith('games.names'))
const entries = spoken.map(([id, text]) => {
  const { speaker, category } = classify(id)
  const entry = {
    id,
    speaker,
    category,
    text,
    emotion: 'auto',
    file: audioFile(speaker, category, id),
    hash: createHash('sha1').update(`${speaker}|${text}`).digest('hex').slice(0, 10),
  }
  if (needsRestructure(text)) entry.todo = 'game-time placeholders: split into composable clips in Stage B'
  return entry
})
writeFileSync('audio-pipeline/manifest.draft.json', JSON.stringify(entries, null, 2))

const chars = entries.reduce((s, e) => s + e.text.length, 0)
const count = (sp) => entries.filter((e) => e.speaker === sp).length
console.log(`Draft manifest: ${entries.length} clips (narrator ${count('narrator')}, zizo ${count('zizo')}), ${chars} characters`)
console.log(`Needs restructuring (dynamic placeholders): ${entries.filter((e) => e.todo).length}`)
for (const p of ['azure', 'elevenlabs', 'gemini']) {
  const once = estimate(p, chars)
  // +60% for new Zizo / dialogue lines and split clips, ×1.5 for retakes
  const realistic = estimate(p, Math.round(chars * 1.6 * 1.5))
  console.log(`  ${p}: one pass ≈ $${once.usd}; realistic total (new lines + retakes) ≈ $${realistic.usd}`)
}
