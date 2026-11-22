#!/usr/bin/env node
/**
 * Generate the narration LIBRARY with the approved voices (DEVELOPMENT TIME ONLY).
 *
 *   npm run audio:generate -- --dry-run            # what would be made + cost estimate
 *   npm run audio:generate                         # make every missing/changed clip
 *   npm run audio:generate -- --only planets.saturn.intro,zizo.planets.saturn --force
 *   npm run audio:generate -- --budget 5           # hard stop (USD, from reported usage)
 *
 * Writes public/audio/ar-EG/<speaker>/<category>/<id>.mp3 and records each clip's
 * duration in src/audio/manifest.json. A clip is regenerated only when its text,
 * emotion or voice changed (content hash) — or with --only/--force.
 */
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finishClip, hasFfmpeg } from './lib/audio.mjs'
import { estimate, PRICING } from './lib/cost.mjs'
import { loadEnv } from './lib/env.mjs'
import { plausibleDuration, splitTake } from './lib/split.mjs'
import { PROVIDERS, batchDirectionFor, directionFor, suspiciousDuration, withRetries } from './audition.mjs'
import { buildManifest, MANIFEST } from './build-manifest.mjs'
import { VOICES } from './voices.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MAX_BATCH_LINES = 8
const MAX_BATCH_CHARS = 520

function parseArgs(argv) {
  const a = { dryRun: false, force: false, only: null, budget: 5, limit: Infinity, speaker: null, single: false, repair: false }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--dry-run') a.dryRun = true
    else if (k === '--force') a.force = true
    else if (k === '--only') a.only = new Set(argv[++i].split(','))
    else if (k === '--budget') a.budget = Number(argv[++i])
    else if (k === '--limit') a.limit = Number(argv[++i])
    else if (k === '--speaker') a.speaker = argv[++i]
    else if (k === '--single') a.single = true // one request per line (no batching)
    else if (k === '--repair') a.repair = true // re-record implausible clips and their take-neighbours
  }
  return a
}

/** Duration (s) of a WAV buffer, from its header. */
function probeWav(buf) {
  const byteRate = buf.readUInt32LE(28)
  const dataIdx = buf.indexOf('data')
  const dataLen = dataIdx > 0 ? buf.readUInt32LE(dataIdx + 4) : buf.length - 44
  return byteRate ? dataLen / byteRate : null
}

/** USD for one Gemini response, from its reported token usage. */
export function usageCost(usage) {
  if (!usage) return 0
  const p = PRICING.gemini
  return ((usage.promptTokenCount ?? 0) * p.inputPerMillionTokens + (usage.candidatesTokenCount ?? 0) * p.outputPerMillionTokens) / 1e6
}

/** Group clips into takes: same speaker, consecutive ids, bounded size. */
export function makeBatches(entries) {
  const batches = []
  let cur = []
  let chars = 0
  for (const e of entries) {
    const fits = cur.length < MAX_BATCH_LINES && chars + e.text.length <= MAX_BATCH_CHARS && (!cur.length || cur[0].speaker === e.speaker)
    if (!fits && cur.length) {
      batches.push(cur)
      cur = []
      chars = 0
    }
    cur.push(e)
    chars += e.text.length
  }
  if (cur.length) batches.push(cur)
  return batches
}

