// APPROVED VOICES (Stage A decision). Changing anything here changes every clip's
// hash, so the next `npm run audio:generate` regenerates the affected clips.
export const VOICES = {
  narrator: {
    provider: 'gemini',
    model: 'gemini-3.1-flash-tts-preview',
    voice: 'Sulafat',
    fx: 'none',
  },
  zizo: {
    provider: 'gemini',
    model: 'gemini-3.1-flash-tts-preview',
    voice: 'Puck',
    fx: 'zizo-light',
  },
}
