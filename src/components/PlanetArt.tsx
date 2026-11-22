/**
 * Procedural SVG art for every body. Self-made vector art, no image assets.
 *
 * Every texture is authored for a radius-100 disk, as a horizontal strip that
 * repeats every 200 units — so "spinning" is just sliding the strip sideways.
 */
import { useId, type CSSProperties, type ReactNode } from 'react'
import type { BodyId } from '../data/planets'

export interface PlanetArtProps {
  id: BodyId
  /** px size of the square box (default 100%) */
  size?: number | string
  /** animate rotation (sliding texture) */
  spin?: boolean
  /** manual rotation 0..1 (overrides spin) — used by the Earth activity */
  rotation?: number
  /** Saturn ring opening 0 (edge-on) .. 1 (wide open) */
  ringTilt?: number
  /** render as flat silhouette (shadow game) */
  silhouette?: boolean
  /** Show sun rays */
  rays?: boolean
  className?: string
  style?: CSSProperties
  title?: string
}

const SPIN_SECONDS: Partial<Record<BodyId, number>> = {
  mercury: 60,
  venus: 90,
  earth: 30,
  moon: 80,
  mars: 34,
  jupiter: 16,
  saturn: 18,
  uranus: 26,
  neptune: 24,
  pluto: 40,
}

/** planet radius inside the -100..100 box */
export function bodyRadius(id: BodyId): number {
  if (id === 'saturn') return 50
  if (id === 'uranus') return 74
  if (id === 'sun') return 78
  return 90
}

function Repeat({ children }: { children: ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform="translate(200 0)">{children}</g>
    </>
  )
}

function Craters({ list, fill = 'rgba(0,0,0,0.18)', rim = 'rgba(255,255,255,0.18)' }: { list: [number, number, number][]; fill?: string; rim?: string }) {
  return (
    <>
      {list.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={fill} />
          <circle cx={x - r * 0.15} cy={y - r * 0.15} r={r * 0.8} fill="none" stroke={rim} strokeWidth={Math.max(1, r * 0.18)} />
        </g>
      ))}
    </>
  )
}

