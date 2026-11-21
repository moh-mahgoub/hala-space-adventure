#!/usr/bin/env node
/**
 * Voice audition generator (DEVELOPMENT TIME ONLY — never runs in the website).
 *
 *   node audio-pipeline/audition.mjs --dry-run                 # plan + cost estimate, no API calls
 *   node audio-pipeline/audition.mjs                           # all providers with credentials
 *   node audio-pipeline/audition.mjs --providers gemini,azure  # subset
 *   node audio-pipeline/audition.mjs --character zizo --only z3-rings --force
 *
 * Output (git-ignored): audition/out/<character>/<provider-voice>/<line>.mp3,
 * audition/out/results.json and audition/out/index.html (open with `npm run audio:audition:serve`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finishClip, hasFfmpeg } from './lib/audio.mjs'
import { estimate } from './lib/cost.mjs'
import { loadEnv } from './lib/env.mjs'
import { CHARACTERS, EMOTION_HINT } from './characters.mjs'
import { ALL_AUDITION_LINES, CANDIDATES } from './auditions.mjs'
import * as gemini from './providers/gemini.mjs'
import * as elevenlabs from './providers/elevenlabs.mjs'
import * as azure from './providers/azure.mjs'
import { buildAuditionPage } from './audition-page.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const OUT = path.join(ROOT, 'audition', 'out')
export const PROVIDERS = { gemini, elevenlabs, azure }

function parseArgs(argv) {
  const a = { providers: Object.keys(PROVIDERS), character: null, only: null, dryRun: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--dry-run') a.dryRun = true
    else if (k === '--force') a.force = true
    else if (k === '--providers') a.providers = argv[++i].split(',')
    else if (k === '--character') a.character = argv[++i]
    else if (k === '--only') a.only = argv[++i].split(',')
  }
  return a
}

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Turn a candidate entry into concrete voices (ElevenLabs searches the library). */
async function resolveVoices(provider, cand, dryRun) {
  if (provider !== 'elevenlabs' || !cand.search) return [cand]
  if (dryRun) return Array.from({ length: cand.pick }, (_, i) => ({ ...cand, voice: `<egyptian-${cand.search.gender}-${i + 1}>` }))
  const found = await elevenlabs.searchVoices({ ...cand.search, language: 'ar' })
  const preferred = found.filter((v) => cand.prefer.some((p) => v.name.toLowerCase().includes(p.toLowerCase())))
  const ordered = [...preferred, ...found.filter((v) => !preferred.includes(v))].slice(0, cand.pick)
  const out = []
  for (const v of ordered) {
    const voiceId = await elevenlabs.ensureVoice(v)
    out.push({ ...cand, voice: voiceId, voiceName: v.name, note: `${v.name} — ${v.accent ?? ''} ${v.gender ?? ''} ${v.age ?? ''} · ${v.description}` })
  }
  return out
}

export function directionFor(provider, line) {
  const emo = EMOTION_HINT[line.emotion] ?? { en: line.emotion, tag: '' }
  if (provider === 'gemini') return `${CHARACTERS[line.speaker].direction} Emotion: ${emo.en}.`
  if (provider === 'elevenlabs') return emo.tag
  return null
}

export function clipKey(provider, cand) {
  return `${provider}-${slug(cand.voiceName ?? cand.voice)}${cand.fx && cand.fx !== 'none' ? `-${cand.fx}` : ''}`
}

async function main() {
  loadEnv(ROOT)
  const args = parseArgs(process.argv.slice(2))
  const resultsFile = path.join(OUT, 'results.json')
  const results = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, 'utf8')) : { clips: {}, providers: {} }
  mkdirSync(OUT, { recursive: true })

  if (!args.dryRun && !hasFfmpeg()) {
    console.error('✖ ffmpeg is required to finish clips (macOS: brew install ffmpeg).')
    process.exit(1)
  }

  const plan = []
  for (const p of args.providers) {
    const mod = PROVIDERS[p]
    if (!mod) throw new Error(`Unknown provider ${p}`)
    const ok = mod.available()
    results.providers[p] = { label: mod.label, available: ok, credentials: mod.credentials }
    if (!ok && !args.dryRun) {
      console.log(`– ${mod.label}: skipped (set ${mod.credentials.join(' + ')} in .env.local)`)
      continue
    }
    for (const character of ['narrator', 'zizo']) {
      if (args.character && args.character !== character) continue
      for (const cand of CANDIDATES[p][character]) {
        let voices
        try {
          voices = await resolveVoices(p, cand, args.dryRun || !ok)
        } catch (e) {
          console.log(`✖ ${mod.label} voice lookup failed: ${e.message}`)
          continue
        }
        for (const v of voices) {
          for (const line of ALL_AUDITION_LINES.filter((l) => l.speaker === character)) {
            if (args.only && !args.only.includes(line.id)) continue
            plan.push({ provider: p, character, cand: v, line })
          }
        }
      }
    }
  }

  // ── estimate ──
  const byProvider = {}
  for (const j of plan) byProvider[j.provider] = (byProvider[j.provider] ?? 0) + (j.line.synthText ?? j.line.text).length
  console.log('\nAudition plan')
  for (const [p, chars] of Object.entries(byProvider)) {
    const e = estimate(p, chars)
    const n = plan.filter((j) => j.provider === p).length
    console.log(`  ${PROVIDERS[p].label}: ${n} clips, ${chars} characters ≈ $${e.usd} (before free tiers). ${e.note}`)
  }
  if (args.dryRun) {
    console.log('\n(dry run — nothing was generated)')
    return
  }

  // ── generate (sequential: kind to rate limits) ──
  let made = 0
  let failed = 0
  for (const j of plan) {
    const key = clipKey(j.provider, j.cand)
    const rel = path.join(j.character, key, `${j.line.id}.mp3`)
    const file = path.join(OUT, rel)
    const id = `${key}/${j.line.id}`
    if (existsSync(file) && !args.force) continue
    const text = j.line.synthText ?? j.line.text
    try {
      const r = await PROVIDERS[j.provider].synthesize({
        text,
        voice: j.cand.voice,
        style: directionFor(j.provider, j.line),
        prosody: j.cand.prosody,
      })
      const { duration } = finishClip(r.audio, file, { fx: j.cand.fx ?? 'none' })
      results.clips[id] = {
        status: 'ok',
        provider: j.provider,
        model: r.model,
        voice: j.cand.voiceName ?? j.cand.voice,
        voiceId: j.cand.voice,
        fx: j.cand.fx ?? 'none',
        note: j.cand.note ?? '',
        prosody: j.cand.prosody ?? null,
        character: j.character,
        lineId: j.line.id,
        text: j.line.text,
        synthText: j.line.synthText ?? null,
        emotion: j.line.emotion,
        file: rel,
        duration,
        chars: text.length,
        generatedAt: new Date().toISOString(),
      }
      made++
      console.log(`✓ ${id} (${duration}s)`)
    } catch (e) {
      failed++
      results.clips[id] = { status: 'failed', provider: j.provider, voice: j.cand.voiceName ?? j.cand.voice, character: j.character, lineId: j.line.id, text: j.line.text, error: String(e.message).slice(0, 300) }
      console.log(`✖ ${id}: ${e.message}`)
    }
    writeFileSync(resultsFile, JSON.stringify(results, null, 2))
  }
  results.generatedAt = new Date().toISOString()
  writeFileSync(resultsFile, JSON.stringify(results, null, 2))
  buildAuditionPage(OUT, results)
  console.log(`\nDone: ${made} new, ${failed} failed. Open the page with: npm run audio:audition:serve`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
