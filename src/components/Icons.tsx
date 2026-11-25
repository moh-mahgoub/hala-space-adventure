/** Simple, bold, self-made SVG icons (stroke = currentColor). */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  viewBox: '0 0 48 48',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 4.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const HomeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 22 24 8l17 14" />
    <path d="M12 19v20h24V19" />
    <path d="M20 39V28h8v11" />
  </svg>
)
/** Points to the right (= "back" in RTL) */
export const BackIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 10l14 14-14 14" />
  </svg>
)
/** Points to the left (= "next" in RTL) */
export const NextIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M30 10 16 24l14 14" />
  </svg>
)
export const SpeakerIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 19h8l10-8v26l-10-8H8z" fill="currentColor" stroke="none" />
    <path d="M32 17c3 3 3 11 0 14" />
    <path d="M37 12c6 6 6 18 0 24" />
  </svg>
)
export const MuteIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 19h8l10-8v26l-10-8H8z" fill="currentColor" stroke="none" />
    <path d="M33 19l9 10M42 19l-9 10" />
  </svg>
)
export const ReplayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M38 24a14 14 0 1 1-4.1-9.9" />
    <path d="M35 6v9h-9" />
    <path d="M20 17l10 7-10 7z" fill="currentColor" strokeWidth={2} />
  </svg>
)
export const StarIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.5, ...p })}>
    <path
      d="M24 5l5.6 11.6 12.7 1.7-9.3 8.8 2.3 12.6L24 33.6l-11.3 6.1 2.3-12.6-9.3-8.8 12.7-1.7z"
      fill="currentColor"
    />
  </svg>
)
/** A solid cog (square teeth + hole) — clearly "settings", not a sun with rays. */
export const GearIcon = (p: P) => (
  <svg {...base({ stroke: 'none', fill: 'currentColor', ...p })}>
    <path fillRule="evenodd" d="M20.40 8.41 L20.82 2.74 L27.18 2.74 L27.60 8.41 A16 16 0 0 1 32.48 10.43 L36.79 6.72 L41.28 11.21 L37.57 15.52 A16 16 0 0 1 39.59 20.40 L45.26 20.82 L45.26 27.18 L39.59 27.60 A16 16 0 0 1 37.57 32.48 L41.28 36.79 L36.79 41.28 L32.48 37.57 A16 16 0 0 1 27.60 39.59 L27.18 45.26 L20.82 45.26 L20.40 39.59 A16 16 0 0 1 15.52 37.57 L11.21 41.28 L6.72 36.79 L10.43 32.48 A16 16 0 0 1 8.41 27.60 L2.74 27.18 L2.74 20.82 L8.41 20.40 A16 16 0 0 1 10.43 15.52 L6.72 11.21 L11.21 6.72 L15.52 10.43 A16 16 0 0 1 20.40 8.41 Z M30.5 24 A6.5 6.5 0 1 0 17.5 24 A6.5 6.5 0 1 0 30.5 24 Z" />
  </svg>
)
export const FullscreenIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 18V8h10M30 8h10v10M40 30v10H30M18 40H8V30" />
  </svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 12l24 24M36 12 12 36" />
  </svg>
)
export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M32 10 12 24l20 14z" fill="currentColor" />
  </svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 25l9 9 19-20" />
  </svg>
)