function Texture({ id }: { id: BodyId }) {
  switch (id) {
    case 'mercury':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#9d9790" />
          <Repeat>
            <ellipse cx={-40} cy={-30} rx={30} ry={18} fill="#8a847d" />
            <ellipse cx={50} cy={40} rx={34} ry={20} fill="#b0aaa2" />
            <Craters
              list={[
                [-60, -50, 12],
                [-20, 10, 16],
                [30, -40, 10],
                [60, 20, 8],
                [-70, 40, 9],
                [10, 60, 11],
                [80, -60, 7],
                [-5, -70, 6],
              ]}
            />
          </Repeat>
        </>
      )
    case 'venus':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#ecc985" />
          <Repeat>
            <path d="M-100,-55 C-50,-70 0,-40 50,-58 C80,-68 95,-50 100,-55 L100,-35 C60,-30 20,-50 -30,-30 C-60,-20 -90,-40 -100,-35 Z" fill="#f6dfa8" />
            <path d="M-100,5 C-60,-10 -20,15 30,0 C60,-8 85,12 100,5 L100,25 C50,35 10,15 -30,30 C-60,40 -90,25 -100,25 Z" fill="#d9ab62" opacity="0.8" />
            <path d="M-100,50 C-60,40 -10,62 40,48 C70,40 90,55 100,50 L100,70 C60,75 10,60 -40,75 C-70,80 -90,70 -100,70 Z" fill="#f3d79a" />
          </Repeat>
        </>
      )
    case 'earth':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#2f7de1" />
          <Repeat>
            {/* Americas */}
            <path d="M-75,-60 C-60,-75 -35,-70 -30,-50 C-28,-35 -40,-25 -48,-15 C-52,-8 -45,0 -50,5 C-58,-5 -70,-20 -72,-35 Z" fill="#4cb35a" />
            <path d="M-48,10 C-35,8 -28,20 -30,35 C-32,50 -40,65 -45,72 C-50,60 -55,40 -55,25 C-55,15 -52,10 -48,10 Z" fill="#3fa34d" />
            {/* Europe + Africa */}
            <path d="M5,-55 C15,-62 30,-60 35,-50 C30,-42 20,-40 12,-38 C5,-40 0,-48 5,-55 Z" fill="#5cbf68" />
            <path d="M2,-30 C15,-36 35,-32 40,-18 C45,-5 38,10 32,25 C27,40 20,55 14,58 C8,45 6,30 2,18 C-4,5 -6,-15 2,-30 Z" fill="#46ac55" />
            <path d="M6,-26 C18,-31 32,-27 36,-15 C27,-8 15,-9 4,-11 C1,-17 2,-23 6,-26 Z" fill="#e2c072" />
            {/* Asia + Australia */}
            <path d="M45,-60 C65,-70 90,-62 94,-45 C95,-30 85,-20 75,-15 C70,-5 62,0 56,-8 C50,-20 42,-35 45,-60 Z" fill="#4cb35a" />
            <path d="M52,-40 C60,-44 70,-42 72,-34 C66,-28 58,-28 52,-32 Z" fill="#d9b468" />
            <path d="M70,30 C80,25 92,30 92,40 C90,50 78,52 72,46 C68,40 66,34 70,30 Z" fill="#d6a85c" />
            {/* clouds */}
            <path d="M-90,-20 C-80,-26 -66,-24 -60,-18 C-70,-14 -82,-14 -90,-20 Z" fill="#fff" opacity="0.75" />
            <path d="M-10,40 C0,34 18,36 24,42 C12,46 -2,46 -10,40 Z" fill="#fff" opacity="0.7" />
            <path d="M40,10 C52,4 66,6 72,12 C60,16 48,16 40,10 Z" fill="#fff" opacity="0.65" />
          </Repeat>
        </>
      )
    case 'moon':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#d3cec7" />
          <Repeat>
            <ellipse cx={-30} cy={-25} rx={28} ry={22} fill="#aaa49c" />
            <ellipse cx={15} cy={-5} rx={20} ry={26} fill="#b1aba3" />
            <ellipse cx={-10} cy={35} rx={22} ry={14} fill="#a8a29a" />
            <Craters
              list={[
                [40, 45, 12],
                [-60, 20, 9],
                [60, -40, 10],
                [-75, -55, 7],
                [5, 65, 6],
                [85, 15, 8],
              ]}
              fill="rgba(0,0,0,0.12)"
            />
          </Repeat>
        </>
      )
    case 'mars':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#d4623a" />
          <Repeat>
            <path d="M-80,-20 C-60,-35 -30,-20 -20,0 C-30,15 -60,10 -75,0 Z" fill="#a8442a" />
            <path d="M20,10 C40,0 70,10 80,30 C60,45 30,40 22,28 Z" fill="#b14d2e" />
            <path d="M-20,-50 C0,-58 30,-52 35,-42 C20,-36 -5,-38 -20,-50 Z" fill="#e5875a" />
            <ellipse cx={-50} cy={45} rx={24} ry={10} fill="#e98a5d" />
            {/* Olympus Mons */}
            <circle cx={55} cy={-20} r={9} fill="#c45a35" stroke="#e9956a" strokeWidth={2} />
          </Repeat>
        </>
      )
    case 'jupiter':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#ead6b4" />
          {(
            [
              [-90, 18, '#c99a6b'],
              [-62, 12, '#f2e3c6'],
              [-45, 16, '#b87a4b'],
              [-22, 10, '#f5e8cf'],
              [-8, 14, '#d7a676'],
              [12, 10, '#f3e2c2'],
              [24, 18, '#bf8152'],
              [48, 10, '#efdcb9'],
              [60, 16, '#c99a6b'],
              [80, 20, '#e0c39c'],
            ] as [number, number, string][]
          ).map(([y, h, c], i) => (
            <rect key={i} x={-100} y={y} width={400} height={h} fill={c} />
          ))}
          <Repeat>
            <path d="M-90,22 C-70,18 -50,28 -30,22" stroke="#f6ead4" strokeWidth={3} fill="none" opacity="0.7" />
            <path d="M0,-40 C20,-44 40,-36 60,-40" stroke="#f6ead4" strokeWidth={3} fill="none" opacity="0.6" />
            {/* Great Red Spot */}
            <ellipse cx={30} cy={34} rx={20} ry={11} fill="#c4542f" />
            <ellipse cx={30} cy={34} rx={13} ry={6} fill="#d9714a" />
          </Repeat>
        </>
      )
    case 'saturn':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#ecd59a" />
          {(
            [
              [-80, 24, '#d9b86f'],
              [-40, 12, '#f4e3b5'],
              [-20, 16, '#e0c381'],
              [10, 12, '#f2deaa'],
              [30, 20, '#d6b26c'],
              [60, 30, '#e7cb8c'],
            ] as [number, number, string][]
          ).map(([y, h, c], i) => (
            <rect key={i} x={-100} y={y} width={400} height={h} fill={c} />
          ))}
          <Repeat>
            <ellipse cx={-40} cy={-30} rx={30} ry={4} fill="#f8ecc8" opacity="0.6" />
            <ellipse cx={40} cy={40} rx={35} ry={4} fill="#caa45e" opacity="0.6" />
          </Repeat>
        </>
      )
    case 'uranus':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#93e0e8" />
          <Repeat>
            <rect x={-100} y={-30} width={200} height={10} fill="#a9ebf0" opacity="0.7" />
            <rect x={-100} y={20} width={200} height={8} fill="#7fd0da" opacity="0.6" />
            <ellipse cx={20} cy={-55} rx={30} ry={6} fill="#b8f1f4" opacity="0.6" />
          </Repeat>
        </>
      )
    case 'neptune':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#3a5fe0" />
          <Repeat>
            <path d="M-90,-40 C-60,-46 -30,-36 0,-42" stroke="#7fa2ff" strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M10,30 C40,24 70,34 95,28" stroke="#8fb0ff" strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d="M-60,55 C-40,50 -20,58 0,54" stroke="#6d8ff5" strokeWidth={3} fill="none" strokeLinecap="round" />
            {/* Dark spot */}
            <ellipse cx={40} cy={-10} rx={16} ry={9} fill="#233c9e" />
            <ellipse cx={46} cy={-20} rx={10} ry={3} fill="#e8eeff" opacity="0.8" />
          </Repeat>
        </>
      )
    case 'pluto':
      return (
        <>
          <rect x={-100} y={-100} width={400} height={200} fill="#d7c0a0" />
          <Repeat>
            {/* dark reddish-brown regions */}
            <path d="M-100,10 C-80,-5 -50,5 -35,25 C-45,45 -80,50 -100,40 Z" fill="#8f5f47" />
            <path d="M55,30 C70,20 95,28 100,40 L100,60 C80,62 62,55 55,30 Z" fill="#9b6b52" />
            <ellipse cx={-60} cy={-50} rx={22} ry={10} fill="#c4a785" />
            {/* the "heart" — Tombaugh Regio. Like the real one it is lopsided: a big,
                smooth, bright western lobe (Sputnik Planitia, nitrogen ice) and a
                smaller, rougher eastern lobe. */}
            <path d="M22,40 C10,33 -9,20 -8,-1 C-7,-19 6,-29 15,-23 C22,-18 24,-5 24,9 C24,22 24,32 22,40 Z" fill="#f7efe2" />
            <path d="M23,8 C23,-8 28,-21 37,-22 C47,-23 53,-13 50,-2 C47,11 35,25 22,40 Z" fill="#e8d8c2" />
            <ellipse cx={39} cy={-8} rx={4} ry={3} fill="#d6c2a6" />
            <ellipse cx={33} cy={6} rx={3} ry={2} fill="#d6c2a6" />
            <Craters list={[[-20, -60, 6], [70, -30, 5], [-75, 70, 6]]} fill="rgba(0,0,0,0.12)" />
          </Repeat>
        </>
      )
    default:
      return null
  }
}

