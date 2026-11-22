/**
 * Interactive story: "{name} ورحلة الكواكب الثمانية"
 *
 * Each chapter is a list of steps. Step types:
 *   say    — the storyteller (or Zizo, with speaker: 'zizo') says a line, then the story moves on
 *   tap    — the child taps the glowing thing in the scene to continue
 *   choice — the child picks one of 2 big picture-buttons (no wrong answers)
 *   count  — the child taps each of the 8 planets to count them
 *
 * All text is Egyptian Arabic; `{name}` = child's name.
 * Line ids for recorded audio: `story.<chapterId>.<stepIndex>` (+ `.reply<N>` for choices,
 * `.done` for tap steps).
 */

import type { BodyId } from '../data/planets'

export type StoryStep =
  /** speaker defaults to the storyteller; 'zizo' = the robot says it in his own voice */
  | { type: 'say'; text: string; speaker?: 'zizo' }
  | { type: 'tap'; text: string; done: string; effect?: 'launch' | 'wave' | 'spin' | 'wind' | 'roll' | 'glow' }
  | {
      type: 'choice'
      text: string
      options: { icon: string; label: string; reply: string }[]
    }
  | { type: 'count'; text: string; done: string }

export interface StoryChapter {
  id: string
  title: string
  /** Main body shown in the scene (none for the bedroom scenes) */
  body?: BodyId
  backdrop: 'room' | 'space'
  steps: StoryStep[]
}

export const STORY_TITLE = '{name} ورحلة الكواكب الثمانية'

