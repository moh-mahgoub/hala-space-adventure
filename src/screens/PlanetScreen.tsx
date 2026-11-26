import { useEffect, useRef, useState } from 'react'
import { line, narrator, say, sfx } from '../audio'
import { ACTIVITIES } from '../activities'
import { CheckIcon, NextIcon, BackIcon } from '../components/Icons'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { PlutoInvite } from '../components/PlutoInvite'
import { Celebration } from '../components/Celebration'
import { MissionBadge } from '../components/character/MissionBadge'
import { script } from '../content/script'
import { ui } from '../content/ui'
import { BODIES, neighbours, type BodyId } from '../data/planets'
import { navigate } from '../router'
import { BADGES, markVisited, useProgress } from '../state/progress'
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
      data-pulse={pulse ? 'yes' : 'no'}
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
  /** Neptune → the secret mission to Pluto */
  const [invite, setInvite] = useState(false)
  /** first time Pluto's heart is found: the Pluto explorer badge */
  const [plutoBadge, setPlutoBadge] = useState(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => void (mounted.current = false)
  }, [])
  const activityDoneBefore = progress.stars.includes(`activity:${id}`)
  /**
   * What gently glows (guided mode / tour): after the activity, the first fact she
   * hasn't heard yet — one at a time — and only once every fact has been heard,
   * the next-planet button. Nothing is ever blocked; the glow only suggests.
   */
  const guiding = tour || mode === 'guided'
  const allFactsHeard = content.facts.every((_, i) => heard.includes(i))
  const suggestedFact = guiding && done ? content.facts.findIndex((_, i) => !heard.includes(i)) : -1

  /** Storyteller introduces the planet; on the first visit Zizo chips in with a joke. */
  const intro = (withZizo = false, withPrompt = true) => {
    const lines = [line(`planets.${id}.intro`)]
    if (withZizo) lines.push(line(`zizo.planets.${id}`))
    // once the activity is finished, don't ask her to do it again («نلعب تاني» restarts it)
    if (withPrompt) lines.push(line(`planets.${id}.activity.prompt`))
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
    const firstTime = earn(`activity:${id}`)
    sfx('success')
    const doneLine = line(`planets.${id}.activity.done`)
    react('mission', { line: doneLine })
    const zizoCheer = line(`zizo.celebrate.${celebrateIdx++ % script.zizo.celebrate.length}`)

    if (id === 'neptune') {
      // the last planet: storyteller invites her onward, Zizo grabs his jacket
      setInvite(true)
      void narrator.say([doneLine, line('planets.neptune.invite'), line('zizo.pluto.jacket')])
      return
    }
    if (id === 'pluto') {
      // Zizo already cheered when she found the heart (see PlutoActivity)
      const lines = [doneLine]
      if (!firstTime) lines.push(zizoCheer)
      if (tour) lines.push(react('journey'))
      // the badge arrives after the Moon comparison — even if a line was skipped
      void narrator.say(lines).then(() => {
        if (firstTime && mounted.current) {
          setPlutoBadge(true)
          void narrator.say(line('map.badgePluto'))
        }
      })
      return
    }
    // storyteller celebrates, then Zizo cheers (rotating lines)
    const lines = [doneLine, zizoCheer]
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
        onReplay={() => void intro(false, !done)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-2 pb-[4.5rem] landscape:flex-row">
        {/* Activity / big planet */}
        <section
          aria-label={`نشاط ${body.nameAr}`}
          className="relative min-h-0 flex-[3] overflow-hidden rounded-[2rem]"
          key={round}
        >
          <Activity onDone={onDone} />
          {invite && <PlutoInvite tour={tour} onClose={() => setInvite(false)} />}
          {done && (
            <div className="anim-pop absolute top-3 right-3 flex items-center gap-2">
              {/* a status label, deliberately NOT shaped like a button: plain text with a small ✓ */}
              <span
                data-testid="activity-done-label"
                className="pointer-events-none flex items-center gap-1.5 text-xl font-extrabold text-emerald-300 text-shadow select-none"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-base text-night-900" aria-hidden>
                  <CheckIcon />
                </span>
                {ui.activityDone}
              </span>
              <button
                type="button"
                className="btn-pop rounded-full bg-white/15 px-4 py-2 text-xl font-bold"
                onClick={() => {
                  setDone(false)
                  setInvite(false)
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
                  data-suggested={suggestedFact === i ? 'yes' : 'no'}
                  onClick={() => {
                    sfx('pop')
                    setHeard((h) => (h.includes(i) ? h : [...h, i]))
                    void say(`planets.${id}.facts.${i}`)
                  }}
                  className={`btn-pop relative flex w-full items-center gap-3 rounded-3xl border-2 p-3 text-right transition-colors ${
                    heard.includes(i) ? 'border-emerald-300/60 bg-emerald-400/15' : 'border-white/15 bg-white/10'
                  }`}
                >
                  {suggestedFact === i && (
                    <span className="anim-pulse-glow pointer-events-none absolute inset-[-5px] rounded-3xl border-4 border-yellow-300" aria-hidden />
                  )}
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
            <NavButton id={next} dir="next" tour={tour} pulse={guiding && done && allFactsHeard} />
          </div>
        </aside>
      </div>
      {plutoBadge && (
        <Celebration title={PLUTO_BADGE.title} icon="✨" onClose={() => setPlutoBadge(false)}>
          <div data-testid="pluto-badge-celebration">
            <MissionBadge icon={PLUTO_BADGE.icon} title={PLUTO_BADGE.title} earned size={130} />
          </div>
        </Celebration>
      )}
    </div>
  )
}

const PLUTO_BADGE = BADGES.find((b) => b.id === 'pluto')!
