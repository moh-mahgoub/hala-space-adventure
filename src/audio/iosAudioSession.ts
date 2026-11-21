/**
 * iPad/iPhone audio fix-ups.
 *
 * By default Safari treats Web Audio as "ambient" sound, which is MUTED when the
 * device is in silent mode (Control Center bell, or the side switch) — even with
 * the volume turned up. For an app whose whole point is sound, we ask for
 * "playback" audio instead:
 *   • iPadOS/iOS 17+: navigator.audioSession.type = 'playback'
 *   • older versions: playing a (silent) <audio> element inside the first tap
 *     switches the page's audio session to playback, which also un-mutes Web Audio.
 */

let silentLoop: HTMLAudioElement | null = null

/** A tiny silent WAV, generated in memory (no file, no network). */
function silentWavUrl(): string {
  const sampleRate = 8000
  const samples = 800 // 0.1 s
  const buf = new ArrayBuffer(44 + samples * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples * 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

export type SessionMode = 'audioSession' | 'silent-audio' | 'none'
let mode: SessionMode = 'none'

/** Call inside a user gesture (the first tap). Safe to call repeatedly. */
export function enablePlaybackAudio(): SessionMode {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (nav.audioSession) {
      nav.audioSession.type = 'playback'
      mode = 'audioSession'
      return mode
    }
  } catch {
    /* fall through */
  }
  try {
    if (!silentLoop && typeof Audio !== 'undefined' && typeof URL.createObjectURL === 'function') {
      silentLoop = new Audio(silentWavUrl())
      silentLoop.loop = true
      silentLoop.volume = 0.01
      silentLoop.setAttribute('playsinline', '')
      const p = silentLoop.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
      mode = 'silent-audio'
    }
  } catch {
    /* not available — sound still works when the device isn't in silent mode */
  }
  return mode
}

export function audioSessionMode(): SessionMode {
  return mode
}