export const STORY: StoryChapter[] = [
  {
    id: 'start',
    title: 'البداية',
    backdrop: 'room',
    steps: [
      { type: 'say', text: 'كان ياما كان، كان فيه بنوتة شاطرة اسمها {name}، بتحب تبص على النجوم من الشباك.' },
      { type: 'say', text: 'وفي ليلة جميلة، نزلت سفينة فضاء صغيرة قدام البيت، وخرج منها روبوت لطيف ومضحك اسمه زيزو!' },
      { type: 'say', speaker: 'zizo', text: 'أهلاً يا {name}! تيجي معايا نزور الكواكب التمانية؟' },
      {
        type: 'tap',
        text: 'دوسي على السفينة عشان نركب!',
        done: 'يلا! تلاتة، اتنين، واحد... انطلاق!',
        effect: 'launch',
      },
    ],
  },
  {
    id: 'sun',
    title: 'الشمس',
    body: 'sun',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'أول حاجة شافتها {name} في الفضاء كانت الشمس! كبيرة ومنوّرة قوي.' },
      { type: 'say', speaker: 'zizo', text: 'الشمس دي نجمة، وكل الكواكب بتلف حواليها.' },
      { type: 'say', text: 'والشمس بتدفي الأرض، وبتخلي الزرع يكبر، وبتنورلنا النهار.' },
      {
        type: 'choice',
        text: 'نور الشمس قوي! نعمل إيه عشان نحمي عينينا؟',
        options: [
          { icon: '🕶️', label: 'نضارة فضاء', reply: 'فكرة حلوة! وكمان مبنبصش للشمس أبداً بعينينا.' },
          { icon: '🙈', label: 'نغمض عينينا', reply: 'شطورة! مبنبصش للشمس أبداً، عشان نحافظ على عينينا.' },
        ],
      },
    ],
  },
  {
    id: 'mercury',
    title: 'عطارد',
    body: 'mercury',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'السفينة طارت لأقرب كوكب للشمس: عطارد! صغنن ورمادي، ومليان حفر.' },
      { type: 'say', text: 'وعطارد بيجري حوالين الشمس بسرعة كبيرة، أسرع من كل الكواكب!' },
      {
        type: 'tap',
        text: 'دوسي على عطارد عشان نقوله أهلاً!',
        done: 'عطارد بيقول: أهلاً يا {name}! أنا أصغر كوكب، وأسرع كوكب كمان!',
        effect: 'wave',
      },
    ],
  },
  {
    id: 'venus',
    title: 'الزهرة',
    body: 'venus',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'وبعدين وصلوا للزهرة. الزهرة ملفوفة بسحاب أصفر تقيل.' },
      { type: 'say', speaker: 'zizo', text: 'الزهرة أسخن كوكب، حتى أسخن من عطارد!' },
      {
        type: 'choice',
        text: 'الزهرة سخنة قوي قوي! ننزل عليها، ولا نبص عليها من السفينة؟',
        options: [
          { icon: '🚀', label: 'نبص من السفينة', reply: 'اختيار ذكي! الزهرة أسخن كوكب، فنتفرج عليها من بعيد.' },
          { icon: '🔥', label: 'ننزل عليها', reply: 'لأ يا {name}، الزهرة سخنة قوي! خلينا نتفرج عليها من السفينة أحسن.' },
        ],
      },
    ],
  },
  {
    id: 'earth',
    title: 'الأرض والقمر',
    body: 'earth',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'وبعدين شافت {name} كوكب أزرق جميل... ده كوكب الأرض! بيتنا!' },
      {
        type: 'tap',
        text: 'دوسي على الأرض، ونسلّم على بابا وماما وكل الناس!',
        done: 'سلام يا أرض! فيكي بحر وشجر وحيوانات وكل حبايبنا.',
        effect: 'wave',
      },
      { type: 'say', text: 'وجنب الأرض كان فيه القمر، صاحبها اللي بيلف حواليها كل شهر.' },
    ],
  },
  {
    id: 'mars',
    title: 'المريخ',
    body: 'mars',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'وبعد الأرض، وصلوا للكوكب الأحمر: المريخ!' },
      { type: 'say', text: 'المريخ لونه أحمر، عشان ترابه فيه صدا زي الحديد القديم.' },
      { type: 'say', text: 'وعلى المريخ، كان فيه عربية روبوت صغيرة بتستكشف الصخور.' },
      {
        type: 'tap',
        text: 'دوسي على المريخ، نسلم على العربية الروبوت!',
        done: 'العربية رفعت دراعها وقالت: أهلاً يا {name}! أنا بدرس صخور المريخ.',
        effect: 'wave',
      },
    ],
  },
  {
    id: 'jupiter',
    title: 'المشتري',
    body: 'jupiter',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'واو! قدامهم كوكب ضخم ضخم... ده المشتري، أكبر كوكب في المجموعة الشمسية!' },
      { type: 'say', speaker: 'zizo', text: 'المشتري كبير قوي، ممكن يساع جواه أكتر من ألف أرض!' },
      {
        type: 'tap',
        text: 'شايفة البقعة الحمرا؟ دوسي على المشتري!',
        done: 'البقعة دي عاصفة كبيرة قوي بتلف وتلف، أكبر من الأرض كلها!',
        effect: 'spin',
      },
    ],
  },
  {
    id: 'saturn',
    title: 'زحل',
    body: 'saturn',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'وبعدين شافوا أحلى كوكب بحلقات: زحل!' },
      { type: 'say', text: 'الحلقات دي معمولة من حتت تلج وصخور كتير، بتلف وتلف حوالين زحل.' },
      {
        type: 'choice',
        text: 'نلف بالسفينة حوالين الحلقات من فوق، ولا من تحت؟',
        options: [
          { icon: '⬆️', label: 'من فوق', reply: 'ووووه! من فوق الحلقات شكلها زي طبق كبير بيلمع!' },
          { icon: '⬇️', label: 'من تحت', reply: 'ووووه! من تحت شايفين حتت التلج والصخور بتلمع!' },
        ],
      },
    ],
  },
  {
    id: 'uranus',
    title: 'أورانوس',
    body: 'uranus',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'وبعد زحل، قابلوا أورانوس. كوكب أزرق مخضر، وساقع قوي.' },
      { type: 'say', text: 'وكان أورانوس غريب شوية... كان نايم على جنبه!' },
      {
        type: 'tap',
        text: 'أورانوس نايم على جنبه! دوسي عليه، نشوفه بيتدحرج.',
        done: 'هيييه! أورانوس بيتدحرج زي الكورة وهو بيلف حوالين الشمس!',
        effect: 'roll',
      },
    ],
  },
  {
    id: 'neptune',
    title: 'نبتون',
    body: 'neptune',
    backdrop: 'space',
    steps: [
      { type: 'say', text: 'وأخيراً، وصلوا لأبعد كوكب: نبتون، الكوكب الأزرق الغامق.' },
      { type: 'say', text: 'نبتون بعيد قوي قوي عن الشمس، عشان كده هو ساقع ومضلم.' },
      {
        type: 'tap',
        text: 'دوسي على نبتون، ونسمع صوت الرياح!',
        done: 'ووووش! رياح نبتون أقوى رياح في المجموعة الشمسية!',
        effect: 'wind',
      },
    ],
  },
  {
    id: 'home',
    title: 'الرجوع للبيت',
    backdrop: 'room',
    steps: [
      { type: 'say', text: 'وبعد الرحلة الحلوة دي، رجعت السفينة لبيت {name}.' },
      {
        type: 'count',
        text: 'تعالي نعد الكواكب اللي زرناها! دوسي على كل كوكب.',
        done: 'تمانية! زرنا تمن كواكب، بيلفوا كلهم حوالين الشمس!',
      },
      { type: 'say', speaker: 'zizo', text: 'شكراً يا {name}، كانت أحلى رحلة! نتقابل تاني قريب.' },
      { type: 'say', text: 'ونامت {name} وهي بتحلم بالنجوم والكواكب. تصبحي على خير يا {name}!' },
    ],
  },
]
