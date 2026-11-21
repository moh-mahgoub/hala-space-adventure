// Audition scripts: identical text for every provider/voice so comparisons are fair.
// `text` is the canonical display text. `synthText` (optional) is a pronunciation-
// only variant used for synthesis — it never changes what the child sees.
export const AUDITION_LINES = [
  // ── narrator ──
  { id: 'n1-welcome', speaker: 'narrator', emotion: 'warm', text: 'أهلاً يا حلا! جاهزة نركب سفينتنا ونطلع رحلة جميلة للفضاء؟' },
  { id: 'n2-saturn', speaker: 'narrator', emotion: 'excited', text: 'ياااه! بصّي يا حلا، ده كوكب زحل! شايفة الحلقات الجميلة اللي حواليه؟' },
  { id: 'n3-sun', speaker: 'narrator', emotion: 'explaining', text: 'الشمس يا حلا نجمة كبيرة بتنورلنا الدنيا، والأرض بتلف حواليها!' },
  { id: 'n4-bravo', speaker: 'narrator', emotion: 'proud', text: 'برافو عليكي يا حلا! إنتي عرفتي الكوكب الصح! شطورة جداً!' },
  { id: 'n5-story', speaker: 'narrator', emotion: 'storytelling', text: 'وفي يوم من الأيام، حلا ركبت سفينتها الصغيرة، وطارت بعيد بعيد لحد ما وصلت للقمر.' },
  // ── Zizo ──
  { id: 'z1-intro', speaker: 'zizo', emotion: 'playful', text: 'أهلاً يا كابتن حلا! أنا زيزو الروبوت! اربطي الحزام، إحنا طايرين!' },
  { id: 'z2-jupiter', speaker: 'zizo', emotion: 'surprised', text: 'يا نهار أبيض! ده كوكب المشتري؟! ده كبيييير أوي!' },
  { id: 'z3-rings', speaker: 'zizo', emotion: 'silly', text: 'هو زحل لابس حلقات؟! طب وأنا فين حلقاتي؟!' },
  { id: 'z4-celebrate', speaker: 'zizo', emotion: 'celebrating', text: 'برافووو يا حلا! المهمة نجحت! أنا هرقص من الفرحة!' },
  { id: 'z5-moon', speaker: 'zizo', emotion: 'silly', text: 'يا خبر أبيض! إحنا وصلنا القمر! استنيني يا حلا، أنا نسيت جزمة الفضاء!' },
]

/** A short exchange, played back sequentially, to judge how the two voices sound together. */
export const AUDITION_DIALOGUE = [
  { id: 'd1-narrator', speaker: 'narrator', emotion: 'excited', text: 'بصّي يا حلا! ده كوكب المشتري، أكبر كوكب في المجموعة الشمسية!' },
  { id: 'd2-zizo', speaker: 'zizo', emotion: 'silly', text: 'أكبر كوكب؟! ياااه! ده أنا لو لعبت عليه استغماية مش هعرف ألاقي نفسي!' },
  { id: 'd3-narrator', speaker: 'narrator', emotion: 'laughing', text: 'هههه! يلا نكتشفه مع بعض!', synthText: 'ههه! يلا نكتشفه مع بعض!' },
]

export const ALL_AUDITION_LINES = [...AUDITION_LINES, ...AUDITION_DIALOGUE]

/**
 * Candidate voices per provider and character. Kept small on purpose: the goal is a
 * fair head-to-head, not a catalogue. Edit freely and re-run (only missing clips are made).
 */
export const CANDIDATES = {
  gemini: {
    narrator: [
      { voice: 'Sulafat', note: 'Google: “Warm”' },
      { voice: 'Achernar', note: 'Google: “Soft”' },
      { voice: 'Leda', note: 'Google: “Youthful”' },
    ],
    zizo: [
      { voice: 'Puck', note: 'Google: “Upbeat”' },
      { voice: 'Fenrir', note: 'Google: “Excitable”' },
      { voice: 'Puck', fx: 'zizo-light', note: 'Puck + light robot shimmer' },
    ],
  },
  elevenlabs: {
    // resolved from the shared Voice Library at run time (Egyptian accent)
    narrator: [{ search: { gender: 'female', accent: 'egyptian' }, pick: 3, prefer: ['Hoda', 'Yasmine', 'Fatima'] }],
    zizo: [
      { search: { gender: 'male', accent: 'egyptian' }, pick: 2, prefer: [] },
      { search: { gender: 'male', accent: 'egyptian' }, pick: 1, fx: 'zizo-light', prefer: [] },
    ],
  },
  azure: {
    narrator: [
      { voice: 'ar-EG-SalmaNeural', prosody: { rate: '-6%', pitch: '+2%' }, note: 'Egyptian female (dedicated ar-EG voice)' },
    ],
    zizo: [
      { voice: 'ar-EG-ShakirNeural', prosody: { rate: '+4%', pitch: '+15%' }, note: 'Egyptian male, raised pitch' },
      { voice: 'ar-EG-ShakirNeural', prosody: { rate: '+4%', pitch: '+15%' }, fx: 'zizo-light', note: 'same + light robot shimmer' },
    ],
  },
}
