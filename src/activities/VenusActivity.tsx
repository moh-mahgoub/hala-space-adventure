import { useState } from 'react'
import { sfx } from '../audio'
import { ProgressDots, Stage, type ActivityProps } from './common'

const CLOUDS = [
  { x: 30, y: 28, s: 46 },
  { x: 68, y: 30, s: 44 },
  { x: 50, y: 52, s: 52 },
  { x: 26, y: 68, s: 44 },
  { x: 72, y: 70, s: 46 },
]

/** Venus' rocky, volcanic surface hidden under thick clouds */
function VenusSurface() {
  return (
    <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="venus-surface" cx="40%" cy="38%" r="70%">
          <stop offset="0" stopColor="#f0a55a" />
          <stop offset="0.7" stopColor="#c3632b" />
          <stop offset="1" stopColor="#7a3a19" />
        </radialGradient>
        <clipPath id="venus-clip">
          <circle r="90" />
        </clipPath>
      </defs>
      <circle r="90" fill="url(#venus-surface)" />
      <g clipPath="url(#venus-clip)">
        <path d="M-60,30 L-40,0 L-20,30 Z" fill="#8f4320" />
        <path d="M-46,5 L-40,0 L-34,5 Z" fill="#ffcf6b" />
        <path d="M20,10 L45,-25 L70,10 Z" fill="#9a4a24" />
        <path d="M38,-17 L45,-25 L52,-17 Z" fill="#ffcf6b" />
        <ellipse cx="-10" cy="-45" rx="22" ry="8" fill="#a85529" />
        <ellipse cx="10" cy="55" rx="30" ry="9" fill="#a85529" />
        <circle cx="-62" cy="-30" r="6" fill="#8f4320" />
        <circle cx="62" cy="40" r="5" fill="#8f4320" />
      </g>
    </svg>
  )
}

export function VenusActivity({ onDone }: ActivityProps) {
  const [gone, setGone] = useState<number[]>([])
  const tap = (i: number) => {
    if (gone.includes(i)) return
    const next = [...gone, i]
    setGone(next)
    sfx('whoosh')
    if (next.length === CLOUDS.length) onDone()
  }
  return (
    <Stage>
      <div className="relative aspect-square overflow-visible" style={{ width: 'min(78%, 74vh)' }}>
        <VenusSurface />
        {CLOUDS.map((c, i) => {
          const isGone = gone.includes(i)
          return (
            <button
              key={i}
              type="button"
              data-testid={`cloud-${i}`}
              aria-label="سحابة"
              disabled={isGone}
              onClick={() => tap(i)}
              className="absolute transition-all duration-700 ease-out"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                width: `${c.s}%`,
                aspectRatio: '1.6',
                opacity: isGone ? 0 : 1,
                transform: `translate(-50%,-50%) translate(${isGone ? (c.x < 50 ? -160 : 160) : 0}%, ${isGone ? -40 : 0}%) scale(${isGone ? 0.6 : 1})`,
              }}
            >
              <svg viewBox="0 0 160 100" className="h-full w-full drop-shadow-lg" aria-hidden>
                <g fill="#f6dfa2">
                  <circle cx="50" cy="60" r="32" />
                  <circle cx="85" cy="45" r="38" />
                  <circle cx="118" cy="62" r="28" />
                  <rect x="30" y="60" width="110" height="30" rx="15" />
                </g>
                <g fill="#fff3cf" opacity="0.7">
                  <circle cx="78" cy="36" r="16" />
                  <circle cx="48" cy="52" r="10" />
                </g>
              </svg>
            </button>
          )
        })}
      </div>
      <ProgressDots total={CLOUDS.length} done={gone.length} label="السحاب" />
    </Stage>
  )
}
