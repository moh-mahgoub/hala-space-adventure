/**
 * Pick the best Arabic speech voice the device offers.
 *
 * Reality check (2026): Egyptian voices exist on some platforms
 * (e.g. Edge "Microsoft Salma/Shakir … Arabic (Egypt)", some Android Google voices);
 * iPad/iPhone Safari usually offer "Majed"/"Maged" (Gulf/MSA accent); desktop Chrome
 * on macOS uses the system voices. If nothing Arabic exists we do NOT fall back to an
 * English voice (it would mangle Arabic text) — captions are shown instead.
 */
type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService' | 'default'>

export function scoreVoice(v: VoiceLike): number {
  const lang = (v.lang || '').toLowerCase().replace('_', '-')
  if (!lang.startsWith('ar')) return -1
  let s = 10
  if (lang === 'ar-eg') s += 50
  else if (lang === 'ar-sa' || lang === 'ar-001' || lang === 'ar') s += 20
  const name = v.name.toLowerCase()
  if (/natural|neural|premium|enhanced|siri/.test(name)) s += 15
  if (/salma|shakir|egypt|مصر/.test(name)) s += 10
  if (v.localService) s += 3 // works offline
  return s
}

export function pickArabicVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  let best: T | null = null
  let bestScore = -1
  for (const v of voices) {
    const s = scoreVoice(v)
    if (s > bestScore) {
      best = v
      bestScore = s
    }
  }
  return bestScore >= 0 ? best : null
}
