/**
 * رحلة رائد الفضاء — fly a little ship (tap/hold where to go, or arrow keys),
 * collect stars and visit planets to hear a fact. No hazards, no timer, no score pressure.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { line, narrator, say, sfx } from '../audio'
import { Celebration } from '../components/Celebration'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { script } from '../content/script'
import { BODIES, PLANET_IDS, displayRadius, type BodyId, type PlanetId } from '../data/planets'
import { useSize } from '../hooks'
import { earn } from '../state/rewards'
import { react } from '../profile/reactions'
import { ChildFace } from '../components/character/ChildAvatar'
import { keepAway, scatterStars, stepToward, touching, type Point } from './logic'

const STAR_COUNT = 12
const LAND_Y = [0.3, 0.7, 0.32, 0.68, 0.34, 0.68, 0.3, 0.7]

function Ship() {
  return (
    <g>
      <path d="M-30,0 L-44,-10 L-40,0 L-44,10 Z" fill="#ff9d3c" className="anim-twinkle" />
      <path d="M-28,-12 L-36,-20 L-18,-12 Z" fill="#ff6fae" />
      <path d="M-28,12 L-36,20 L-18,12 Z" fill="#ff6fae" />
      <path d="M-30,-12 C-10,-16 18,-12 34,0 C18,12 -10,16 -30,12 Z" fill="#f4f6ff" />
      <circle cx={6} cy={0} r={10} fill="#23286b" stroke="#c9d1f3" strokeWidth={3} />
      {/* the pilot, kept upright-ish by the cockpit */}
      <ChildFace cx={6} cy={0} r={8} />
    </g>
  )
}

