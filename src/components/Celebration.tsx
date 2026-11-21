import { useEffect, useMemo } from 'react'
import { sfx } from '../audio'
import { useReducedMotion } from '../hooks'

const COLORS = ['#ffd84a', '#ff6fae', '#4ee6b4', '#5ecbff', '#a78bfa', '#ffffff']

/** Gentle confetti + stars. In reduced-motion mode: a static burst of stars. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const reduced = useReducedMotion()
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.4 + Math.random() * 1.6,
        dx: (Math.random() - 0.5) * 30 + 'vw',
        color: COLORS[i % COLORS.length],
        star: i % 3 === 0,
        size: 10 + Math.random() * 14,
      })),
    [pieces],
  )
  if (reduced) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center gap-6 pt-10 text-5xl" aria-hidden>
        <span>⭐</span>
        <span>✨</span>
        <span>⭐</span>
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.star ? p.size : p.size * 0.5,
            background: p.star ? 'transparent' : p.color,
            color: p.color,
            borderRadius: 3,
            fontSize: p.size,
            lineHeight: 1,
            animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
            ['--dx' as string]: p.dx,
          }}
        >
          {p.star ? '★' : ''}
        </span>
      ))}
    </div>
  )
}

/** Full-screen celebration overlay. Tap anywhere to close. */
export function Celebration({
  title,
  icon = '🏆',
  onClose,
  children,
}: {
  title: string
  icon?: string
  onClose: () => void
  children?: React.ReactNode
}) {
  useEffect(() => {
    sfx('celebrate')
  }, [])
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-night-950/70 p-6"
      onClick={onClose}
    >
      <Confetti pieces={50} />
      <div className="anim-pop relative flex max-w-lg flex-col items-center gap-4 rounded-[2.5rem] border-4 border-yellow-300/70 bg-gradient-to-b from-violet-700 to-night-800 px-8 py-8 text-center shadow-2xl">
        <div className="anim-bounce text-8xl" aria-hidden>
          {icon}
        </div>
        <h2 className="text-4xl font-extrabold text-yellow-200 text-shadow">{title}</h2>
        {children}
        <button
          type="button"
          className="btn-pop mt-2 rounded-full bg-gradient-to-b from-emerald-300 to-teal-500 px-10 py-3 text-2xl font-extrabold text-night-900 shadow-lg"
          onClick={onClose}
        >
          هيييه! 🎉
        </button>
      </div>
    </div>
  )
}
