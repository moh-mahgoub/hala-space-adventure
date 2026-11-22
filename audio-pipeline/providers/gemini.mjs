// Google Gemini TTS (Gemini API). Style is steered with a natural-language
// direction; output is raw 16-bit PCM (usually 24 kHz mono).
import { env } from '../lib/env.mjs'
import { pcmToWav } from '../lib/audio.mjs'

export const id = 'gemini'
export const label = 'Google Gemini TTS'
export const credentials = ['GEMINI_API_KEY']
export const defaultModel = 'gemini-3.8-flash-tts'

export function available() {
  return !!env('GEMINI_API_KEY')
}

/** English direction + Arabic line, clearly separated so the model performs ONLY the transcript. */
export function buildPrompt(text, style) {
  if (!style) return text
  return `${style}\n\nSpeak only the transcript below — do not read these directions aloud.\n\nTRANSCRIPT:\n${text}`
}

/** Free tier allows only 10 requests/day per model: perform a voice's lines in one take. */
export const batchTakes = true
export function batchText(texts) {
  return texts.join('\n\n')
}

/** Free tier: 3 requests/minute per model → one request every ~21 s. */
export const minIntervalMs = Number(process.env.GEMINI_MIN_INTERVAL_MS || 21000)

export async function synthesize({ text, voice, style, model }) {
  const key = env('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const m = model || env('GEMINI_TTS_MODEL') || defaultModel
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(text, style) }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    // keep Google's own message (it says e.g. "Please retry in 24.9s") ahead of the JSON noise
    let msg = body
    try {
      msg = JSON.parse(body).error?.message ?? body
    } catch {
      /* not JSON */
    }
    throw new Error(`Gemini ${res.status}: ${msg.slice(0, 900)}`)
  }
  const json = await res.json()
  const part = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!part) {
    const reason = json?.candidates?.[0]?.finishReason
    // SAFETY refusals on harmless lines are usually flukes: callers may retry
    throw new Error(`Gemini returned no audio${reason ? ` (${reason})` : ''}: ${JSON.stringify(json).slice(0, 200)}`)
  }
  const mime = part.inlineData.mimeType || ''
  const rate = Number(mime.match(/rate=(\d+)/)?.[1] || 24000)
  const pcm = Buffer.from(part.inlineData.data, 'base64')
  return { audio: mime.includes('wav') ? pcm : pcmToWav(pcm, rate), model: m, usage: json.usageMetadata ?? null }
}
