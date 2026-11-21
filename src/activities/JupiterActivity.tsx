import { useMemo, useState } from 'react'
import { say, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { relativeToEarth } from '../data/planets'
import { Stage, TapHint, toArabicDigits, type ActivityProps } from './common'

const GOAL = 10

/** Drop Earths into Jupiter. Earth here is drawn at the REAL size ratio (~1:11). */
export function JupiterActivity({ onDone }: ActivityProps) {
  const [count, setCount] = useState(0)
  const ratio = 1 / relativeToEarth('jupiter') // ≈ 0.089
  const spots = useMemo(() => {
    // pack positions inside the disk (golden-angle spiral)
    return Array.from({ length: 40 }, (_, i) => {
      const r = Math.sqrt((i + 0.5) / 40) * 36
      const a = i * 2.399963
      return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r }
    })
  }, [])

  const drop = () => {
    const n = count + 1
    setCount(n)
    sfx('pop')
    if (n < GOAL) void say(`common.numbers.${n - 1}`)
    else if (n === GOAL) onDone()
  }

  return (
    <Stage>
      <div className="flex h-full w-full items-center justify-center gap-[4%]">
        <div className="relative aspect-square" style={{ width: 'min(62%, 66vh)' }}>
          <PlanetArt id="jupiter" spin title="المشتري" />
          {spots.slice(0, count).map((s, i) => (
            <div
              key={i}
              className="anim-pop absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${ratio * 100}%` }}
              aria-hidden
            >
              <PlanetArt id="earth" />
            </div>
          ))}
          <div
            className="absolute bottom-[-4%] left-1/2 -translate-x-1/2 rounded-full bg-night-900/70 px-4 py-1 text-2xl font-extrabold"
            aria-live="polite"
            data-testid="earth-count"
          >
            🌍 × {toArabicDigits(count)}
            {count >= GOAL && <span className="text-yellow-200"> … وأكتر من ١٠٠٠!</span>}
          </div>
        </div>
        <button
          type="button"
          data-testid="drop-earth"
          aria-label="حطي أرض جوه المشتري"
          onClick={drop}
          className="btn-pop glass relative flex flex-col items-center gap-2 rounded-3xl p-5"
        >
          {count === 0 && <TapHint className="rounded-3xl" />}
          {/* to scale with the Jupiter on screen */}
          <div style={{ width: 'max(22px, calc(min(62vw, 66vh) * 0.089))' }}>
            <PlanetArt id="earth" spin />
          </div>
          <span className="text-xl font-bold">الأرض</span>
          <span className="text-3xl" aria-hidden>
            👆
          </span>
        </button>
      </div>
    </Stage>
  )
}
