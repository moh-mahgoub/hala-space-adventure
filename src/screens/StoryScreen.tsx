import { useEffect, useRef, useState } from 'react'
import { line, narrator, sfx } from '../audio'
import { Celebration } from '../components/Celebration'
import { HalaAvatar } from '../components/HalaAvatar'
import { AstronautCharacter } from '../components/character/AstronautCharacter'
import { LAUNCH_MS, SpaceshipPilot } from '../components/character/SpaceshipPilot'
import { PlayIcon } from '../components/Icons'
import { Zizo } from '../components/Zizo'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { fill } from '../content/lines'
import { STORY, STORY_TITLE, type StoryChapter, type StoryStep } from '../content/story'
import { ui } from '../content/ui'
import { PLANET_IDS } from '../data/planets'
import { navigate } from '../router'
import { useProgress } from '../state/progress'
import { earn } from '../state/rewards'
import { useSettings } from '../state/settings'

// ── scene pieces ──────────────────────────────────────────────────────────

function Room({ night = true }: { night?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-gradient-to-b from-indigo-900 to-violet-950" aria-hidden>
      {/* window */}
      <div className="absolute top-[10%] right-[8%] h-[45%] w-[34%] overflow-hidden rounded-3xl border-8 border-amber-200/80 bg-gradient-to-b from-night-950 to-night-800">
        <span className="anim-twinkle absolute top-[20%] left-[20%] text-xl">✦</span>
        <span className="anim-twinkle absolute top-[50%] left-[60%] text-lg" style={{ animationDelay: '1s' }}>
          ✦
        </span>
        <span className="anim-twinkle absolute top-[30%] left-[80%] text-sm" style={{ animationDelay: '2s' }}>
          ✦
        </span>
        <div className="absolute top-[12%] right-[14%] w-[28%]">
          <PlanetArt id="moon" />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 bg-amber-200/80" />
      </div>
      {/* bed */}
      <div className="absolute bottom-[8%] left-[6%] h-[22%] w-[38%]">
        <div className="absolute bottom-0 h-[55%] w-full rounded-2xl bg-pink-400/80" />
        <div className="absolute bottom-[45%] left-[4%] h-[30%] w-[30%] rounded-xl bg-white/90" />
        <div className="absolute bottom-0 left-0 h-full w-[8%] rounded-t-xl bg-amber-700/80" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[10%] bg-amber-900/40" />
      {!night && <div className="absolute inset-0 bg-yellow-200/10" />}
    </div>
  )
}

// ── player ────────────────────────────────────────────────────────────────

type Phase = 'talk' | 'wait' | 'reply'

function lineId(chapter: StoryChapter, step: number, sub?: string) {
  return `story.${chapter.id}.${step}${sub ? '.' + sub : ''}`
}

