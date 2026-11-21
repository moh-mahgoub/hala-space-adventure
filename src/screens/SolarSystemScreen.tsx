import { useEffect, useMemo, useRef, useState } from 'react'
import { say, sfx } from '../audio'
import { CheckIcon } from '../components/Icons'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { ui } from '../content/ui'
import { BODIES, PLANET_IDS, TOUR_ORDER, displayRadius, type BodyId, type PlanetId } from '../data/planets'
import { useOnce, useReducedMotion, useSize } from '../hooks'
import { navigate } from '../router'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { FriendlyAlien } from '../components/character/FriendlyAlien'
import { surprises } from '../profile/surprises'
import { react } from '../profile/reactions'
import { narrator } from '../audio'

/** Pleasant starting angles so planets don't line up */
const START_ANGLE: Record<PlanetId, number> = {
  mercury: 0.4,
  venus: 2.6,
  earth: 4.4,
  mars: 1.3,
  jupiter: 3.5,
  saturn: 5.6,
  uranus: 0.9,
  neptune: 2.9,
}

/** Seconds per orbit on screen (illustrative, gentle — not to scale) */
function orbitSeconds(id: PlanetId): number {
  return 46 * Math.pow((BODIES[id].orbitDays ?? 365) / 88, 0.33)
}

interface Layout {
  cx: number
  cy: number
  sunR: number
  orbits: Record<PlanetId, { rx: number; ry: number; r: number }>
  moonOrbit: number
  moonR: number
}

export function computeLayout(w: number, h: number): Layout {
  const cx = w / 2
  const cy = h / 2
  const minDim = Math.min(w, h)
  const sunR = Math.max(26, minDim * 0.085)
  const maxRx = w / 2 - Math.max(28, minDim * 0.06)
  const maxRy = h / 2 - Math.max(28, minDim * 0.06)
  const startRx = sunR * 1.7
  const startRy = sunR * 1.5
  const orbits = {} as Layout['orbits']
  const base = Math.max(9, minDim * 0.028)
  PLANET_IDS.forEach((id, i) => {
    const t = (i + 1) / PLANET_IDS.length
    orbits[id] = {
      rx: startRx + (maxRx - startRx) * t,
      ry: startRy + (maxRy - startRy) * t,
      r: base * displayRadius(id) * (id === 'saturn' ? 1.9 : 1),
    }
  })
  return { cx, cy, sunR, orbits, moonOrbit: orbits.earth.r * 2.1, moonR: Math.max(5, orbits.earth.r * 0.42) }
}

function BodyHit({
  id,
  r,
  label,
  highlight,
  onActivate,
  onPress,
}: {
  id: BodyId
  r: number
  label: string
  highlight: boolean
  onActivate: (id: BodyId) => void
  onPress: () => void
}) {
  const art = id === 'saturn' ? r * 2 : r * 2 * (100 / 90)
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      data-testid={`body-${id}`}
      style={{ cursor: 'pointer' }}
      onPointerDown={onPress}
      onClick={() => onActivate(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate(id)
        }
      }}
    >
      <circle r={Math.max(30, r + 14)} fill="transparent" />
      <circle className="focus-ring" r={r + 10} fill="none" stroke="#ffe066" strokeWidth={4} />
      {highlight && (
        <circle
          r={r + 10}
          fill="none"
          stroke="#ffe066"
          strokeWidth={3}
          className="anim-pulse-glow"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
      <g transform={`translate(${-art / 2},${-art / 2})`}>
        <PlanetArt id={id} size={art} spin={id !== 'sun'} rays={id === 'sun'} />
      </g>
    </g>
  )
}

