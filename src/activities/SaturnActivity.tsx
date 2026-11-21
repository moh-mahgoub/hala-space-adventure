import { useMemo, useRef, useState } from 'react'
import { line, narrator, sfx } from '../audio'
import { AstronautCharacter } from '../components/character/AstronautCharacter'
import { react } from '../profile/reactions'
import { surprises } from '../profile/surprises'
import { PlanetArt } from '../components/PlanetArt'
import { Stage, TapHint, type ActivityProps } from './common'
import { useTimeouts } from '../hooks'

/** Stage 1: drag up/down to view the rings from above and below. Stage 2: tap the rings to zoom in. */
export function SaturnActivity({ onDone }: ActivityProps) {
  const [tilt, setTilt] = useState(0.5)
  const [seen, setSeen] = useState({ above: false, below: false })
  const [stage, setStage] = useState<'look' | 'tap' | 'zoom'>('look')
  const [upside, setUpside] = useState(false)
  const later = useTimeouts()
  const drag = useRef<{ y: number; tilt: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const update = (t: number) => {
    const v = Math.max(-1, Math.min(1, t))
    setTilt(v)
    const next = { above: seen.above || v > 0.7, below: seen.below || v < -0.5 }
    if (next.above !== seen.above || next.below !== seen.below) setSeen(next)
    if (stage === 'look' && next.above && next.below) {
      setStage('tap')
      sfx('success')
      void narrator.say([react('saturn'), line('planets.saturn.activity.steps.0')])
    }
  }

  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: 6 + Math.random() * 26,
        ice: Math.random() > 0.35,
        d: 6 + Math.random() * 8,
      })),
    [],
  )

  return (
    <Stage>
      <div
        ref={box}
        data-testid="saturn-view"
        role="slider"
        tabIndex={0}
        aria-label="شوفي حلقات زحل من فوق ومن تحت"
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(tilt * 100)}
        className="relative aspect-square touch-none"
        style={{ width: 'min(86%, 76vh)' }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') update(tilt + 0.2)
          if (e.key === 'ArrowDown') update(tilt - 0.2)
        }}
        onPointerDown={(e) => {
          // don't capture taps meant for the rings button (capture would swallow its click)
          if ((e.target as Element).closest('button')) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { y: e.clientY, tilt }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const h = box.current?.clientHeight || 300
          update(drag.current.tilt + ((e.clientY - drag.current.y) / h) * 3)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {stage === 'look' && (
          <span className="anim-bounce absolute top-0 right-2 text-5xl" aria-hidden>
            ↕️
          </span>
        )}
        <PlanetArt id="saturn" ringTilt={tilt} spin title="زحل" />
        {/* she floats beside the rings, peeking around Saturn */}
        <div className="pointer-events-none absolute -top-[2%] left-[2%] w-[22%]" data-testid="saturn-astronaut">
          <AstronautCharacter size="100%" pose={stage === 'look' ? 'peek' : 'float'} upsideDown={upside} />
        </div>
        {stage !== 'look' && (
          <button
            type="button"
            data-testid="saturn-rings"
            aria-label="دوسي على الحلقات"
            onClick={() => {
              if (stage === 'zoom') return
              setStage('zoom')
              sfx('whoosh')
              onDone()
              // rare surprise: she drifts upside down — no "up" in floating space
              // …but only after the mission's happy dance has had its moment
              if (surprises.maybe('upsideDown')) {
                later(() => {
                  setUpside(true)
                  void narrator.say(react('upsideDown'), { mode: 'queue' })
                }, 4000)
              }
            }}
            className="absolute top-1/2 left-1/2 h-[30%] w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            {stage === 'tap' && <TapHint className="rounded-full" />}
          </button>
        )}
      </div>
      {stage === 'look' && (
        <div className="absolute bottom-3 left-3 flex flex-col gap-2">
          <button type="button" aria-label="من فوق" className="btn-pop glass h-14 w-14 rounded-full text-2xl" onClick={() => update(tilt + 0.35)}>
            ⬆️
          </button>
          <button type="button" aria-label="من تحت" className="btn-pop glass h-14 w-14 rounded-full text-2xl" onClick={() => update(tilt - 0.35)}>
            ⬇️
          </button>
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2 text-lg font-bold" aria-label="شوفتي الحلقات">
        <span className={`rounded-full px-3 py-1 ${seen.above ? 'bg-emerald-400 text-night-900' : 'bg-white/10'}`}>
          {seen.above ? '✓' : '○'} من فوق
        </span>
        <span className={`rounded-full px-3 py-1 ${seen.below ? 'bg-emerald-400 text-night-900' : 'bg-white/10'}`}>
          {seen.below ? '✓' : '○'} من تحت
        </span>
      </div>
      {stage === 'zoom' && (
        <div
          className="anim-zoom absolute top-[6%] left-[6%] aspect-square w-[44%] overflow-hidden rounded-full border-8 border-white/80 bg-night-950 shadow-2xl"
          data-testid="ring-zoom"
          aria-label="الحلقات من قريب: حتت تلج وصخور"
          role="img"
        >
          {particles.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-[40%]"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.s,
                height: p.s * 0.8,
                background: p.ice
                  ? 'radial-gradient(circle at 30% 30%, #ffffff, #bfe3ff 60%, #7fb6e6)'
                  : 'radial-gradient(circle at 30% 30%, #d8c7a8, #9b8462 70%)',
                animation: `float ${p.d}s ease-in-out infinite`,
              }}
            />
          ))}
          <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 rounded-full bg-night-900/80 px-3 text-lg font-bold">
            🧊 تلج + 🪨 صخور
          </span>
        </div>
      )}
    </Stage>
  )
}
