import { memo, useMemo } from 'react'

/** Deterministic pseudo-random so the sky looks the same on every render */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Twinkling starfield. Three groups twinkle out of phase (cheap: 3 animated nodes). */
export const Starfield = memo(function Starfield({ count = 140, seed = 7 }: { count?: number; seed?: number }) {
  const groups = useMemo(() => {
    const r = rng(seed)
    const g: { x: number; y: number; s: number; c: string }[][] = [[], [], [], []]
    const colors = ['#ffffff', '#fff4d6', '#dfe7ff', '#ffe1f0']
    for (let i = 0; i < count; i++) {
      g[i % 4].push({ x: r() * 100, y: r() * 100, s: 0.06 + r() * 0.18, c: colors[Math.floor(r() * 4)] })
    }
    return g
  }, [count, seed])
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {groups.map((stars, gi) => (
        <g
          key={gi}
          className={gi === 0 ? undefined : 'anim-twinkle'}
          style={gi === 0 ? { opacity: 0.8 } : { animationDelay: `${gi * 0.9}s`, animationDuration: `${2.8 + gi}s` }}
        >
          {stars.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.s} fill={st.c} />
          ))}
        </g>
      ))}
    </svg>
  )
})