function SaturnRings({ uid, tilt, part, silhouette }: { uid: string; tilt: number; part: 'back' | 'front'; silhouette?: boolean }) {
  const ry = 6 + Math.abs(tilt) * 34
  // Solid colours (no opacity) so the full back pass + clipped front pass join seamlessly
  const rings: [number, number, string][] = [
    [62, 6, '#8f7f63'],
    [72, 12, '#efdcae'],
    [86, 9, '#d6bf8e'],
    [95, 4, '#a8966f'],
  ]
  // seen from below, the near side of the rings is the upper half
  const clip = tilt < 0 ? 'back' : 'front'
  return (
    <g clipPath={part === 'front' ? `url(#${uid}-${clip})` : undefined}>
      {rings.map(([rx, w, c], i) => (
        <ellipse
          key={i}
          cx={0}
          cy={0}
          rx={rx}
          ry={(ry * rx) / 95}
          fill="none"
          stroke={silhouette ? '#000' : c}
          strokeWidth={w}
        />
      ))}
    </g>
  )
}

export function PlanetArt({
  id,
  size = '100%',
  spin = false,
  rotation,
  ringTilt = 0.55,
  silhouette = false,
  rays = false,
  className,
  style,
  title,
}: PlanetArtProps) {
  const uid = 'p' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const r = bodyRadius(id)
  const s = r / 100
  const texStyle: CSSProperties =
    rotation !== undefined
      ? { transform: `translateX(${-((((rotation % 1) + 1) % 1) * 200)}px)` }
      : spin
        ? { animation: `tex-scroll ${SPIN_SECONDS[id] ?? 30}s linear infinite` }
        : {}

  const body =
    id === 'sun' ? (
      <>
        <defs>
          <radialGradient id={`${uid}-sun`} cx="45%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#fffbe0" />
            <stop offset="45%" stopColor="#ffd84a" />
            <stop offset="85%" stopColor="#ffa41b" />
            <stop offset="100%" stopColor="#ff8a00" />
          </radialGradient>
          <radialGradient id={`${uid}-glow`}>
            <stop offset="55%" stopColor="#ffcf3f" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff9d00" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!silhouette && <circle r={100} fill={`url(#${uid}-glow)`} />}
        {rays && !silhouette && (
          <g style={spin ? { animation: 'ray-spin 60s linear infinite', transformOrigin: 'center' } : undefined}>
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d="M-7,-84 L0,-99 L7,-84 Z"
                fill="#ffd84a"
                opacity="0.9"
                transform={`rotate(${i * 30})`}
              />
            ))}
          </g>
        )}
        <circle r={r} fill={silhouette ? '#000' : `url(#${uid}-sun)`} />
        {!silhouette && (
          <>
            <circle cx={-25} cy={20} r={8} fill="#ffb21f" opacity="0.5" />
            <circle cx={30} cy={-18} r={5} fill="#ffb21f" opacity="0.45" />
            <circle cx={15} cy={40} r={6} fill="#ffe680" opacity="0.5" />
          </>
        )}
      </>
    ) : (
      <>
        <defs>
          <clipPath id={`${uid}-disk`}>
            <circle r={r} />
          </clipPath>
          <radialGradient id={`${uid}-shade`} cx="35%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0" />
            <stop offset="80%" stopColor="#000" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
          <radialGradient id={`${uid}-atmo`}>
            <stop offset="88%" stopColor={atmoColor(id)} stopOpacity="0" />
            <stop offset="96%" stopColor={atmoColor(id)} stopOpacity="0.45" />
            <stop offset="100%" stopColor={atmoColor(id)} stopOpacity="0" />
          </radialGradient>
          {id === 'saturn' && (
            <>
              <clipPath id={`${uid}-back`}>
                <rect x={-100} y={-100} width={200} height={100} />
              </clipPath>
              <clipPath id={`${uid}-front`}>
                <rect x={-100} y={0} width={200} height={100} />
              </clipPath>
            </>
          )}
        </defs>
        {id === 'saturn' && <SaturnRings uid={uid} tilt={ringTilt} part="back" silhouette={silhouette} />}
        {id === 'uranus' && !silhouette && (
          <ellipse rx={14} ry={96} fill="none" stroke="#c9f3f6" strokeWidth={2.5} opacity="0.55" />
        )}
        {!silhouette && atmoColor(id) !== 'none' && <circle r={r * 1.08} fill={`url(#${uid}-atmo)`} />}
        <g clipPath={`url(#${uid}-disk)`}>
          {silhouette ? (
            <circle r={r} fill="#000" />
          ) : (
            <g transform={`${id === 'uranus' ? 'rotate(90) ' : ''}scale(${s})`}>
              <g className="tex" style={texStyle}>
                <Texture id={id} />
              </g>
              {id === 'earth' && (
                <>
                  <ellipse cx={0} cy={-96} rx={60} ry={14} fill="#f4fbff" />
                  <ellipse cx={0} cy={97} rx={70} ry={14} fill="#f4fbff" />
                </>
              )}
              {id === 'mars' && <ellipse cx={0} cy={-94} rx={40} ry={12} fill="#fbf3ee" />}
            </g>
          )}
          {!silhouette && <circle r={r} fill={`url(#${uid}-shade)`} />}
        </g>
        {id === 'saturn' && <SaturnRings uid={uid} tilt={ringTilt} part="front" silhouette={silhouette} />}
        {id === 'uranus' && !silhouette && (
          <path d={`M0,${-96} A14,96 0 0 1 0,96`} fill="none" stroke="#c9f3f6" strokeWidth={2.5} opacity="0.7" />
        )}
      </>
    )

  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      className={className}
      style={{ overflow: 'visible', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {body}
    </svg>
  )
}

function atmoColor(id: BodyId): string {
  switch (id) {
    case 'earth':
      return '#8fd3ff'
    case 'venus':
      return '#ffe7a8'
    case 'uranus':
      return '#c9f8fb'
    case 'neptune':
      return '#8ba8ff'
    case 'jupiter':
      return '#f5dfb8'
    case 'saturn':
      return '#f6e4b0'
    case 'mars':
      return '#ffb08a'
    default:
      return 'none'
  }
}
