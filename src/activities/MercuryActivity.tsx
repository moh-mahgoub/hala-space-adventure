import { useState } from 'react'
import { say, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { ProgressDots, Stage, toArabicDigits, type ActivityProps } from './common'

const SPOTS = [
  { x: 30, y: 30 },
  { x: 66, y: 26 },
  { x: 48, y: 52 },
  { x: 24, y: 64 },
  { x: 70, y: 66 },
]

export function MercuryActivity({ onDone }: ActivityProps) {
  const [found, setFound] = useState<number[]>([])
  const tap = (i: number) => {
    if (found.includes(i)) return
    const next = [...found, i]
    setFound(next)
    sfx('pop')
    if (next.length < SPOTS.length) void say(`common.numbers.${next.length - 1}`)
    else onDone()
  }
  return (
    <Stage>
      <div className="relative aspect-square" style={{ width: 'min(78%, 74vh)' }}>
        <PlanetArt id="mercury" title="عطارد" />
        {SPOTS.map((s, i) => {
          const isFound = found.includes(i)
          return (
            <button
              key={i}
              type="button"
              data-testid={`crater-${i}`}
              aria-label={isFound ? `حفرة رقم ${toArabicDigits(found.indexOf(i) + 1)}` : 'حفرة مستخبية'}
              onClick={() => tap(i)}
              className="btn-pop absolute flex aspect-square w-[18%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              {isFound ? (
                <span className="anim-pop flex h-full w-full items-center justify-center rounded-full border-4 border-stone-300/70 bg-stone-700/70 text-3xl font-extrabold text-yellow-200 shadow-inner">
                  {toArabicDigits(found.indexOf(i) + 1)}
                </span>
              ) : (
                <span className="anim-pulse-glow h-full w-full rounded-full border-4 border-dashed border-yellow-200 bg-yellow-100/20" />
              )}
            </button>
          )
        })}
      </div>
      <ProgressDots total={SPOTS.length} done={found.length} label="الحفر" />
    </Stage>
  )
}
