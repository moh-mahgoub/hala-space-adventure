// Post-processing with ffmpeg: decode anything → trim edge silence → (optional
// light character effect) → loudness-normalise → MP3 (mono). Keeps every clip
// at the same perceived loudness so the two voices sit together nicely.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
}

/** Wrap raw 16-bit little-endian mono PCM (Gemini) in a WAV header. */
export function pcmToWav(pcm, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * channels * 2, 28)
  header.writeUInt16LE(channels * 2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

/**
 * Character effects — deliberately SUBTLE so Egyptian pronunciation survives.
 *  'none'       – clean voice
 *  'zizo-light' – +5% pitch (tempo kept) and a faint metallic shimmer
 */
export const FX = {
  none: [],
  'zizo-light': ['asetrate=44100*1.05', 'aresample=44100', 'atempo=0.952', 'aecho=0.8:0.6:18:0.18'],
}

export const TARGET_LUFS = -18

/** Write `input` (Buffer of any audio format) to an MP3 at `outFile`. */
export function finishClip(input, outFile, { fx = 'none', bitrate = '64k' } = {}) {
  mkdirSync(path.dirname(outFile), { recursive: true })
  if (!hasFfmpeg()) {
    // No ffmpeg: keep the provider's original bytes so nothing is lost.
    writeFileSync(outFile.replace(/\.mp3$/, '.raw'), input)
    throw new Error('ffmpeg not found — install it (macOS: brew install ffmpeg) to finish clips')
  }
  const tmp = path.join(os.tmpdir(), `tts-${process.pid}-${Date.now()}.bin`)
  writeFileSync(tmp, input)
  const filters = [
    'aformat=channel_layouts=mono',
    'aresample=44100',
    // trim leading/trailing silence, keep a natural 120 ms breath at each end
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15',
    'areverse',
    ...(FX[fx] ?? []),
    `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11`,
    'aresample=44100',
  ]
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', filters.join(','), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', bitrate, outFile])
  } finally {
    unlinkSync(tmp)
  }
  return { file: outFile, duration: probeDuration(outFile) }
}

export function probeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).toString()
    return Math.round(Number(out) * 100) / 100
  } catch {
    return null
  }
}
