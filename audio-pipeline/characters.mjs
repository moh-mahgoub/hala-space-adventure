// The two recurring voices. Directions are in English because the TTS models
// follow English stage directions best; the spoken words are always Egyptian Arabic.
export const CHARACTERS = {
  narrator: {
    nameAr: 'الحكّاءة',
    description: 'Warm, friendly Cairene Egyptian woman telling a story to a 4-year-old.',
    direction:
      'Perform the Arabic line below in natural, everyday Cairene Egyptian Arabic (Masri, not Modern Standard Arabic), ' +
      'as a warm, affectionate young Egyptian woman telling a story to a four-year-old girl named Hala (حلا). ' +
      'Smiling, conversational, gentle, with natural pauses — never like a newsreader, never a baby voice.',
  },
  zizo: {
    nameAr: 'زيزو الروبوت',
    description: 'Funny, playful, energetic Egyptian cartoon robot sidekick; slightly higher voice.',
    direction:
      'Perform the Arabic line below in natural Cairene Egyptian Arabic (Masri) as Zizo (زيزو), a funny, lovable cartoon robot ' +
      'who is Hala’s sidekick: bright, playful, energetic, slightly higher-pitched, with comic timing and clear Egyptian ' +
      'pronunciation. Friendly and silly, never scary, never mechanical-sounding.',
  },
}

/** Emotion words → per-provider hints */
export const EMOTION_HINT = {
  warm: { en: 'warm and welcoming', tag: '[warmly]' },
  excited: { en: 'excited and full of wonder', tag: '[excited]' },
  explaining: { en: 'calm, curious, explaining simply', tag: '[gently]' },
  proud: { en: 'proud and encouraging', tag: '[happily]' },
  storytelling: { en: 'soft storytelling, slow and dreamy', tag: '[softly]' },
  playful: { en: 'playful and cheeky', tag: '[playfully]' },
  surprised: { en: 'amazed and surprised', tag: '[surprised]' },
  silly: { en: 'silly and funny', tag: '[mischievously]' },
  celebrating: { en: 'celebrating, very happy', tag: '[excited]' },
  laughing: { en: 'amused, light laugh', tag: '[laughs]' },
}