export function SolarSystemScreen() {
  const [ref, size] = useSize<HTMLDivElement>()
  const reduced = useReducedMotion()
  const { mode } = useSettings()
  const progress = useProgress()
  const groups = useRef<Partial<Record<BodyId, SVGGElement | null>>>({})
  const labels = useRef<Partial<Record<BodyId, SVGTextElement | null>>>({})
  const paused = useRef(false)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  // rare surprise: a friendly alien peeks out and waves
  const [alien, setAlien] = useState<'hidden' | 'peek' | 'waved'>('hidden')
  useEffect(() => {
    if (!surprises.maybe('alien')) return
    const show = window.setTimeout(() => setAlien('peek'), 6000)
    const hide = window.setTimeout(() => setAlien((a) => (a === 'peek' ? 'hidden' : a)), 20000)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [])
  const layout = useMemo(() => (size.width ? computeLayout(size.width, size.height) : null), [size.width, size.height])

  const suggestion: BodyId | undefined =
    mode === 'guided' ? TOUR_ORDER.find((id) => !progress.visited.includes(id)) : undefined

  useOnce(() => {
    void say('space.intro').then((completed) => {
      if (completed && suggestion) void say('space.suggest', { planet: BODIES[suggestion].nameAr })
    })
  })

  // Orbit animation: mutate transforms directly (no React re-render per frame)
  useEffect(() => {
    if (!layout) return
    const angles = { ...START_ANGLE }
    let moonAngle = 0
    let last = performance.now()
    let raf = 0
    const place = () => {
      for (const id of PLANET_IDS) {
        const o = layout.orbits[id]
        const x = layout.cx + Math.cos(angles[id]) * o.rx
        const y = layout.cy + Math.sin(angles[id]) * o.ry
        groups.current[id]?.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`)
        labels.current[id]?.setAttribute('transform', `translate(${x.toFixed(1)},${(y + (id === 'saturn' ? o.r * 0.55 : o.r) + 22).toFixed(1)})`)
        if (id === 'earth') {
          const mx = x + Math.cos(moonAngle) * layout.moonOrbit
          const my = y + Math.sin(moonAngle) * layout.moonOrbit * 0.8
          groups.current.moon?.setAttribute('transform', `translate(${mx.toFixed(1)},${my.toFixed(1)})`)
        }
      }
    }
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!paused.current) {
        for (const id of PLANET_IDS) angles[id] += (dt * 2 * Math.PI) / orbitSeconds(id)
        moonAngle += (dt * 2 * Math.PI) / 9
      }
      place()
      raf = requestAnimationFrame(tick)
    }
    place()
    if (!reduced) raf = requestAnimationFrame(tick)
    const resume = () => (paused.current = false)
    window.addEventListener('pointerup', resume)
    window.addEventListener('pointercancel', resume)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointerup', resume)
      window.removeEventListener('pointercancel', resume)
    }
  }, [layout, reduced])

  const open = (id: BodyId, tour = false) => {
    sfx('whoosh')
    const g = groups.current[id]
    const m = g?.getAttribute('transform')?.match(/translate\(([-\d.]+),([-\d.]+)\)/)
    if (m && !reduced) {
      setZoom({ x: Number(m[1]), y: Number(m[2]) })
      window.setTimeout(() => navigate({ name: 'planet', id, tour }), 380)
    } else {
      navigate({ name: 'planet', id, tour })
    }
  }

  return (
    <div className="screen" data-testid="space-screen">
      <TopBar title="المجموعة الشمسية" onReplay={() => void say('space.intro')}>
        <button
          type="button"
          data-testid="tour-button"
          onClick={() => open('sun', true)}
          className="btn-pop flex h-16 items-center gap-2 rounded-full bg-gradient-to-b from-pink-300 to-fuchsia-500 px-4 text-xl font-extrabold shadow-lg"
        >
          <span aria-hidden className="text-3xl">
            🚀
          </span>
          <span className="hidden sm:inline">{ui.tour}</span>
          <span className="sr-only sm:hidden">{ui.tour}</span>
        </button>
      </TopBar>

      <div ref={ref} className="relative min-h-0 flex-1 overflow-hidden">
        {layout && (
          <svg
            width={size.width}
            height={size.height}
            className="absolute inset-0 touch-none"
            style={{
              transition: 'transform 0.38s ease-in',
              transformOrigin: zoom ? `${zoom.x}px ${zoom.y}px` : 'center',
              transform: zoom ? 'scale(3.2)' : undefined,
              opacity: zoom ? 0.9 : 1,
            }}
            role="group"
            aria-label="المجموعة الشمسية: الشمس والكواكب التمانية"
          >
            {PLANET_IDS.map((id) => (
              <ellipse
                key={id}
                cx={layout.cx}
                cy={layout.cy}
                rx={layout.orbits[id].rx}
                ry={layout.orbits[id].ry}
                fill="none"
                stroke="rgba(190,200,255,0.18)"
                strokeWidth={1.5}
                strokeDasharray="4 6"
              />
            ))}
            <g transform={`translate(${layout.cx},${layout.cy})`}>
              <BodyHit
                id="sun"
                r={layout.sunR}
                label={BODIES.sun.nameAr}
                highlight={suggestion === 'sun'}
                onActivate={open}
                onPress={() => (paused.current = true)}
              />
            </g>
            {PLANET_IDS.map((id) => (
              <g key={id} ref={(el) => void (groups.current[id] = el)}>
                <BodyHit
                  id={id}
                  r={layout.orbits[id].r}
                  label={BODIES[id].nameAr}
                  highlight={suggestion === id}
                  onActivate={open}
                  onPress={() => (paused.current = true)}
                />
              </g>
            ))}
            <g ref={(el) => void (groups.current.moon = el)}>
              <BodyHit
                id="moon"
                r={layout.moonR}
                label={BODIES.moon.nameAr}
                highlight={suggestion === 'moon'}
                onActivate={open}
                onPress={() => (paused.current = true)}
              />
            </g>
            {size.width > 500 &&
              PLANET_IDS.map((id) => (
                <text
                  key={id}
                  ref={(el) => void (labels.current[id] = el)}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight={700}
                  fill="#fff"
                  stroke="#0d1036"
                  strokeWidth={4}
                  paintOrder="stroke"
                  pointerEvents="none"
                  aria-hidden
                >
                  {BODIES[id].nameAr}
                </text>
              ))}
          </svg>
        )}
        {alien !== 'hidden' && (
          <button
            type="button"
            data-testid="friendly-alien"
            aria-label="كائن فضائي لطيف"
            onClick={() => {
              sfx('pop')
              setAlien('waved')
              void narrator.say(react('alien'))
              window.setTimeout(() => setAlien('hidden'), 4000)
            }}
            className="absolute top-[38%] -left-2"
            style={{ animation: alien === 'peek' ? 'slide-up 0.6s ease both' : undefined }}
          >
            <span className={`block ${alien === 'waved' ? 'anim-bounce' : ''}`}>
              <FriendlyAlien size={70} />
            </span>
          </button>
        )}
        <p className="pointer-events-none absolute bottom-1 left-2 text-xs text-white/45" dir="ltr">
          Illustration — sizes & distances not to scale
        </p>
      </div>

      {/* Quick-pick strip, in order from the Sun (right → left) */}
      <nav aria-label="الكواكب بالترتيب" className="shrink-0 pb-16 sm:pb-20">
        <ol className="mx-auto flex max-w-5xl justify-between gap-1 overflow-x-auto px-1 py-1">
          {TOUR_ORDER.map((id) => {
            const visited = progress.visited.includes(id)
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-label={BODIES[id].nameAr}
                  data-testid={`strip-${id}`}
                  onClick={() => open(id)}
                  className={`btn-pop relative flex w-16 flex-col items-center rounded-2xl p-1 sm:w-20 ${
                    suggestion === id ? 'bg-yellow-300/20 ring-4 ring-yellow-300' : ''
                  }`}
                >
                  <PlanetArt id={id} size={44} />
                  <span className="mt-0.5 text-sm leading-none font-bold whitespace-nowrap sm:text-base">
                    {BODIES[id].nameAr}
                  </span>
                  {visited && (
                    <span
                      className="absolute top-0 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-xs text-night-900"
                      aria-label="زرتيه"
                    >
                      <CheckIcon />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
