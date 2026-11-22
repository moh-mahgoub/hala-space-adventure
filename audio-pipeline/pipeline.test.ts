import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { audioFile, classify, needsRestructure } from '../src/audio/manifest'
// @ts-expect-error plain JS modules
import { buildSsml } from './providers/azure.mjs'
// @ts-expect-error plain JS modules
import { buildPrompt } from './providers/gemini.mjs'
// @ts-expect-error plain JS modules
import { pcmToWav, FX } from './lib/audio.mjs'
// @ts-expect-error plain JS modules
import { estimate } from './lib/cost.mjs'
// @ts-expect-error plain JS modules
import { chooseCuts, parseSilences, splitTake } from './lib/split.mjs'
import { execFileSync, spawnSync } from 'node:child_process'
// @ts-expect-error plain JS modules
import { AUDITION_LINES, AUDITION_DIALOGUE, CANDIDATES } from './auditions.mjs'
// @ts-expect-error plain JS modules
import { clipKey, directionFor, slug, suspiciousDuration } from './audition.mjs'

describe('audio manifest helpers', () => {
  it('builds stable file paths per speaker and category', () => {
    expect(audioFile('narrator', 'planets', 'planets.saturn.intro')).toBe('audio/ar-EG/narrator/planets/planets.saturn.intro.mp3')
    expect(audioFile('zizo', 'reactions', 'reactions.saturn')).toBe('audio/ar-EG/zizo/reactions/reactions.saturn.mp3')
    expect(() => audioFile('zizo', 'jokes', '../evil')).toThrow()
  })

  it('assigns speakers: reactions → Zizo, everything else → narrator (by default)', () => {
    expect(classify('reactions.correct')).toEqual({ speaker: 'zizo', category: 'reactions' })
    expect(classify('planets.earth.intro')).toEqual({ speaker: 'narrator', category: 'planets' })
    expect(classify('story.sun.0').category).toBe('stories')
    expect(classify('start.welcome').category).toBe('welcome')
  })

  it('flags lines that cannot be prerecorded as one clip', () => {
    expect(needsRestructure('أهلاً يا {name}')).toBe(false)
    expect(needsRestructure('فين كوكب {planet}؟')).toBe(true)
  })
})

describe('providers', () => {
  it('Azure SSML uses the Egyptian locale, the voice, prosody, and escapes text', () => {
    const ssml = buildSsml('أهلاً <يا> حلا & زيزو', 'ar-EG-SalmaNeural', { rate: '-6%', pitch: '+2%' })
    expect(ssml).toContain('xml:lang="ar-EG"')
    expect(ssml).toContain('<voice name="ar-EG-SalmaNeural">')
    expect(ssml).toContain('rate="-6%"')
    expect(ssml).toContain('&lt;يا&gt; حلا &amp; زيزو')
  })

  it('Gemini prompt separates the English direction from the Arabic transcript', () => {
    const p = buildPrompt('أهلاً يا حلا', 'Warmly.')
    expect(p.startsWith('Warmly.')).toBe(true)
    expect(p).toMatch(/TRANSCRIPT:\nأهلاً يا حلا$/)
    expect(p).toMatch(/do not read these directions aloud/)
    expect(buildPrompt('أهلاً', null)).toBe('أهلاً')
  })

  it('flags takes that are far too long for their text', () => {
    expect(suspiciousDuration(5, 60)).toBe(false) // ~5 s expected
    expect(suspiciousDuration(25, 40)).toBe(true) // the model rambled / read the direction
    expect(suspiciousDuration(null, 40)).toBe(false)
  })

  it('wraps raw PCM in a valid WAV header', () => {
    const wav = pcmToWav(Buffer.alloc(480), 24000)
    expect(wav.subarray(0, 4).toString()).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(24000)
    expect(wav.length).toBe(44 + 480)
  })

  it('Zizo effect is subtle (small pitch change only)', () => {
    const fx = FX['zizo-light'].join(',')
    const rate = Number(fx.match(/asetrate=44100\*([\d.]+)/)![1])
    expect(rate).toBeGreaterThan(1)
    expect(rate).toBeLessThanOrEqual(1.08)
  })

  it('estimates costs that grow with text length', () => {
    for (const p of ['azure', 'elevenlabs', 'gemini']) {
      expect(estimate(p, 20000).usd).toBeGreaterThan(estimate(p, 1000).usd)
    }
  })
})

