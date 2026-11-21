/** A small, round, smiling alien who peeks out and waves. Never scary. */
export function FriendlyAlien({ size = 70 }: { size?: number }) {
  return (
    <svg viewBox="0 0 80 90" width={size} height={(size * 90) / 80} aria-hidden style={{ overflow: 'visible' }}>
      <line x1={28} y1={18} x2={20} y2={4} stroke="#4ee6b4" strokeWidth={4} strokeLinecap="round" />
      <line x1={52} y1={18} x2={60} y2={4} stroke="#4ee6b4" strokeWidth={4} strokeLinecap="round" />
      <circle cx={20} cy={4} r={5} fill="#ffd84a" />
      <circle cx={60} cy={4} r={5} fill="#ff6fae" />
      <ellipse cx={40} cy={44} rx={30} ry={28} fill="#7cf0c4" />
      <ellipse cx={40} cy={80} rx={20} ry={12} fill="#5fd9ad" />
      <circle cx={30} cy={40} r={8} fill="#fff" />
      <circle cx={50} cy={40} r={8} fill="#fff" />
      <circle cx={31} cy={41} r={4} fill="#23286b" />
      <circle cx={51} cy={41} r={4} fill="#23286b" />
      <circle cx={22} cy={52} r={4} fill="#ff9fb8" opacity={0.7} />
      <circle cx={58} cy={52} r={4} fill="#ff9fb8" opacity={0.7} />
      <path d="M32,56 q8,8 16,0" stroke="#23286b" strokeWidth={3} fill="none" strokeLinecap="round" />
      <g style={{ transformOrigin: '70px 60px', transformBox: 'view-box', animation: 'wiggle 0.6s ease-in-out infinite' }}>
        <path d="M66,62 C74,56 78,48 76,40" stroke="#7cf0c4" strokeWidth={8} strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}
