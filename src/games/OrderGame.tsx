/**
 * رتّبي الكواكب — drag (or tap-then-tap) each planet into its place from the Sun.
 * Forgiving drops (nearest slot within a generous radius), gentle hints, no penalties.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { line, narrator, say, sfx } from '../audio'
import { Celebration } from '../components/Celebration'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { script } from '../content/script'
import { ui } from '../content/ui'
import { BODIES, PLANET_IDS, type PlanetId } from '../data/planets'
import { earn } from '../state/rewards'
import { react } from '../profile/reactions'
import { correctSlotFor, isCorrectSlot, nearestSlot, nextEmptySlot, shuffle } from './logic'

type Level = 'easy' | 'harder'

export function OrderGame() {
  const [level, setLevel] = useState<Level>('easy')
  const [game, setGame] = useState(0)
  const tray = useMemo(() => shuffle(PLANET_IDS), [game])
  const [slots, setSlots] = useState<(PlanetId | null)[]>(() => PLANET_IDS.map(() => null))
  const [selected, setSelected] = useState<PlanetId | null>(null)
  const [misses, setMisses] = useState<Partial<Record<PlanetId, number>>>({})
  const [drag, setDrag] = useState<{ id: PlanetId; x: number; y: number } | null>(null)
  const [hintSlot, setHintSlot] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  const dragStart = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  useEffect(() => {
    void say('games.order.intro')
  }, [game])

  const placed = (id: PlanetId) => slots.includes(id)

  const tryPlace = (id: PlanetId, slot: number) => {
    if (slots[slot]) {
      // occupied — just a gentle nudge
      sfx('gentle')
      return
    }
    if (isCorrectSlot(id, slot)) {
      const next = [...slots]
      next[slot] = id
      setSlots(next)
      setSelected(null)
      setHintSlot(null)
      sfx('success')
      const ordinal = script.common.ordinals[slot]
      const placedLine = line('games.order.placed', { planet: BODIES[id].nameAr, ordinal, planetId: id })
      react('correct', { line: placedLine, allowSurprise: next.every(Boolean) })
      const spoken = narrator.say(placedLine)
      if (next.every(Boolean)) {
        void spoken.then(() => {
          setFinished(true)
          earn('game:order')
          void say('games.order.done')
        })
      }
    } else {
      sfx('gentle')
      const n = (misses[id] ?? 0) + 1
      setMisses({ ...misses, [id]: n })
      const lines = [line('games.order.wrong', { planet: BODIES[id].nameAr, planetId: id })]
      if (n >= 2 || level === 'easy') {
        setHintSlot(correctSlotFor(id))
        lines.push(line('games.order.hint'))
      }
      void narrator.say(lines)
    }
  }

  const centres = () =>
    slotRefs.current.map((el) => {
      const r = el?.getBoundingClientRect()
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: -9999, y: -9999 }
    })

  const onDrop = (id: PlanetId, x: number, y: number) => {
    const first = slotRefs.current.find(Boolean)
    const w = first?.getBoundingClientRect().width ?? 80
    const i = nearestSlot({ x, y }, centres(), Math.max(70, w * 0.9))
    if (i >= 0) tryPlace(id, i)
  }

  const pick = (id: PlanetId) => {
    sfx('pop')
    setSelected(id)
    void narrator.say([{ id: 'common.names', template: '{planet}!', params: { planet: BODIES[id].nameAr, planetId: id } }, line('games.order.pick')])
  }

  const restart = () => {
    setFinished(false)
    setSlots(PLANET_IDS.map(() => null))
    setMisses({})
    setSelected(null)
    setHintSlot(null)
    setGame((g) => g + 1)
  }

  const nextSlot = nextEmptySlot(slots)

  return (
    <div className="screen" data-testid="game-order">
      <TopBar back={{ name: 'games' }} title={script.games.names.order} onReplay={() => void say('games.order.intro')}>
        <div role="radiogroup" aria-label="المستوى" className="glass hidden overflow-hidden rounded-full sm:flex">
          {(['easy', 'harder'] as Level[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              onClick={() => setLevel(l)}
              className={`h-16 px-4 text-lg font-bold ${level === l ? 'bg-violet-500' : ''}`}
            >
              {l === 'easy' ? `😊 ${ui.easy}` : `🚀 ${ui.harder}`}
            </button>
          ))}
        </div>
      </TopBar>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 pb-20">
        {/* Slots, in order from the Sun (Sun on the right in RTL) */}
        <div className="flex items-center gap-2">
          <div className="w-[11vw] max-w-28 min-w-14 shrink-0" aria-label="الشمس" role="img">
            <PlanetArt id="sun" rays />
          </div>
          <ol className="grid flex-1 grid-cols-4 gap-2 landscape:grid-cols-8" aria-label="أماكن الكواكب">
            {PLANET_IDS.map((pid, i) => {
              const filled = slots[i]
              const showGhost = level === 'easy' && !filled
              const highlight = !filled && (hintSlot === i || (level === 'easy' && nextSlot === i))
              return (
                <li key={pid}>
                  <div
                    ref={(el) => void (slotRefs.current[i] = el)}
                    role="button"
                    tabIndex={0}
                    data-testid={`slot-${i}`}
                    data-filled={filled ?? ''}
                    aria-label={filled ? `${BODIES[filled].nameAr} — الكوكب ${script.common.ordinals[i]}` : `المكان ${script.common.ordinals[i]}`}
                    onClick={() => selected && tryPlace(selected, i)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && selected) {
                        e.preventDefault()
                        tryPlace(selected, i)
                      }
                    }}
                    className={`relative flex aspect-square items-center justify-center rounded-full border-4 border-dashed ${
                      filled ? 'border-emerald-300/70 bg-emerald-400/10' : 'border-white/30 bg-white/5'
                    } ${highlight ? 'ring-4 ring-yellow-300' : ''}`}
                  >
                    {highlight && <span className="anim-pulse-glow absolute inset-0 rounded-full border-4 border-yellow-300" aria-hidden />}
                    <span className="absolute -top-1 right-0 rounded-full bg-night-900/80 px-2 text-sm font-bold">
                      {(i + 1).toLocaleString('ar-EG')}
                    </span>
                    {filled ? (
                      <div className="anim-pop w-[80%]">
                        <PlanetArt id={filled} spin />
                      </div>
                    ) : showGhost ? (
                      <div className="w-[70%] opacity-30" style={{ filter: 'invert(1)' }}>
                        <PlanetArt id={pid} silhouette />
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Tray */}
        <div className="glass flex flex-wrap justify-center gap-3 rounded-[2rem] p-3" aria-label="الكواكب اللي هتترتب">
          {tray.map((id) =>
            placed(id) ? (
              <span key={id} className="w-[min(14vw,96px)]" aria-hidden />
            ) : (
              <button
                key={id}
                type="button"
                data-testid={`tray-${id}`}
                aria-label={BODIES[id].nameAr}
                aria-pressed={selected === id}
                className={`btn-pop relative flex w-[min(14vw,96px)] touch-none flex-col items-center rounded-3xl p-1 ${
                  selected === id ? 'bg-yellow-300/25 ring-4 ring-yellow-300' : ''
                } ${drag?.id === id ? 'opacity-30' : ''}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  dragStart.current = { x: e.clientX, y: e.clientY, moved: false }
                }}
                onPointerMove={(e) => {
                  const s = dragStart.current
                  if (!s) return
                  if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 12) s.moved = true
                  if (s.moved) setDrag({ id, x: e.clientX, y: e.clientY })
                }}
                onPointerUp={(e) => {
                  const s = dragStart.current
                  dragStart.current = null
                  setDrag(null)
                  if (s?.moved) onDrop(id, e.clientX, e.clientY)
                  else pick(id)
                }}
                onPointerCancel={() => {
                  dragStart.current = null
                  setDrag(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick(id)
                  }
                }}
              >
                <PlanetArt id={id} />
                <span className="text-sm font-bold sm:text-base">{BODIES[id].nameAr}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {drag && (
        <div
          className="pointer-events-none fixed z-50 w-24 -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden
        >
          <PlanetArt id={drag.id} />
        </div>
      )}
      {finished && (
        <Celebration title="برافو!" icon="🪐" onClose={restart}>
          <p className="text-2xl font-bold">رتبتي الكواكب التمانية!</p>
        </Celebration>
      )}
    </div>
  )
}
