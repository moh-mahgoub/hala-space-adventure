import type { ReactNode } from 'react'

export interface ActivityProps {
  onDone: () => void
}

export const toArabicDigits = (n: number) => n.toLocaleString('ar-EG')

/** Big centered stage that keeps a square-ish play area. */
export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`}>{children}</div>
  )
}

/** Pulsing ring marking something tappable (never relies on colour alone: it pulses + has a label). */
export function TapHint({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`anim-pulse-glow pointer-events-none absolute inset-[-4%] rounded-full border-4 border-yellow-300 ${className}`}
    />
  )
}

/** Progress dots: filled = done. Shape + count, not colour only. */
export function ProgressDots({ total, done, label }: { total: number; done: number; label: string }) {
  return (
    <div
      className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-night-900/60 px-3 py-2"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
            i < done ? 'bg-yellow-300 text-night-900' : 'border-2 border-white/40'
          }`}
        >
          {i < done ? '★' : ''}
        </span>
      ))}
    </div>
  )
}