function StoryPlayer({ index }: { index: number }) {
  const chapter = STORY[index]
  const { childName } = useSettings()
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('talk')
  const [effect, setEffect] = useState<string | null>(null)
  const [counted, setCounted] = useState(0)
  const [chapterDone, setChapterDone] = useState(false)
  const [theEnd, setTheEnd] = useState(false)
  const token = useRef(0)
  const current: StoryStep | undefined = chapter.steps[step]

  const advance = () => {
    if (step + 1 < chapter.steps.length) {
      setStep(step + 1)
    } else {
      earn(`story:${chapter.id}`)
      setChapterDone(true)
      if (index + 1 >= STORY.length) {
        setTheEnd(true)
      }
    }
  }

  // run the current step
  useEffect(() => {
    if (!current) return
    const my = ++token.current
    setPhase(current.type === 'say' ? 'talk' : 'wait')
    setEffect(null)
    setCounted(0)
    void narrator.say(line(lineId(chapter, step))).then((completed) => {
      if (my !== token.current) return
      if (current.type === 'say' && completed) window.setTimeout(() => my === token.current && advance(), 500)
    })
    return () => {
      token.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step])

  // At the end of a chapter the story WAITS for her to press the next-chapter
  // button (it used to move on by itself after 1.8 s). No spoken prompt: the
  // chapter already ends on a spoken line, and the pulsing button is the cue.

  const replyThen = (sub: string) => {
    const my = ++token.current
    setPhase('reply')
    void narrator.say(line(lineId(chapter, step, sub))).then(() => {
      if (my === token.current) window.setTimeout(() => my === token.current && advance(), 600)
    })
  }

  /**
   * The rocket: she boards and it shakes on the ground while the storyteller
   * counts down; it lifts off (with its roar) only when «...انطلاق!» has been
   * said, so picture and words stay together at any narration speed (and with
   * captions only). The chapter ends once it has flown away.
   */
  const launch = () => {
    const my = ++token.current
    setPhase('reply')
    setEffect('countdown')
    sfx('tap')
    void narrator.say(line(lineId(chapter, step, 'done'))).then(() => {
      if (my !== token.current) return
      setEffect('launch')
      sfx('launch')
      window.setTimeout(() => my === token.current && advance(), LAUNCH_MS + 200)
    })
  }

  const onTarget = () => {
    if (!current || current.type !== 'tap' || phase !== 'wait') return
    if (current.effect === 'launch') return launch()
    sfx(current.effect === 'wind' ? 'whoosh' : 'success')
    setEffect(current.effect ?? 'glow')
    replyThen('done')
  }

  const onChoice = (i: number) => {
    if (phase !== 'wait') return
    sfx('pop')
    replyThen(`reply${i}`)
  }

  const onCount = (i: number) => {
    if (phase !== 'wait' || i !== counted) return
    sfx('pop')
    const n = counted + 1
    setCounted(n)
    if (n < PLANET_IDS.length) void narrator.say(line(`common.numbers.${n - 1}`))
    else replyThen('done')
  }

  const skip = () => {
    if (phase === 'talk') {
      narrator.stop()
      advance()
    }
  }

  const body = chapter.body
  const waitingTap = current?.type === 'tap' && phase === 'wait'
  const bodyStyle =
    effect === 'roll'
      ? { transition: 'transform 1.6s ease-in-out', transform: 'translateX(-30%) rotate(-360deg)' }
      : effect === 'spin'
        ? { transition: 'transform 2s ease-in-out', transform: 'rotate(360deg) scale(1.05)' }
        : effect === 'wave'
          ? { animation: 'wiggle 0.5s ease-in-out 3' }
          : undefined

  return (
    <div className="screen" data-testid={`story-chapter-${chapter.id}`}>
      <TopBar
        back={{ name: 'story', chapter: null }}
        title={chapter.title}
        onReplay={() => {
          token.current++
          void narrator.say(line(lineId(chapter, step))).then((c) => {
            if (c && current?.type === 'say') advance()
          })
        }}
      />
      {/* chapter dots */}
      <div className="flex justify-center gap-1.5 py-1" aria-label={`الفصل ${index + 1} من ${STORY.length}`}>
        {STORY.map((c, i) => (
          <span key={c.id} className={`h-3 rounded-full ${i === index ? 'w-8 bg-yellow-300' : i < index ? 'w-3 bg-yellow-300/60' : 'w-3 bg-white/25'}`} />
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem]">
        {chapter.backdrop === 'room' && <Room />}

        {/* main body */}
        {body && (
          <div className="absolute inset-0 flex items-center justify-end pe-[8%]">
            <div className="relative aspect-square h-[78%] max-w-[55%]">
              {waitingTap ? (
                <button type="button" data-testid="story-target" aria-label="دوسي هنا" onClick={onTarget} className="relative h-full w-full">
                  <span className="anim-pulse-glow absolute inset-[-4%] rounded-full border-4 border-yellow-300" aria-hidden />
                  <PlanetArt id={body} spin rays={body === 'sun'} />
                </button>
              ) : (
                <div className="h-full w-full" style={bodyStyle}>
                  <PlanetArt id={body} spin rays={body === 'sun'} />
                </div>
              )}
              {body === 'earth' && (
                <div className="absolute -bottom-2 left-[-14%] w-[22%]" aria-hidden>
                  <PlanetArt id="moon" />
                </div>
              )}
              {effect === 'wind' && (
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
                  {[25, 45, 65].map((t, i) => (
                    <span key={i} className="absolute right-0 h-2 w-1/2 rounded-full bg-white/70" style={{ top: `${t}%`, animation: `wind 1.2s ${i * 0.15}s ease-out 2 both` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ship / characters */}
        {chapter.backdrop === 'space' && (
          <div className="anim-float absolute top-[14%] right-[4%] h-[46%]" aria-hidden>
            {/* she flies the ship — except at Saturn, where she floats outside by the rings */}
            <SpaceshipPilot pilot={chapter.id !== 'saturn'} />
            {effect === 'wave' && chapter.id !== 'saturn' && (
              <div className="anim-pop absolute top-[30%] -left-[70%] w-[90%]" data-testid="story-astronaut-wave">
                <AstronautCharacter size="100%" pose="wave" />
              </div>
            )}
          </div>
        )}
        {chapter.id === 'saturn' && (
          <div className="pointer-events-none absolute top-[8%] left-[44%] w-[13%]" aria-hidden data-testid="story-astronaut-float">
            <AstronautCharacter size="100%" pose={phase === 'reply' ? 'cheer' : 'float'} />
          </div>
        )}
        {chapter.backdrop === 'room' && chapter.id === 'start' && (
          <div className="absolute right-[44%] bottom-[8%] h-[52%]">
            {/* a gentle wobble at takeoff, then whoosh */}
            <SpaceshipPilot
              pilot={effect === 'countdown' || effect === 'launch'}
              wobble={effect === 'countdown' || effect === 'launch'}
              launching={effect === 'launch'}
              glow={waitingTap}
              onTap={waitingTap ? onTarget : undefined}
            />
          </div>
        )}
        <div className="absolute right-[4%] bottom-[6%] flex items-end gap-1" aria-hidden>
          {chapter.backdrop === 'room' && effect !== 'launch' && effect !== 'countdown' && (
            <HalaAvatar
              size={86}
              helmet={chapter.id !== 'home'}
              pose={chapter.id === 'home' && (phase === 'reply' || step >= chapter.steps.length - 2) ? 'dance' : 'wave'}
            />
          )}
          <Zizo size={chapter.backdrop === 'room' ? 86 : 70} wave={effect === 'wave'} mood={chapter.id === 'home' && step === chapter.steps.length - 1 ? 'sleepy' : 'happy'} />
        </div>

        {/* counting row */}
        {current?.type === 'count' && (
          <div className="absolute inset-x-0 top-[6%] flex justify-center gap-1 px-2 sm:gap-3" data-testid="count-row">
            {PLANET_IDS.map((id, i) => (
              <button
                key={id}
                type="button"
                data-testid={`count-${id}`}
                aria-label={`${(i + 1).toLocaleString('ar-EG')}`}
                onClick={() => onCount(i)}
                className={`btn-pop relative flex w-[11%] max-w-24 flex-col items-center ${i < counted ? '' : i === counted ? '' : 'opacity-60'}`}
              >
                {i === counted && phase === 'wait' && <span className="anim-pulse-glow absolute inset-[-4px] rounded-full border-4 border-yellow-300" aria-hidden />}
                <PlanetArt id={id} />
                <span className={`text-2xl font-extrabold ${i < counted ? 'text-yellow-200' : 'text-transparent'}`}>
                  {(i + 1).toLocaleString('ar-EG')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* choices */}
        {current?.type === 'choice' && phase === 'wait' && (
          <div className="anim-slide-up absolute inset-x-0 bottom-[30%] flex justify-center gap-4 px-3" data-testid="choices">
            {current.options.map((o, i) => (
              <button
                key={i}
                type="button"
                data-testid={`choice-${i}`}
                onClick={() => onChoice(i)}
                className="btn-pop flex flex-col items-center gap-1 rounded-[2rem] border-4 border-white/30 bg-gradient-to-b from-violet-400 to-violet-700 px-6 py-4 shadow-2xl"
              >
                <span className="text-6xl" aria-hidden>
                  {o.icon}
                </span>
                <span className="text-2xl font-extrabold">{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {phase === 'talk' && !chapterDone && (
          <button
            type="button"
            onClick={skip}
            data-testid="story-next"
            className="btn-pop glass absolute top-3 left-3 flex h-16 items-center gap-2 rounded-full px-5 text-xl font-bold"
          >
            {ui.continue} ←
          </button>
        )}
        {chapterDone && !theEnd && (
          <div className="anim-fade absolute inset-0 flex items-center justify-center bg-night-950/60">
            <button
              type="button"
              onClick={() => navigate({ name: 'story', chapter: index + 1 }, { replace: true })}
              className="btn-pop anim-pop relative rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-8 py-4 text-3xl font-extrabold text-night-900"
              data-testid="next-chapter"
            >
              {/* a gentle pulsing ring (the ring pulses, not the button, so it stays easy to hit) */}
              <span
                aria-hidden
                data-testid="next-chapter-pulse"
                className="anim-pulse-glow pointer-events-none absolute inset-[-8px] rounded-full border-4 border-yellow-200"
              />
              {STORY[index + 1].title} ←
            </button>
          </div>
        )}
      </div>
      <div className="h-16 shrink-0" />
      {theEnd && (
        <Celebration title="النهاية" icon="🌙" onClose={() => navigate({ name: 'story', chapter: null })}>
          <p className="text-2xl font-bold">{fill('تصبحي على خير يا {name}!', childName)}</p>
        </Celebration>
      )}
    </div>
  )
}

// ── menu ──────────────────────────────────────────────────────────────────

function StoryMenu() {
  const { childName } = useSettings()
  const progress = useProgress()
  useEffect(() => {
    void narrator.say(line('home.story'))
  }, [])
  return (
    <div className="screen" data-testid="story-menu">
      <TopBar title={fill(STORY_TITLE, childName)} onReplay={() => void narrator.say(line('home.story'))} />
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto py-3 pb-20">
        <button
          type="button"
          data-testid="story-start"
          onClick={() => navigate({ name: 'story', chapter: 0 })}
          className="btn-pop relative flex items-center gap-3 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-10 py-4 text-3xl font-extrabold text-night-900 shadow-2xl"
        >
          <span className="anim-pulse-glow absolute inset-[-6px] rounded-full border-4 border-yellow-200" aria-hidden />
          <PlayIcon /> يلا نبدأ الحكاية
        </button>
        <h2 className="text-xl font-bold text-white/70">{ui.chapters}</h2>
        <ol className="grid w-full max-w-5xl grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {STORY.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                data-testid={`chapter-${i}`}
                onClick={() => navigate({ name: 'story', chapter: i })}
                className="btn-pop glass relative flex w-full flex-col items-center gap-1 rounded-3xl p-3"
              >
                <div className="flex h-16 w-16 items-center justify-center">
                  {c.body ? <PlanetArt id={c.body} /> : <span className="text-5xl">{c.id === 'start' ? '🚀' : '🛏️'}</span>}
                </div>
                <span className="text-lg font-bold">{c.title}</span>
                <span className="absolute top-1 right-2 text-sm text-white/60">{(i + 1).toLocaleString('ar-EG')}</span>
                {progress.stars.includes(`story:${c.id}`) && (
                  <span className="absolute top-1 left-2" aria-label="خلصتيه">
                    ⭐
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export function StoryScreen({ chapter }: { chapter: number | null }) {
  if (chapter == null || !STORY[chapter]) return <StoryMenu />
  return <StoryPlayer key={chapter} index={chapter} />
}
