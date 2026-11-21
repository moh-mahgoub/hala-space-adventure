import { useEffect, useRef, useState } from 'react'
import { say, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { useReducedMotion } from '../hooks'
import { ProgressDots, Stage, TapHint, type ActivityProps } from './common'
import { REGION_LABEL, REGION_STEP, regionAt, type Region } from './earthRegions'

/** Spin the Earth with a finger (or the arrow buttons) and discover ocean, land and desert. */
export function EarthActivity({ onDone }: ActivityProps) {
  const reduced = useReducedMotion()
  const [rot, setRot] = useState(0.12)
  const [travel, setTravel] = useState(0)
  const [region, setRegion] = useState<Region>(() => regionAt(0.12))
  const [found, setFound] = useState<Region[]>([])
  const drag = useRef<{ x: number; rot: number; last: number; t: number; v: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)
  const lastSpoken = useRef<Region | null>(null)
  const lastSpokenAt = useRef(0)

  // inertia after letting go
  const velocity = useRef(0)
  useEffect(() => {
    let raf = 0
    const step = () => {
      if (!drag.current && Math.abs(velocity.current) > 0.0004) {
        const dv = velocity.current
        velocity.current *= 0.94
        setRot((r) => r + dv)
        setTravel((t) => t + Math.abs(dv))
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const r = regionAt(rot)
    if (r !== region) {
      setRegion(r)
      const now = performance.now()
      if (lastSpoken.current !== r && now - lastSpokenAt.current > 2600) {
        lastSpoken.current = r
        lastSpokenAt.current = now
        sfx('pop')
        void say(`planets.earth.activity.steps.${REGION_STEP[r]}`)
      }
      setFound((f) => (f.includes(r) ? f : [...f, r]))
    }
  }, [rot, region])

  useEffect(() => {
    if (!doneRef.current && travel >= 1 && found.length >= 2) {
      doneRef.current = true
      onDone()
    }
  }, [travel, found, onDone])

  const nudge = (d: number) => {
    sfx('tap')
    if (reduced) {
      setRot((r) => r + d * 0.18)
      setTravel((t) => t + 0.18)
    } else velocity.current += d * 0.02
  }

  const label = REGION_LABEL[region]
  return (
    <Stage>
      <div className="flex h-full w-full flex-col items-center justify-center gap-2">
        <div
          ref={box}
          data-testid="earth-spinner"
          role="slider"
          tabIndex={0}
          aria-label="لفّي الأرض"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((((rot % 1) + 1) % 1) * 100)}
          aria-valuetext={label.text}
          className="relative aspect-square touch-none cursor-grab"
          style={{ width: 'min(70%, 60vh)' }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') nudge(1)
            if (e.key === 'ArrowRight') nudge(-1)
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            velocity.current = 0
            drag.current = { x: e.clientX, rot, last: e.clientX, t: performance.now(), v: 0 }
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            const w = box.current?.clientWidth || 300
            const now = performance.now()
            const dxStep = e.clientX - d.last
            d.v = (-dxStep / w) * (16 / Math.max(1, now - d.t))
            d.last = e.clientX
            d.t = now
            setRot(d.rot - (e.clientX - d.x) / w)
            setTravel((t) => t + Math.abs(dxStep / w))
          }}
          onPointerUp={() => {
            if (drag.current && !reduced) velocity.current = Math.max(-0.05, Math.min(0.05, drag.current.v))
            drag.current = null
          }}
          onPointerCancel={() => (drag.current = null)}
        >
          {travel < 0.05 && <TapHint />}
          <PlanetArt id="earth" rotation={rot} title="الأرض" />
          <span
            key={region}
            className="anim-pop absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-1 text-2xl font-extrabold text-night-900 shadow-xl"
            data-testid="earth-region"
          >
            <span aria-hidden>{label.icon}</span>
            {label.text}
          </span>
        </div>
        <div className="flex gap-6">
          <button type="button" aria-label="لفّي يمين" onClick={() => nudge(-1)} className="btn-pop glass h-16 w-16 rounded-full text-3xl">
            ↻
          </button>
          <button type="button" aria-label="لفّي شمال" onClick={() => nudge(1)} className="btn-pop glass h-16 w-16 rounded-full text-3xl">
            ↺
          </button>
        </div>
      </div>
      <ProgressDots total={3} done={found.length} label="الاكتشافات" />
    </Stage>
  )
}
