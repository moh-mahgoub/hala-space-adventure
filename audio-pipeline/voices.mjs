#!/usr/bin/env node
// List candidate voices. ElevenLabs: searches the shared library (needs a key).
//   npm run audio:voices -- --gender female
import { loadEnv } from './lib/env.mjs'
import * as elevenlabs from './providers/elevenlabs.mjs'
import { CANDIDATES } from './auditions.mjs'

loadEnv()
const gi = process.argv.indexOf('--gender')
const gender = gi > -1 ? process.argv[gi + 1] : undefined
console.log('Gemini (prebuilt, configured):', [...CANDIDATES.gemini.narrator, ...CANDIDATES.gemini.zizo].map((c) => c.voice).join(', '))
console.log('Azure (ar-EG): ar-EG-SalmaNeural (female), ar-EG-ShakirNeural (male)')
if (elevenlabs.available()) {
  const list = await elevenlabs.searchVoices({ language: 'ar', accent: 'egyptian', gender })
  console.log(`ElevenLabs Egyptian voices (${list.length}):`)
  for (const v of list) console.log(`  ${v.name} [${v.gender}, ${v.age}] ${v.useCase ?? ''} — ${v.description}  id=${v.id}`)
} else {
  console.log('ElevenLabs: set ELEVENLABS_API_KEY to search the voice library.')
}