export function ExplorerGame() {
  const [ref, size] = useSize<HTMLDivElement>()
  const [game, setGame] = useState(0)
  const portrait = size.height > size.width
  const minDim = Math.min(size.width, size.height) || 1

  const bodies = useMemo(() => {
    const list: { id: BodyId; x: number; y: number; r: number }[] = [
      portrait ? { id: 'sun', x: 0.5, y: 0.06, r: 0.12 } : { id: 'sun', x: 0.95, y: 0.5, r: 0.12 },
    ]
    PLANET_IDS.forEach((id, i) => {
      const along = 0.8 - i * 0.105
      const across = LAND_Y[i]
      list.push({
        id,
        x: portrait ? across : along,
        y: portrait ? 0.17 + i * 0.11 : across,
        r: 0.04 * displayRadius(id) * (id === 'saturn' ? 1.6 : 1),
      })
    })
    return list
  }, [portrait])

  // star positions in 0..1 space
  const stars = useMemo(
    () => scatterStars(STAR_COUNT, bodies.map((b) => ({ x: b.x, y: b.y, r: b.r * (minDim / Math.max(1, portrait ? size.height : size.width)) + 0.03 }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodies, game],
  )
  const [collected, setCollected] = useState<number[]>([])
  const [visited, setVisited] = useState<PlanetId[]>([])
  const [card, setCard] = useState<BodyId | null>(null)
  const [finished, setFinished] = useState(false)

  const ship = useRef<Point>({ x: 0, y: 0 })
  const target = useRef<Point | null>(null)
  const heading = useRef(Math.PI)
  const keys = useRef(new Set<string>())
  const shipEl = useRef<SVGGElement>(null)
  const state = useRef({ collected: [] as number[], visited: [] as PlanetId[], lastSun: 0, near: null as BodyId | null })

  useEffect(() => {
    void say('games.explorer.intro')
  }, [])

  // reset ship when layout changes
  useEffect(() => {
    if (!size.width) return
    ship.current = portrait ? { x: size.width * 0.5, y: size.height * 0.45 } : { x: size.width * 0.62, y: size.height * 0.5 }
    target.current = null
  }, [size.width, size.height, portrait, game])

  useEffect(() => {
    if (!size.width) return
    const W = size.width
    const H = size.height
    const toPx = (p: Point) => ({ x: p.x * W, y: p.y * H })
    const speed = minDim * 0.45
    const shipR = minDim * 0.04
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = ship.current
      // keyboard
      const k = keys.current
      if (k.size) {
        const dx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0)
        const dy = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0)
        if (dx || dy) target.current = { x: s.x + dx * 60, y: s.y + dy * 60 }
      }
      if (target.current) {
        const t = { x: Math.max(shipR, Math.min(W - shipR, target.current.x)), y: Math.max(shipR, Math.min(H - shipR, target.current.y)) }
        const next = stepToward(s, t, speed, dt)
        if (next.x !== s.x || next.y !== s.y) heading.current = Math.atan2(next.y - s.y, next.x - s.x)
        ship.current = next
        if (next.x === t.x && next.y === t.y && !k.size) target.current = null
      }
      // the Sun: stay at a comfortable distance (no damage — just a friendly stop)
      const sun = bodies[0]
      const sunPx = toPx(sun)
      const sunMin = sun.r * minDim * 1.25 + shipR
      if (touching(ship.current, shipR, sunPx, sun.r * minDim * 1.2)) {
        ship.current = keepAway(ship.current, sunPx, sunMin)
        target.current = null
        if (now - state.current.lastSun > 7000) {
          state.current.lastSun = now
          void say('games.explorer.sun')
        }
      }
      // stars
      stars.forEach((st, i) => {
        if (state.current.collected.includes(i)) return
        if (touching(ship.current, shipR, toPx(st), minDim * 0.035)) {
          state.current.collected = [...state.current.collected, i]
          setCollected(state.current.collected)
          sfx('star')
          if (state.current.collected.length === stars.length) void narrator.say(react('mission', { line: line('games.explorer.allStars') }))
        }
      })
      // planets
      let near: BodyId | null = null
      for (const b of bodies.slice(1)) {
        if (touching(ship.current, shipR, toPx(b), b.r * minDim)) near = b.id
      }
      if (near !== state.current.near) {
        state.current.near = near
        if (near) {
          sfx('chime')
          setCard(near)
          const id = near as PlanetId
          void narrator.say(line(`planets.${id}.short`))
          if (!state.current.visited.includes(id)) {
            state.current.visited = [...state.current.visited, id]
            setVisited(state.current.visited)
          }
        }
      }
      // Flying left: mirror the ship instead of turning it upside down, so the pilot stays upright
      const deg = (heading.current * 180) / Math.PI
      const left = Math.cos(heading.current) < 0
      const orient = left ? `scale(-1,1) rotate(${(180 - deg).toFixed(1)})` : `rotate(${deg.toFixed(1)})`
      shipEl.current?.setAttribute(
        'transform',
        `translate(${ship.current.x.toFixed(1)},${ship.current.y.toFixed(1)}) ${orient} scale(${(shipR / 30).toFixed(3)})`,
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const down = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) {
        e.preventDefault()
        keys.current.add(e.key)
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [size.width, size.height, minDim, bodies, stars])

  // finished: all stars + all planets
  useEffect(() => {
    if (!finished && collected.length === stars.length && visited.length === PLANET_IDS.length) {
      setFinished(true)
      earn('game:explorer')
      void say('games.explorer.allPlanets')
    } else if (collected.length === stars.length && stars.length && visited.length < PLANET_IDS.length) {
      earn('game:explorer')
    }
  }, [collected, visited, stars.length, finished])

  useEffect(() => {
    if (!card) return
    const t = window.setTimeout(() => setCard(null), 4500)
    return () => clearTimeout(t)
  }, [card])

  const setTargetFromEvent = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const restart = () => {
    setFinished(false)
    setCollected([])
    setVisited([])
    state.current = { collected: [], visited: [], lastSun: 0, near: null }
    setGame((g) => g + 1)
  }

  return (
    <div className="screen" data-testid="game-explorer">
      <TopBar back={{ name: 'games' }} title={script.games.names.explorer} onReplay={() => void say('games.explorer.intro')}>
        <div className="glass flex h-16 items-center gap-3 rounded-full px-4 text-2xl font-extrabold" aria-live="polite">
          <span data-testid="explorer-stars">
            ⭐ {collected.length.toLocaleString('ar-EG')}/{stars.length.toLocaleString('ar-EG')}
          </span>
          <span className="hidden sm:inline" data-testid="explorer-planets">
            🪐 {visited.length.toLocaleString('ar-EG')}/{(8).toLocaleString('ar-EG')}
          </span>
        </div>
      </TopBar>
      <div
        ref={ref}
        className="relative mb-16 min-h-0 flex-1 touch-none overflow-hidden rounded-[2rem] border-2 border-white/10 bg-night-950/40"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setTargetFromEvent(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pointerType === 'touch') setTargetFromEvent(e)
        }}
        data-testid="explorer-field"
        aria-label="ساحة الفضاء: دوسي في أي حتة عشان السفينة تروح هناك، أو استعملي الأسهم"
        role="application"
      >
        {size.width > 0 && (
          <svg width={size.width} height={size.height} className="absolute inset-0" aria-hidden>
            {stars.map((st, i) =>
              collected.includes(i) ? null : (
                <g key={`${game}-${i}`} transform={`translate(${st.x * size.width},${st.y * size.height})`}>
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={minDim * 0.06}
                    className="anim-twinkle"
                    fill="#ffe066"
                  >
                    ★
                  </text>
                </g>
              ),
            )}
            {bodies.map((b) => {
              const r = b.r * minDim
              const art = b.id === 'saturn' ? r * 2 : r * 2.2
              const v = b.id !== 'sun' && visited.includes(b.id as PlanetId)
              return (
                <g key={b.id} transform={`translate(${b.x * size.width},${b.y * size.height})`}>
                  {v && <circle r={r * 1.25} fill="none" stroke="#4ee6b4" strokeWidth={3} strokeDasharray="6 6" />}
                  <g transform={`translate(${-art / 2},${-art / 2})`}>
                    <PlanetArt id={b.id} size={art} spin={b.id !== 'sun'} rays={b.id === 'sun'} />
                  </g>
                  {v && (
                    <text y={-r * 1.3} textAnchor="middle" fontSize={16} fill="#4ee6b4">
                      ✓
                    </text>
                  )}
                </g>
              )
            })}
            <g ref={shipEl}>
              <Ship />
            </g>
          </svg>
        )}
        {card && (
          <div className="anim-slide-up pointer-events-none absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-night-900/90 px-4 py-2 shadow-xl" data-testid="explorer-card">
            <PlanetArt id={card} size={44} />
            <span className="text-2xl font-extrabold">{BODIES[card].nameAr}</span>
          </div>
        )}
      </div>
      {finished && (
        <Celebration title="رائدة فضاء شاطرة!" icon="🚀" onClose={restart}>
          <p className="text-2xl font-bold">جمعتي النجوم وزرتي الكواكب!</p>
        </Celebration>
      )}
    </div>
  )
}
