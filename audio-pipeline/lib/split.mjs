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
 * Choose cut points: the n-1 longest silences, in time order, cut at their middle.
 * Returns null if there aren't enough pauses (caller falls back to one request per line).
 */
export function chooseCuts(silences, n, totalDuration) {
  const inner = silences.filter((s) => s.start > 0.2 && s.end < totalDuration - 0.2)
  if (inner.length < n - 1) return null
  const longest = [...inner].sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, n - 1)
  return longest.map((s) => (s.start + s.end) / 2).sort((a, b) => a - b)
}

function duration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString())
}

/** @returns {Buffer[] | null} n WAV buffers, or null if the take couldn't be split cleanly */
export function splitTake(audio, n) {
  const tmp = path.join(os.tmpdir(), `take-${process.pid}-${Date.now()}`)
  const src = `${tmp}.in`
  const made = [src]
  writeFileSync(src, audio)
  try {
    const total = duration(src)
    // silencedetect reports on stderr
    const det = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', 'silencedetect=noise=-38dB:d=0.6', '-f', 'null', '-'], { encoding: 'utf8' })
    const cuts = chooseCuts(parseSilences(det.stderr || ''), n, total)
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
