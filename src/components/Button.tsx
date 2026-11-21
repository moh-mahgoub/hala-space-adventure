import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { sfx } from '../audio'

export interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  /** visible text under the icon */
  showLabel?: boolean
  tone?: 'violet' | 'sun' | 'mint' | 'sky' | 'candy' | 'glass'
  size?: 'md' | 'lg'
  pulse?: boolean
}

const TONES: Record<NonNullable<RoundButtonProps['tone']>, string> = {
  violet: 'bg-gradient-to-b from-violet-400 to-violet-600 shadow-violet-900/50',
  sun: 'bg-gradient-to-b from-amber-300 to-orange-500 shadow-orange-900/50 text-night-900',
  mint: 'bg-gradient-to-b from-emerald-300 to-teal-500 shadow-teal-900/50 text-night-900',
  sky: 'bg-gradient-to-b from-sky-300 to-blue-500 shadow-blue-900/50',
  candy: 'bg-gradient-to-b from-pink-300 to-fuchsia-500 shadow-fuchsia-900/50',
  glass: 'glass shadow-black/30',
}

/** Large round touch button: ≥ 64px target, accessible name, tap sound. */
export function RoundButton({
  label,
  icon,
  showLabel,
  tone = 'glass',
  size = 'md',
  pulse,
  className = '',
  onClick,
  ...rest
}: RoundButtonProps) {
  const dim = size === 'lg' ? 'h-20 w-20 text-4xl' : 'h-16 w-16 text-3xl'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`btn-pop relative inline-flex shrink-0 flex-col items-center justify-center gap-1 ${className}`}
      onClick={(e) => {
        sfx('tap')
        onClick?.(e)
      }}
      {...rest}
    >
      <span
        className={`relative flex items-center justify-center rounded-full shadow-lg ${dim} ${TONES[tone]}`}
      >
        {pulse && <span className="anim-pulse-glow absolute inset-[-6px] rounded-full border-4 border-yellow-300" />}
        {icon}
      </span>
      {showLabel && <span className="text-base font-bold leading-none text-shadow">{label}</span>}
    </button>
  )
}
