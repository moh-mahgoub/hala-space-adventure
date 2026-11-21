/**
 * حلا as an astronaut: an illustrated body + her face (photo, sticker or
 * imported cartoon) inside the helmet. Poses are pure CSS transform
 * animations — cheap enough for older iPads.
 */
import type { CSSProperties } from 'react'
import { useChildLook, type ChildLook } from '../../profile/profile'
import { ChildFace } from './ChildAvatar'

export type Pose = 'stand' | 'wave' | 'cheer' | 'dance' | 'float' | 'flag' | 'peek'

export interface AstronautProps {
  /** px width, or a CSS length like '100%' (height follows the aspect ratio) */
  size?: number | string
  pose?: Pose
  /** surprise: comically oversized helmet */
  bigHelmet?: boolean
  /** surprise: floating upside down */
  upsideDown?: boolean
  helmet?: boolean
  className?: string
  style?: CSSProperties
  look?: ChildLook
  title?: string
}

const SUIT = { base: '#f4f6ff', shade: '#d9def5', accent: '#8b5cf6', accent2: '#ffd84a' }
const STICKER_SUIT = { base: '#ffe1f0', shade: '#ffc2df', accent: '#ff6fae', accent2: '#4ee6b4' }

export function AstronautCharacter({
  size = 120,
  pose = 'stand',
  bigHelmet = false,
  upsideDown = false,
  helmet = true,
  className = '',
  style,
  look: override,
  title,
}: AstronautProps) {
  const live = useChildLook()
  const look = override ?? live
  const sticker = look.style === 'sticker'
  const c = sticker ? STICKER_SUIT : SUIT
  return (
    <svg
      viewBox="0 0 120 170"
      width={size}
      height={typeof size === 'number' ? (size * 170) / 120 : undefined}
      className={className}
      style={{ overflow: 'visible', ...style }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-testid="astronaut"
      data-look={look.style}
      data-pose={pose}
    >
      <g className={`astro-flip ${upsideDown ? 'astro-upside' : ''}`}>
      <g className={`astro astro-${pose}`}>
        {sticker && (
          // the white die-cut "sticker" edge with a colourful outline
          <path
            d="M60,4 C100,4 116,30 112,66 C126,80 118,104 104,108 L104,162 C104,168 16,168 16,162 L16,108 C2,104 -6,80 8,66 C4,30 20,4 60,4 Z"
            fill="#fff"
            stroke="#8b5cf6"
            strokeWidth={4}
            strokeDasharray="10 6"
          />
        )}
        {/* backpack */}
        <rect x={30} y={82} width={60} height={48} rx={12} fill={c.shade} />
        {/* legs */}
        <rect x={40} y={128} width={16} height={30} rx={7} fill={c.base} />
        <rect x={64} y={128} width={16} height={30} rx={7} fill={c.base} />
        <rect x={37} y={152} width={22} height={12} rx={6} fill={c.accent} />
        <rect x={61} y={152} width={22} height={12} rx={6} fill={c.accent} />
        {/* body */}
        <rect x={34} y={80} width={52} height={56} rx={20} fill={c.base} />
        <rect x={48} y={96} width={24} height={16} rx={5} fill={c.accent} />
        <circle cx={55} cy={104} r={3} fill={c.accent2} />
        <circle cx={65} cy={104} r={3} fill="#5ecbff" />
        {/* arms */}
        <g className="astro-arm-l">
          <rect x={18} y={84} width={18} height={38} rx={9} fill={c.base} />
          <circle cx={27} cy={122} r={8} fill={c.accent} />
        </g>
        <g className="astro-arm-r">
          <rect x={84} y={84} width={18} height={38} rx={9} fill={c.base} />
          <circle cx={93} cy={122} r={8} fill={c.accent} />
          {pose === 'flag' && (
            <g>
              <rect x={91} y={64} width={4} height={64} rx={2} fill="#9aa0b5" />
              <path d="M95,64 L122,72 L95,82 Z" fill="#ff6fae" />
              <text x={103} y={77} fontSize={8} fill="#fff">
                ★
              </text>
            </g>
          )}
        </g>
        {/* head + helmet */}
        <g className={`astro-helmet ${bigHelmet ? 'astro-helmet-big' : ''}`}>
          {sticker && helmet && (
            <g>
              <path d="M44,22 C40,10 36,6 30,4" stroke={c.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
              <path d="M76,22 C80,10 84,6 90,4" stroke={c.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
              <circle cx={30} cy={4} r={5} fill={c.accent2} />
              <circle cx={90} cy={4} r={5} fill="#5ecbff" />
            </g>
          )}
          {helmet && <circle cx={60} cy={50} r={36} fill="rgba(150,200,255,0.25)" />}
          <ChildFace cx={60} cy={50} r={look.faceUrl ? 27 : 26} look={look} />
          {helmet && (
            <>
              <circle cx={60} cy={50} r={36} fill="none" stroke={sticker ? c.accent : '#dfe9ff'} strokeWidth={5} />
              <path d="M36,32 C42,22 52,17 62,16" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.75} />
              <rect x={42} y={82} width={36} height={8} rx={4} fill={c.shade} />
            </>
          )}
        </g>
      </g>
      </g>
    </svg>
  )
}
