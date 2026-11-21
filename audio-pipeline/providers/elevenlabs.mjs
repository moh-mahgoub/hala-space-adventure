// ElevenLabs. Voices come from the shared Voice Library (Egyptian-accent voices),
// added to your account on first use. v3+ models accept inline audio tags such as
// [excited] or [laughs] for expressive delivery.
import { env } from '../lib/env.mjs'

export const id = 'elevenlabs'
export const label = 'ElevenLabs'
export const credentials = ['ELEVENLABS_API_KEY']
export const defaultModel = 'eleven_v3'
const API = 'https://api.elevenlabs.io'

export function available() {
  return !!env('ELEVENLABS_API_KEY')
}

function headers() {
  const key = env('ELEVENLABS_API_KEY')
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set')
  return { 'xi-api-key': key, 'content-type': 'application/json' }
}

/** Search the shared voice library, e.g. { language: 'ar', accent: 'egyptian', gender: 'female' }. */
export async function searchVoices({ language = 'ar', accent = 'egyptian', gender, search, pageSize = 30 } = {}) {
  const q = new URLSearchParams({ page_size: String(pageSize), language })
  if (accent) q.set('accent', accent)
  if (gender) q.set('gender', gender)
  if (search) q.set('search', search)
  const res = await fetch(`${API}/v1/shared-voices?${q}`, { headers: headers() })
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = await res.json()
  return (json.voices ?? []).map((v) => ({
    id: v.voice_id,
    owner: v.public_owner_id,
    name: v.name,
    gender: v.gender,
    age: v.age,
    accent: v.accent,
    language: v.language,
    descriptive: v.descriptive,
    useCase: v.use_case,
    description: (v.description || '').slice(0, 140),
    preview: v.preview_url,
  }))
}

/** Add a shared voice to "My voices" so the TTS endpoint can use it. */
export async function ensureVoice(voice) {
  if (!voice.owner) return voice.id
  const mine = await fetch(`${API}/v2/voices?search=${encodeURIComponent(voice.name)}`, { headers: headers() })
  if (mine.ok) {
    const j = await mine.json()
    const hit = (j.voices ?? []).find((v) => v.voice_id === voice.id || v.sharing?.original_voice_id === voice.id)
    if (hit) return hit.voice_id
  }
  const res = await fetch(`${API}/v1/voices/add/${voice.owner}/${voice.id}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ new_name: voice.name }),
  })
  if (!res.ok) throw new Error(`ElevenLabs add voice ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return (await res.json()).voice_id
}

export async function synthesize({ text, voice, style, model, settings }) {
  const m = model || env('ELEVENLABS_MODEL') || defaultModel
  // v3-style inline tag for emotion, e.g. "[excited]"; ignored by older models
  const tagged = style && m.includes('v3') ? `${style} ${text}` : text
  const res = await fetch(`${API}/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text: tagged,
      model_id: m,
      language_code: 'ar',
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, ...settings },
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return { audio: Buffer.from(await res.arrayBuffer()), model: m }
}
