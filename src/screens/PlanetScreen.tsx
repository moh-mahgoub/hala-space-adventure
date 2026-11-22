import { useEffect, useRef, useState } from 'react'
import { line, narrator, say, sfx } from '../audio'
import { ACTIVITIES } from '../activities'
import { CheckIcon, NextIcon, BackIcon } from '../components/Icons'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { script } from '../content/script'
import { ui } from '../content/ui'
import { BODIES, neighbours, type BodyId } from '../data/planets'
import { navigate } from '../router'
import { markVisited, useProgress } from '../state/progress'
import { earn } from '../state/rewards'
import { useSettings } from '../state/settings'
import { react } from '../profile/reactions'

/** Zizo's planet joke is a first-visit treat (per session), so it stays funny. */
const zizoJoked = new Set<string>()
let celebrateIdx = 0

function KindBadge({ id }: { id: BodyId }) {
  const b = BODIES[id]
  const text =
    b.kind === 'star'
      ? 'نجمة'
      : b.kind === 'moon'
        ? 'قمر الأرض'
        : b.kind === 'dwarf'
          ? 'كوكب قزم'
          : `كوكب رقم ${(b.order ?? 0).toLocaleString('ar-EG')}`
  const icon = b.kind === 'star' ? '⭐' : b.kind === 'moon' ? '🌙' : b.kind === 'dwarf' ? '✨' : '🪐'
  return (
    <span
      data-testid="kind-badge"
      className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-lg font-bold"
    >
      <span aria-hidden>{icon}</span>
      {text}
    </span>
  )
}

function NavButton({ id, dir, pulse, tour }: { id?: BodyId; dir: 'prev' | 'next'; pulse?: boolean; tour: boolean }) {
  if (!id) return <span className="w-28" />
  return (
    <button
      type="button"
      data-testid={`nav-${dir}`}
      aria-label={`${dir === 'next' ? ui.next : ui.prev}: ${BODIES[id].nameAr}`}
      onClick={() => {
        sfx('whoosh')
        navigate({ name: 'planet', id, tour }, { replace: true })
      }}
      className={`btn-pop glass relative flex h-16 items-center gap-2 rounded-full px-3 ${pulse ? 'ring-4 ring-yellow-300' : ''}`}
    >
      {pulse && <span className="anim-pulse-glow absolute inset-[-6px] rounded-full border-4 border-yellow-300" aria-hidden />}
      {dir === 'prev' && <BackIcon className="text-3xl" />}
      <PlanetArt id={id} size={40} />
      <span className="hidden text-xl font-bold sm:inline">{BODIES[id].nameAr}</span>
      {dir === 'next' && <NextIcon className="text-3xl" />}
    </button>
  )
}

export function PlanetScreen({ id, tour }: { id: BodyId; tour: boolean }) {
  const body = BODIES[id]
  const content = script.planets[id]
  const Activity = ACTIVITIES[id]
  const { prev, next } = neighbours(id)
  const progress = useProgress()
  const { mode } = useSettings()
  const [heard, setHeard] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const activityDoneBefore = progress.stars.includes(`activity:${id}`)

  /** Storyteller introduces the planet; on the first visit Zizo chips in with a joke. */
  const intro = (withZizo = false) => {
    const lines = [line(`planets.${id}.intro`)]
    if (withZizo) lines.push(line(`zizo.planets.${id}`))
    lines.push(line(`planets.${id}.activity.prompt`))
    if (tour && id === 'sun') lines.unshift(line('space.tour'))
    return narrator.say(lines)
  }

  useEffect(() => {
    markVisited(id)
    const firstTime = !zizoJoked.has(id)
    zizoJoked.add(id)
    void intro(firstTime)
    // likely next: the facts and the mission's ending
    narrator.preload([...content.facts.map((_, i) => line(`planets.${id}.facts.${i}`)), line(`planets.${id}.activity.done`)])
    return () => narrator.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onDone = () => {
    setDone(true)
    earn(`activity:${id}`)
    sfx('success')
    const doneLine = line(`planets.${id}.activity.done`)
    react('mission', { line: doneLine })
    // storyteller celebrates, then Zizo cheers (rotating lines)
    const lines = [doneLine, line(`zizo.celebrate.${celebrateIdx++ % script.zizo.celebrate.length}`)]
    if (tour) lines.push(next ? line('space.tourNext') : react('journey'))
    void narrator.say(lines)
  }

  const goNextBySwipe = (dx: number) => {
    // RTL: "next" lives on the left, so dragging content to the right reveals it
    const target = dx > 0 ? next : prev
    if (target) {
      sfx('whoosh')
      navigate({ name: 'planet', id: target, tour }, { replace: true })
    }
  }

  return (
    <div className="screen" data-testid={`planet-screen-${id}`}>
      <TopBar
        back={{ name: 'space' }}
        title={<span data-testid="planet-name">{body.nameAr}</span>}
        onReplay={() => void intro()}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-2 pb-[4.5rem] landscape:flex-row">
        {/* Activity / big planet */}
        <section
          aria-label={`نشاط ${body.nameAr}`}
          className="relative min-h-0 flex-[3] overflow-hidden rounded-[2rem]"
          key={round}
        >
          <Activity onDone={onDone} />
          {done && (
            <div className="anim-pop absolute top-3 right-3 flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-emerald-400 px-4 py-2 text-xl font-extrabold text-night-900 shadow-lg">
                <CheckIcon /> {ui.activityDone}
              </span>
              <button
                type="button"
                className="btn-pop rounded-full bg-white/15 px-4 py-2 text-xl font-bold"
                onClick={() => {
                  setDone(false)
                  setRound((r) => r + 1)
                  void say(`planets.${id}.activity.prompt`)
                }}
              >
                🔁 {ui.playAgain}
              </button>
            </div>
          )}
        </section>

        {/* Facts panel (also the swipe area) */}
        <aside
          className="flex min-h-0 flex-[2] flex-col gap-2 overflow-y-auto landscape:max-w-md"
          onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const s = swipe.current
            swipe.current = null
            if (!s) return
            const dx = e.clientX - s.x
            const dy = e.clientY - s.y
            if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 1.5) goNextBySwipe(dx)
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge id={id} />
            {activityDoneBefore && (
              <span className="rounded-full bg-yellow-300/20 px-3 py-1 text-lg" aria-label="خلصتي النشاط قبل كده">
                ⭐
              </span>
            )}
          </div>
          <h2 className="sr-only">{ui.facts}</h2>
          <ul className="flex flex-col gap-2" data-testid="facts">
            {content.facts.map((fact, i) => (
              <li key={i}>
                <button
                  type="button"
                  data-testid={`fact-${i}`}
                  onClick={() => {
                    sfx('pop')
                    setHeard((h) => (h.includes(i) ? h : [...h, i]))
                    void say(`planets.${id}.facts.${i}`)
                  }}
                  className={`btn-pop flex w-full items-center gap-3 rounded-3xl border-2 p-3 text-right transition-colors ${
                    heard.includes(i) ? 'border-emerald-300/60 bg-emerald-400/15' : 'border-white/15 bg-white/10'
                  }`}
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl" aria-hidden>
                    {content.factIcons[i]}
                  </span>
                  <span className="text-lg leading-snug font-bold sm:text-xl">{fact}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <NavButton id={prev} dir="prev" tour={tour} />
            <NavButton id={next} dir="next" tour={tour} pulse={(tour || mode === 'guided') && done} />
          </div>
        </aside>
      </div>
    </div>
  )
}