async function main() {
  loadEnv(ROOT)
  const args = parseArgs(process.argv.slice(2))
  const manifest = buildManifest()
  if (args.repair) {
    // a bad cut damages BOTH sides of it: redo each implausible clip and its neighbours (same speaker)
    const bad = new Set()
    manifest.forEach((e, i) => {
      if (!e.duration || plausibleDuration(e.duration, e.text.length)) return
      for (const j of [i - 1, i, i + 1]) if (manifest[j]?.speaker === e.speaker) bad.add(manifest[j].id)
    })
    args.only = bad
    args.single = true
    console.log(`Repair: ${bad.size} clips (implausible + neighbours)`)
  }
  const todo = manifest
    .filter((e) => !args.speaker || e.speaker === args.speaker)
    .filter((e) => (args.only ? args.only.has(e.id) : args.force || !e.duration || !existsSync(path.join(ROOT, 'public', e.file))))
    .slice(0, args.limit)
  // narrator first, then Zizo; keep related lines together
  todo.sort((a, b) => (a.speaker === b.speaker ? 0 : a.speaker === 'narrator' ? -1 : 1))

  const chars = todo.reduce((s, e) => s + e.text.length, 0)
  console.log(`Library: ${manifest.length} clips; to generate now: ${todo.length} (${chars} characters, est. ≈ $${estimate('gemini', chars).usd} list price, budget $${args.budget})`)
  if (args.dryRun || !todo.length) {
    if (!args.dryRun) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
    return
  }
  if (!hasFfmpeg()) throw new Error('ffmpeg is required (macOS: brew install ffmpeg)')

  const byId = Object.fromEntries(manifest.map((e) => [e.id, e]))
  const save = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  let spent = 0
  let made = 0
  let failed = 0
  let lastCall = 0
  const paced = async (mod, fn) => {
    const gap = (mod.minIntervalMs ?? 0) - (Date.now() - lastCall)
    if (gap > 0) await new Promise((r) => setTimeout(r, gap))
    lastCall = Date.now()
    return fn()
  }

  for (const batch of makeBatches(todo)) {
    if (spent >= args.budget) {
      console.log(`■ Budget of $${args.budget} reached (spent ≈ $${spent.toFixed(3)}). Stopping; re-run to continue.`)
      break
    }
    const v = VOICES[batch[0].speaker]
    const mod = PROVIDERS[v.provider]
    // the voice gets the pronunciation spelling when there is one; captions keep the canonical text
    const lines = batch.map((e) => ({ id: e.id, speaker: e.speaker, emotion: e.emotion, text: e.synthText ?? e.text }))
    const raw = new Map()
    if (batch.length > 1 && mod.batchTakes && !args.single) {
      try {
        const r = await withRetries(
          () => paced(mod, () => mod.synthesize({ text: mod.batchText(lines.map((l) => l.text)), voice: v.voice, model: v.model, style: batchDirectionFor(v.provider, lines) })),
          `take ${batch[0].id}…`,
        )
        spent += usageCost(r.usage)
        const parts = splitTake(r.audio, lines.length, lines.map((l) => l.text.length))
        if (parts) {
          // every piece must be believable for its text; one bad cut spoils its neighbours too
          const durations = parts.map((p) => probeWav(p))
          if (durations.every((d, i) => plausibleDuration(d, lines[i].text.length))) lines.forEach((l, i) => raw.set(l.id, parts[i]))
          else console.log(`  ! take ${batch[0].id}…: a cut looks wrong → one request per line`)
        } else console.log(`  ! take ${batch[0].id}…: pauses unclear → one request per line`)
      } catch (e) {
        console.log(`  ! take ${batch[0].id}… failed: ${String(e.message).slice(0, 140)}`)
        if (/per day/i.test(e.message)) break
      }
    }
    for (const l of lines) {
      const entry = byId[l.id]
      const out = path.join(ROOT, 'public', entry.file)
      try {
        let audio = raw.get(l.id)
        const checkAndFinish = (buf) => {
          const { duration } = finishClip(buf, out, { fx: v.fx })
          if (suspiciousDuration(duration, l.text.length) || !plausibleDuration(duration, l.text.length))
            throw new Error(`suspicious length ${duration}s for ${l.text.length} chars`)
          return duration
        }
        let duration
        try {
          if (!audio) throw new Error('no batch audio')
          duration = checkAndFinish(audio)
        } catch {
          // single-line retake (also catches a bad cut from the batch)
          duration = await withRetries(async () => {
            const r = await paced(mod, () => mod.synthesize({ text: l.text, voice: v.voice, model: v.model, style: directionFor(v.provider, l) }))
            spent += usageCost(r.usage)
            return checkAndFinish(r.audio)
          }, l.id)
        }
        entry.duration = duration
        entry.take = (entry.take ?? 0) + 1
        made++
        console.log(`✓ ${l.id} (${duration}s)`)
      } catch (e) {
        failed++
        delete entry.duration
        console.log(`✖ ${l.id}: ${String(e.message).slice(0, 160)}`)
      }
    }
    save()
  }
  save()
  const missing = manifest.filter((e) => !e.duration).length
  console.log(`\nDone: ${made} made, ${failed} failed, ≈ $${spent.toFixed(3)} spent (from reported usage). Clips still missing: ${missing}.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
