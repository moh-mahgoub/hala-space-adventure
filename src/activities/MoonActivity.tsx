import { useRef, useState } from 'react'
import { say, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { Stage, type ActivityProps } from './common'

const TAU = Math.PI * 2

/** Drag the Moon all the way around the Earth (or use the buttons). */
export function MoonActivity({ onDone }: ActivityProps) {
  const [angle, setAngle] = useState(-Math.PI / 2)
  const [travel, setTravel] = useState(0)
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const half = useRef(false)
  const done = useRef(false)

  const advance = (next: number) => {
    let d = next - angle
    while (d > Math.PI) d -= TAU
    while (d < -Math.PI) d += TAU
    const t = travel + Math.abs(d)
    setAngle(next)
    setTravel(t)
    if (!half.current && t > Math.PI) {
      half.current = true
      void say('planets.moon.activity.steps.0')
    }
    if (!done.current && t >= TAU * 0.95) {
      done.current = true
      onDone()
    }
  }

  const fromPointer = (e: React.PointerEvent) => {
    const el = svg.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    advance(Math.atan2(y, x))
  }

  const R = 70
  const mx = Math.cos(angle) * R
  const my = Math.sin(angle) * R
  const progress = Math.min(1, travel / TAU)
  const circ = TAU * R

  return (
    <Stage>
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <svg
          ref={svg}
          viewBox="-100 -100 200 200"
          className="aspect-square touch-none"
          style={{ width: 'min(78%, 64vh)' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            dragging.current = true
            fromPointer(e)
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          data-testid="moon-orbit"
          aria-label="مدار القمر حوالين الأرض"
          role="img"
        >
          <circle r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeDasharray="3 5" />
          <circle
            r={R}
            fill="none"
            stroke="#ffe066"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${circ * progress} ${circ}`}
            transform="rotate(-90)"
            opacity={0.85}
          />
          <g transform="translate(-26 -26)">
            <PlanetArt id="earth" size={52} spin />
          </g>
          <g transform={`translate(${mx - 16} ${my - 16})`} style={{ cursor: 'grab' }}>
            <circle cx={16} cy={16} r={26} fill="transparent" />
            {travel < 0.1 && (
              <circle cx={16} cy={16} r={22} fill="none" stroke="#ffe066" strokeWidth={3} className="anim-twinkle" />
            )}
            <PlanetArt id="moon" size={32} />
          </g>
        </svg>
        <div className="flex gap-6">
          <button
            type="button"
            aria-label="لفّي القمر"
            data-testid="moon-step"
            className="btn-pop glass h-16 rounded-full px-6 text-2xl font-bold"
            onClick={() => {
              sfx('tap')
              advance(angle + TAU / 8)
            }}
          >
            🌙 ↻
          </button>
        </div>
      </div>
    </Stage>
  )
}
