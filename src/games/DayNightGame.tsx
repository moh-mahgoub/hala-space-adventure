/**
 * الليل والنهار — Earth seen from above the North Pole, the Sun on the right.
 * Turn the Earth: the little house is in daytime when it faces the Sun.
 */
import { useEffect, useRef, useState } from 'react'
import { say, sfx } from '../audio'
import { HalaAvatar } from '../components/HalaAvatar'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { script } from '../content/script'
import { ui } from '../content/ui'
import { useReducedMotion } from '../hooks'
import { earn } from '../state/rewards'
import { react } from '../profile/reactions'
import { line } from '../audio'
import { isDaytime } from './logic'


/** Earth from above: ocean, a few green lands and the North Pole ice in the middle */
function EarthTopView() {
  return (
    <g>
      <circle r={80} fill="#2f7de1" />
      <path d="M-10,-75 C20,-80 45,-60 40,-40 C30,-30 10,-38 0,-48 C-10,-55 -20,-65 -10,-75 Z" fill="#4cb35a" />
      <path d="M50,10 C70,0 82,20 74,40 C64,52 46,46 44,30 C42,22 44,14 50,10 Z" fill="#46ac55" />
      <path d="M-70,10 C-60,-10 -40,-5 -38,15 C-36,35 -50,50 -62,45 C-72,38 -76,24 -70,10 Z" fill="#4cb35a" />
      <path d="M-20,45 C0,40 20,50 18,66 C10,76 -14,74 -22,62 Z" fill="#e2c072" />
      <circle r={22} fill="#f4fbff" />
      <circle r={22} fill="none" stroke="#d6ecff" strokeWidth={3} />
    </g>
  )
}

export function DayNightGame() {
  const reduced = useReducedMotion()
  const [angle, setAngle] = useState(-0.7) // house starts in daylight, upper right
  const [auto, setAuto] = useState(false)
  const [changes, setChanges] = useState(0)
  const [explained, setExplained] = useState(false)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ start: number; angle: number } | null>(null)
  const day = isDaytime(angle)
  const prevDay = useRef<boolean | null>(null)

  useEffect(() => {
    void say('games.dayNight.intro')
  }, [])

  // auto-spin (counter-clockwise seen from above the North Pole, like the real Earth)
  useEffect(() => {
    if (!auto) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setAngle((a) => a - dt * (reduced ? 0.6 : 0.9))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [auto, reduced])

  useEffect(() => {
    if (prevDay.current === null) {
      prevDay.current = day
      return
    }
    if (prevDay.current !== day) {
      prevDay.current = day
      sfx(day ? 'success' : 'chime')
      const n = changes + 1
      setChanges(n)
      if (n >= 3 && !explained) {
        setExplained(true)
        earn('game:dayNight')
        react('mission', { line: line('games.dayNight.explain') })
        void say('games.dayNight.explain')
      } else if (!auto || n <= 2) {
        void say(day ? 'games.dayNight.day' : 'games.dayNight.night')
      }
    }
  }, [day]) // eslint-disable-line react-hooks/exhaustive-deps

  const pointerAngle = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    // Earth centre is at 40% of the width in the viewBox below
    const cx = r.left + r.width * 0.4
    const cy = r.top + r.height / 2
    return Math.atan2(e.clientY - cy, e.clientX - cx)
  }

  const houseX = Math.cos(angle) * 88
  const houseY = Math.sin(angle) * 88
  const deg = (angle * 180) / Math.PI

  return (
    <div className="screen" data-testid="game-dayNight">
      <TopBar back={{ name: 'games' }} title={script.games.names.dayNight} onReplay={() => void say('games.dayNight.intro')} />
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 pb-20 landscape:flex-row">
        <svg
          ref={svg}
          viewBox="0 0 500 300"
          className="h-full min-h-0 w-full flex-1 touch-none"
          role="slider"
          tabIndex={0}
          aria-label="لفّي الأرض"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(((deg % 360) + 360) % 360)}
          aria-valuetext={day ? ui.day : ui.night}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setAngle((a) => a - 0.3)
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setAngle((a) => a + 0.3)
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            setAuto(false)
            drag.current = { start: pointerAngle(e), angle }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            setAngle(drag.current.angle + (pointerAngle(e) - drag.current.start))
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          data-testid="daynight-earth"
        >
          <defs>
            <linearGradient id="night-side" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#020314" stopOpacity="0.85" />
              <stop offset="0.46" stopColor="#020314" stopOpacity="0.8" />
              <stop offset="0.54" stopColor="#020314" stopOpacity="0" />
            </linearGradient>
            <clipPath id="earth-disk">
              <circle cx={200} cy={150} r={80} />
            </clipPath>
          </defs>
          {/* sunlight rays */}
          {[-60, -30, 0, 30, 60].map((dy) => (
            <line key={dy} x1={430} y1={150 + dy} x2={300} y2={150 + dy * 0.9} stroke="#ffe27a" strokeOpacity="0.35" strokeWidth={6} strokeLinecap="round" strokeDasharray="10 12" />
          ))}
          <g transform="translate(455 150) scale(0.55) translate(-100 -100)">
            <PlanetArt id="sun" size={200} rays spin />
          </g>
          {/* spinning Earth */}
          <g transform={`translate(200 150) rotate(${deg + 90})`}>
            <EarthTopView />
          </g>
          {/* night side (fixed, away from the Sun) */}
          <rect x={120} y={70} width={160} height={160} fill="url(#night-side)" clipPath="url(#earth-disk)" pointerEvents="none" />
          {/* the house + Hala on the rim */}
          <g transform={`translate(${200 + houseX} ${150 + houseY}) rotate(${deg + 90})`}>
            <circle r={26} fill="transparent" />
            <path d="M-12,4 L0,-10 L12,4 Z" fill="#ff6fae" />
            <rect x={-9} y={3} width={18} height={14} rx={2} fill="#ffe6c7" />
            <rect x={-3} y={8} width={6} height={9} fill="#8b5cf6" />
            <rect x={3} y={5} width={4} height={4} fill={day ? '#7ed6ff' : '#ffd84a'} />
          </g>
          <circle cx={200} cy={150} r={80} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
        </svg>

        {/* What the house sees */}
        <div
          className={`relative flex w-full max-w-xs flex-row items-center justify-center gap-3 overflow-hidden rounded-[2rem] border-4 p-4 transition-colors duration-700 landscape:w-64 landscape:flex-col ${
            day ? 'border-sky-200 bg-gradient-to-b from-sky-300 to-sky-500' : 'border-indigo-300/40 bg-gradient-to-b from-indigo-950 to-night-900'
          }`}
          aria-live="polite"
          data-testid="sky-panel"
          data-state={day ? 'day' : 'night'}
        >
          <span className="text-6xl" aria-hidden>
            {day ? '☀️' : '🌙'}
          </span>
          <HalaAvatar size={64} pose={day ? 'wave' : 'stand'} />
          <span className={`text-4xl font-extrabold ${day ? 'text-night-900' : 'text-yellow-100'}`}>
            {day ? ui.day : ui.night}
          </span>
          {!day && <span className="absolute top-2 left-4 text-xl text-white/80" aria-hidden>✨ ⭐ ✨</span>}
        </div>
        <button
          type="button"
          aria-pressed={auto}
          onClick={() => setAuto((a) => !a)}
          className="btn-pop glass rounded-full px-6 py-3 text-xl font-bold"
          data-testid="auto-spin"
        >
          {auto ? '⏸️ وقّفي' : '🔄 لفّيها لوحدها'}
        </button>
      </div>
    </div>
  )
}
