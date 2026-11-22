/**
 * Zizo (زيزو) — the funny robot sidekick. Original character, self-drawn SVG.
 * His mouth moves and he bounces only while ZIZO is the one speaking
 * (driven by the narrator's speaker state, not by guesswork).
 */
import { useNarrator } from '../audio'

export function Zizo({
  size = 96,
  talking,
  mood = 'happy',
  className = '',
  wave = false,
}: {
  size?: number
  talking?: boolean
  mood?: 'happy' | 'wow' | 'sleepy'
  className?: string
  wave?: boolean
}) {
  const { speaking, speaker, paused } = useNarrator()
  const isTalking = talking ?? (speaking && !paused && speaker === 'zizo')
  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={`${className} ${isTalking && talking === undefined ? 'zizo-talking' : ''}`}
      aria-hidden
      data-testid="zizo"
      data-talking={isTalking ? 'yes' : 'no'}
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
    </svg>
  )
}
