/**
 * The child's face, wherever it appears. One component decides between:
 *   default  → the illustrated girl (no photo needed)
 *   photo    → her real, cropped face
 *   sticker  → her face with a thick, colourful sticker outline
 *   cartoon  → an imported cartoon portrait (made elsewhere — we don't fake "AI cartoons")
 */
import { useId } from 'react'
import { useChildLook, type ChildLook } from '../../profile/profile'

/** Illustrated default face, drawn for a circle of radius 22 centred at (0,0). */
function DefaultFaceArt() {
  return (
    <g>
      <path d="M-28,0 C-30,-24 30,-24 28,0 C30,18 22,26 18,22 L-18,22 C-22,26 -30,18 -28,0 Z" fill="#4a2c1f" />
      <circle r={22} fill="#f1c7a3" />
      <path d="M-22,-6 C-18,-22 16,-24 22,-8 C12,-14 0,-10 -8,-14 C-12,-10 -18,-8 -22,-6 Z" fill="#5a3726" />
      <circle cx={-26} cy={8} r={8} fill="#4a2c1f" />
      <circle cx={26} cy={8} r={8} fill="#4a2c1f" />
      <circle cx={-24} cy={1} r={3} fill="#ff6fae" />
      <circle cx={24} cy={1} r={3} fill="#ff6fae" />
      <ellipse cx={-8} cy={1} rx={3} ry={3.6} fill="#2b1a12" />
      <ellipse cx={8} cy={1} rx={3} ry={3.6} fill="#2b1a12" />
      <circle cx={-7} cy={0} r={1} fill="#fff" />
      <circle cx={9} cy={0} r={1} fill="#fff" />
      <circle cx={-13} cy={8} r={3} fill="#ff9fb8" opacity="0.6" />
      <circle cx={13} cy={8} r={3} fill="#ff9fb8" opacity="0.6" />
      <path d="M-6,10 q6,6 12,0" stroke="#b5523b" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </g>
  )
}

/**
 * SVG fragment: the face in a circle of radius r at (cx, cy).
 * Pass `look` to override (e.g. style previews in the parent panel).
 */
export function ChildFace({ cx, cy, r, look: override }: { cx: number; cy: number; r: number; look?: ChildLook }) {
  const live = useChildLook()
  const look = override ?? live
  const uid = 'cf' + useId().replace(/[^a-zA-Z0-9]/g, '')
  if (!look.faceUrl) {
    return (
      <g transform={`translate(${cx} ${cy}) scale(${r / 26})`} data-child-face="default">
        <DefaultFaceArt />
      </g>
    )
  }
  const sticker = look.style === 'sticker'
  return (
    <g data-child-face={look.style}>
      <defs>
        <clipPath id={uid}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {sticker && (
        <>
          <circle cx={cx} cy={cy} r={r + r * 0.32} fill="#ff6fae" />
          <circle cx={cx} cy={cy} r={r + r * 0.18} fill="#fff" />
        </>
      )}
      <circle cx={cx} cy={cy} r={r} fill="#f1c7a3" />
      <image
        href={look.faceUrl}
        x={cx - r}
        y={cy - r}
        width={r * 2}
        height={r * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${uid})`}
      />
      {sticker && (
        <>
          <text x={cx + r * 0.9} y={cy - r * 0.8} fontSize={r * 0.55} textAnchor="middle">
            ⭐
          </text>
          <text x={cx - r * 0.95} y={cy + r * 1.05} fontSize={r * 0.45} textAnchor="middle">
            💖
          </text>
        </>
      )}
    </g>
  )
}

/** Standalone round avatar (badges, reactions, small UI). */
export function ChildAvatar({
  size = 64,
  ring = '#ffe066',
  className = '',
  look,
  title,
}: {
  size?: number
  ring?: string
  className?: string
  look?: ChildLook
  title?: string
}) {
  return (
    <svg
      viewBox="-40 -40 80 80"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ overflow: 'visible' }}
    >
      <circle r={36} fill="#23286b" stroke={ring} strokeWidth={4} />
      <ChildFace cx={0} cy={0} r={30} look={look} />
    </svg>
  )
}
