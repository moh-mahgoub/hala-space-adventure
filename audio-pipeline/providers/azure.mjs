// Microsoft Azure AI Speech — dedicated Egyptian voices (ar-EG-SalmaNeural,
// ar-EG-ShakirNeural). Delivery is shaped with SSML prosody (rate/pitch).
import { env } from '../lib/env.mjs'

export const id = 'azure'
export const label = 'Microsoft Azure AI Speech'
export const credentials = ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION']
export const defaultModel = 'neural'

export function available() {
  return !!(env('AZURE_SPEECH_KEY') && env('AZURE_SPEECH_REGION'))
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildSsml(text, voice, prosody = {}) {
  const attrs = Object.entries(prosody)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
  const inner = attrs ? `<prosody ${attrs}>${esc(text)}</prosody>` : esc(text)
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-EG"><voice name="${voice}">${inner}</voice></speak>`
}

export async function synthesize({ text, voice, prosody }) {
  const key = env('AZURE_SPEECH_KEY')
  const region = env('AZURE_SPEECH_REGION')
  if (!key || !region) throw new Error('AZURE_SPEECH_KEY and AZURE_SPEECH_REGION must be set')
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'hala-space-audio-pipeline',
    },
    body: buildSsml(text, voice, prosody),
  })
  if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 400)}`)
  return { audio: Buffer.from(await res.arrayBuffer()), model: 'neural' }
}