describe('splitting one take into clips', () => {
  it('parses ffmpeg silencedetect output and cuts at the longest pauses', () => {
    const log = 'silence_start: 0.1\nsilence_end: 0.3 | silence_duration: 0.2\n' +
      'silence_start: 2.0\nsilence_end: 4.0 | silence_duration: 2\n' +
      'silence_start: 5.0\nsilence_end: 5.7 | silence_duration: 0.7\n' +
      'silence_start: 7.0\nsilence_end: 9.0 | silence_duration: 2\n'
    const s = parseSilences(log)
    expect(s).toHaveLength(4)
    expect(chooseCuts(s, 3, 12)).toEqual([3, 8]) // the two 2-second pauses, not the short breath
    expect(chooseCuts(s, 6, 12)).toBeNull() // not enough pauses → caller falls back
  })

  const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0
  it.skipIf(!hasFfmpeg)('splits a real 3-line take into 3 clips', () => {
    const wav = execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i',
      'sine=f=300:d=1.2,apad=pad_dur=2[a];sine=f=500:d=0.8,apad=pad_dur=2[b];sine=f=700:d=1.5[c];[a][b][c]concat=n=3:v=0:a=1',
      '-f', 'wav', '-'], { maxBuffer: 1e8 })
    const parts = splitTake(wav, 3)
    expect(parts).not.toBeNull()
    expect(parts).toHaveLength(3)
  })
})

describe('auditions', () => {
  const narrator = AUDITION_LINES.filter((l: { speaker: string }) => l.speaker === 'narrator')
  const zizo = AUDITION_LINES.filter((l: { speaker: string }) => l.speaker === 'zizo')

  it('has at least five scripts per character, plus a two-voice exchange', () => {
    expect(narrator.length).toBeGreaterThanOrEqual(5)
    expect(zizo.length).toBeGreaterThanOrEqual(5)
    expect(new Set(AUDITION_DIALOGUE.map((l: { speaker: string }) => l.speaker))).toEqual(new Set(['narrator', 'zizo']))
  })

  it('always spells the child’s name حلا', () => {
    for (const l of [...AUDITION_LINES, ...AUDITION_DIALOGUE]) {
      expect(l.text).not.toContain('هالة')
      if (l.synthText) expect(l.synthText).not.toContain('هالة')
    }
    expect(AUDITION_LINES.filter((l: { text: string }) => l.text.includes('حلا')).length).toBeGreaterThanOrEqual(8)
  })

  it('every provider has candidates for both characters', () => {
    for (const p of ['gemini', 'elevenlabs', 'azure']) {
      expect(CANDIDATES[p].narrator.length).toBeGreaterThan(0)
      expect(CANDIDATES[p].zizo.length).toBeGreaterThan(0)
    }
  })

  it('directions/keys are provider-specific and safe for file names', () => {
    const line = AUDITION_LINES[0]
    expect(directionFor('gemini', line)).toMatch(/Egyptian/)
    expect(directionFor('elevenlabs', line)).toMatch(/^\[/)
    expect(directionFor('azure', line)).toBeNull()
    expect(clipKey('azure', { voice: 'ar-EG-ShakirNeural', fx: 'zizo-light' })).toBe('azure-ar-eg-shakirneural-zizo-light')
    expect(slug('Hoda — Egyptian')).toBe('hoda-egyptian')
  })
})

describe('security', () => {
  const repo = path.resolve(__dirname, '..')
  const walk = (d: string, out: string[] = []) => {
    for (const f of readdirSync(d)) {
      if (['node_modules', '.git', 'dist', 'audition', 'test-results', 'playwright-report'].includes(f)) continue
      const p = path.join(d, f)
      if (statSync(p).isDirectory()) walk(p, out)
      else if (/\.(m?[jt]sx?|json|ya?ml|md|html)$/.test(f)) out.push(p)
    }
    return out
  }
  const files = walk(repo)

  it('no API keys are committed', () => {
    for (const f of files) {
      const s = readFileSync(f, 'utf8')
      expect(s, f).not.toMatch(/AIza[0-9A-Za-z_-]{30,}/) // Google
      expect(s, f).not.toMatch(/\bsk_[0-9a-f]{40,}\b/) // ElevenLabs
      expect(s, f).not.toMatch(/Ocp-Apim-Subscription-Key['"]?\s*[:=]\s*['"][0-9a-f]{32}/i) // Azure literal
    }
  })

  it('the website never calls a TTS provider at runtime', () => {
    for (const f of files.filter((x) => x.includes(`${path.sep}src${path.sep}`))) {
      const s = readFileSync(f, 'utf8')
      expect(s, f).not.toMatch(/generativelanguage\.googleapis|api\.elevenlabs\.io|tts\.speech\.microsoft/)
    }
  })
})
