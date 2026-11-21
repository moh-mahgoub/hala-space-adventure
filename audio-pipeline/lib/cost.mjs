// Cost ESTIMATES (USD). Prices change: verify on the provider's pricing page
// before any paid run. These numbers only drive the --estimate / --dry-run output.
export const PRICING = {
  azure: {
    note: 'Neural TTS ≈ $15–16 per 1M characters; free tier (F0) 500K characters/month.',
    perMillionChars: 16,
    freeCharsPerMonth: 500_000,
  },
  elevenlabs: {
    note: 'API ≈ $0.08–0.10 per 1K characters (v3/Multilingual). Free plan: non-commercial + attribution; Starter ($6/mo) adds commercial rights.',
    perThousandChars: 0.1,
  },
  gemini: {
    note: 'Flash TTS (preview) ≈ $0.50–1.00 per 1M input tokens and $6–20 per 1M audio-output tokens (~25 tokens per second of audio); free tier available.',
    inputPerMillionTokens: 1,
    outputPerMillionTokens: 20,
    audioTokensPerSecond: 25,
  },
}

/** Rough speaking rate for child-directed Egyptian Arabic narration. */
export const CHARS_PER_SECOND = 12

export function estimate(provider, chars) {
  const p = PRICING[provider]
  if (!p) return null
  let usd = 0
  if (provider === 'azure') usd = chars * (p.perMillionChars / 1e6)
  if (provider === 'elevenlabs') usd = (chars / 1000) * p.perThousandChars
  if (provider === 'gemini') {
    const seconds = chars / CHARS_PER_SECOND
    usd = (chars / 3) * (p.inputPerMillionTokens / 1e6) + seconds * p.audioTokensPerSecond * (p.outputPerMillionTokens / 1e6)
  }
  return { provider, chars, usd: Math.round(usd * 100) / 100, note: p.note }
}
