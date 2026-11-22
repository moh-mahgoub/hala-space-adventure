// Split one multi-line TTS take into N clips at its N-1 longest pauses.
// Used to stay inside tight free-tier request quotas (one request per voice).
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Parse ffmpeg silencedetect output into [{start, end}] (seconds). */
export function parseSilences(stderr) {
  const out = []
  let start = null
  for (const line of stderr.split('\n')) {
    const s = line.match(/silence_start: ([\d.]+)/)
    const e = line.match(/silence_end: ([\d.]+)/)
    if (s) start = Number(s[1])
    if (e && start != null) {
      out.push({ start, end: Number(e[1]) })
      start = null
    }
  }
  return out
}

/**
 * Choose cut points between lines. With `weights` (each line's length), each cut
 * goes to the pause nearest where that line should end — long pauses preferred —
 * so a pause INSIDE a sentence isn't mistaken for the gap between lines.
 * Without weights: the n-1 longest pauses. Returns null if it can't place n-1 cuts.
 */
export function chooseCuts(silences, n, totalDuration, weights = null) {
  const inner = silences.filter((s) => s.start > 0.2 && s.end < totalDuration - 0.2)
  if (inner.length < n - 1) return null
  if (!weights || weights.length !== n) {
    const longest = [...inner].sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, n - 1)
    return longest.map((s) => (s.start + s.end) / 2).sort((a, b) => a - b)
  }
  const total = weights.reduce((a, b) => a + b, 0)
  const cuts = []
  let acc = 0
  let after = 0
  for (let k = 0; k < n - 1; k++) {
    acc += weights[k]
    const target = (acc / total) * totalDuration
    const remainingAfter = n - 2 - k // cuts still needed after this one
    const options = inner.filter((s) => (s.start + s.end) / 2 > after)
    // leave enough pauses for the remaining cuts
    const usable = options.slice(0, Math.max(0, options.length - remainingAfter))
    if (!usable.length) return null
    let best = null
    let bestScore = Infinity
    for (const s of usable) {
      const mid = (s.start + s.end) / 2
      const score = Math.abs(mid - target) - 1.5 * (s.end - s.start) // distance, minus a bonus for longer gaps
      if (score < bestScore) {
        bestScore = score
        best = mid
      }
    }
    cuts.push(best)
    after = best
  }
  return cuts
}

/** Is `duration` believable for `chars` characters of child-directed Egyptian Arabic? */
export function plausibleDuration(duration, chars) {
  if (duration == null) return false
  if (chars <= 12) return duration >= 0.35 && duration <= 3.2 // numbers, names, «دي الأرض.»
  const cps = chars / duration
  return cps >= 4.5 && cps <= 17
}

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString())
}

/** @returns {Buffer[] | null} n WAV buffers, or null if the take couldn't be split cleanly */
export function splitTake(audio, n, weights = null) {
  const tmp = path.join(os.tmpdir(), `take-${process.pid}-${Date.now()}`)
  const src = `${tmp}.in`
  const made = [src]
  writeFileSync(src, audio)
  try {
    const total = duration(src)
    // silencedetect reports on stderr; try progressively more sensitive settings
    let cuts = null
    for (const [noise, d] of [['-38dB', 0.6], ['-38dB', 0.4], ['-34dB', 0.35], ['-30dB', 0.3]]) {
      const det = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', `silencedetect=noise=${noise}:d=${d}`, '-f', 'null', '-'], { encoding: 'utf8' })
      cuts = chooseCuts(parseSilences(det.stderr || ''), n, total, weights)
      if (cuts) break
    }
    if (!cuts) return null
    const bounds = [0, ...cuts, total]
    const parts = []
    for (let i = 0; i < n; i++) {
      const out = `${tmp}-${i}.wav`
      made.push(out)
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ss', String(bounds[i]), '-to', String(bounds[i + 1]), '-ac', '1', out])
      parts.push(readFileSync(out))
    }
    return parts
  } finally {
    for (const f of made) {
      try {
        unlinkSync(f)
      } catch {
        /* already gone */
      }
    }
  }
}
