/**
 * Zizo (زيزو) — the funny robot sidekick. Original character, self-drawn SVG.
 * His mouth moves and he bounces only while ZIZO is the one speaking
 * (driven by the narrator's speaker state, not by guesswork).
 */
import { useNarrator } from '../audio'
import { useRoute } from '../router'

export type ZizoOutfit = 'none' | 'winter'

/** Cold places get Zizo's winter gear (scarf + earmuffs) — Pluto is very, very cold. */
export function outfitForRoute(route: ReturnType<typeof useRoute>): ZizoOutfit {
  return route.name === 'planet' && route.id === 'pluto' ? 'winter' : 'none'
}

export function Zizo({
  size = 96,
  talking,
  mood = 'happy',
  className = '',
  wave = false,
  outfit,
}: {
  size?: number
  talking?: boolean
  mood?: 'happy' | 'wow' | 'sleepy'
  className?: string
  wave?: boolean
  /** default: chosen by the current screen (winter on Pluto) */
  outfit?: ZizoOutfit
}) {
  const { speaking, speaker, paused } = useNarrator()
  const isTalking = talking ?? (speaking && !paused && speaker === 'zizo')
  const route = useRoute()
  const wear = outfit ?? outfitForRoute(route)
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={`${className} ${isTalking && talking === undefined ? 'zizo-talking' : ''}`}
      aria-hidden
      data-testid="zizo"
      data-talking={isTalking ? 'yes' : 'no'}
      data-outfit={wear}
    >
      <defs>
        <linearGradient id="zizo-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6ff" />
          <stop offset="1" stopColor="#b9c3ec" />
        </linearGradient>
        <linearGradient id="zizo-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23286b" />
          <stop offset="1" stopColor="#11143d" />
        </linearGradient>
      </defs>
      {/* antenna */}
      <line x1="60" y1="18" x2="60" y2="6" stroke="#b9c3ec" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="6" r="6" fill="#ffd84a" className="anim-twinkle" />
      {/* arms */}
      <g style={wave ? { transformOrigin: '18px 92px', animation: 'wiggle 0.6s ease-in-out infinite' } : undefined}>
        <rect x="6" y="82" width="16" height="30" rx="8" fill="#c9d1f3" transform={wave ? 'rotate(-140 14 90)' : undefined} />
      </g>
      <rect x="98" y="82" width="16" height="30" rx="8" fill="#c9d1f3" />
      {/* body */}
      <rect x="22" y="76" width="76" height="52" rx="22" fill="url(#zizo-body)" />
      <circle cx="60" cy="102" r="9" fill="#ff6fae" />
      <circle cx="60" cy="102" r="4" fill="#ffd1e6" />
      {/* head */}
      <rect x="14" y="18" width="92" height="64" rx="28" fill="url(#zizo-body)" />
      <rect x="24" y="27" width="72" height="46" rx="20" fill="url(#zizo-screen)" />
      {/* eyes */}
      <g style={{ transformOrigin: '60px 46px', animation: 'blink 4.5s infinite' }}>
        {mood === 'sleepy' ? (
          <>
            <path d="M38 47 q6 5 12 0" stroke="#7ef0ff" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M70 47 q6 5 12 0" stroke="#7ef0ff" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="44" cy="46" rx="7" ry={mood === 'wow' ? 9 : 8} fill="#7ef0ff" />
            <ellipse cx="76" cy="46" rx="7" ry={mood === 'wow' ? 9 : 8} fill="#7ef0ff" />
            <circle cx="46" cy="43" r="2.5" fill="#fff" />
            <circle cx="78" cy="43" r="2.5" fill="#fff" />
          </>
        )}
      </g>
      {/* cheeks */}
      <circle cx="32" cy="60" r="4" fill="#ff6fae" opacity="0.6" />
      <circle cx="88" cy="60" r="4" fill="#ff6fae" opacity="0.6" />
      {/* mouth */}
      {isTalking ? (
        <ellipse
          cx="60"
          cy="62"
          rx="8"
          ry="5"
          fill="#7ef0ff"
          style={{ transformOrigin: '60px 62px', animation: 'talk 0.32s ease-in-out infinite' }}
        />
      ) : mood === 'wow' ? (
        <circle cx="60" cy="62" r="5" fill="#7ef0ff" />
      ) : (
        <path d="M50 59 q10 9 20 0" stroke="#7ef0ff" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {wear === 'winter' && <WinterGear />}
    </svg>
  )
}

/** An oversized striped scarf and fluffy earmuffs — pops on with a little bounce. */
function WinterGear() {
  return (
    <g data-testid="zizo-winter" className="anim-pop" style={{ transformOrigin: '60px 80px' }}>
      {/* earmuffs */}
      <path d="M14 46 C14 4 106 4 106 46" stroke="#ff6fae" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="50" r="12" fill="#fff" />
      <circle cx="12" cy="50" r="8" fill="#ff8fc0" />
      <circle cx="108" cy="50" r="12" fill="#fff" />
      <circle cx="108" cy="50" r="8" fill="#ff8fc0" />
      {/* scarf: wrap + a long tail */}
      <rect x="70" y="82" width="15" height="34" rx="6" fill="#ff9a3d" transform="rotate(-8 77 82)" />
      <path d="M72 108 l2 10 M78 108 l1 10 M84 107 l0 10" stroke="#ffd84a" strokeWidth="3" strokeLinecap="round" transform="rotate(-8 77 82)" />
      <rect x="20" y="76" width="80" height="14" rx="7" fill="#ff9a3d" />
      <path d="M36 77 v12 M52 77 v12 M68 77 v12 M84 77 v12" stroke="#ffd84a" strokeWidth="4" />
    </g>
  )
}
