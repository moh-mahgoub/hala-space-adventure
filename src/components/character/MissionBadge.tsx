/** An explorer badge featuring the child's face (or the illustrated astronaut). */
import { ChildFace } from './ChildAvatar'

export function MissionBadge({ icon, title, earned, size = 96 }: { icon: string; title: string; earned: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 100 120" width={size} height={(size * 120) / 100} role="img" aria-label={title} data-testid="mission-badge" style={{ overflow: 'visible' }}>
      {/* ribbons */}
      <path d="M30,70 L18,116 L34,106 L42,118 L50,76 Z" fill={earned ? '#ff6fae' : '#555a7a'} />
      <path d="M70,70 L82,116 L66,106 L58,118 L50,76 Z" fill={earned ? '#8b5cf6' : '#4a4e6b'} />
      {/* medal */}
      <circle cx={50} cy={46} r={42} fill={earned ? '#ffd84a' : '#3a3e5e'} />
      <circle cx={50} cy={46} r={42} fill="none" stroke={earned ? '#ffb21f' : '#2b2f4d'} strokeWidth={5} strokeDasharray="6 5" />
      <circle cx={50} cy={46} r={32} fill={earned ? '#23286b' : '#2b2f4d'} />
      {earned ? (
        <ChildFace cx={50} cy={46} r={27} />
      ) : (
        <text x={50} y={58} textAnchor="middle" fontSize={32} opacity={0.6}>
          🔒
        </text>
      )}
      <circle cx={80} cy={14} r={15} fill={earned ? '#fff' : '#3a3e5e'} stroke={earned ? '#ffd84a' : '#2b2f4d'} strokeWidth={3} />
      <text x={80} y={20} textAnchor="middle" fontSize={16} opacity={earned ? 1 : 0.4}>
        {icon}
      </text>
    </svg>
  )
}
