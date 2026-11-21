/** A little girl astronaut — original, generic SVG character for the story & explorer. */
export function HalaAvatar({ size = 90, helmet = true, className = '' }: { size?: number; helmet?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 120" width={size} height={(size * 120) / 100} className={className} aria-hidden>
      {/* suit */}
      <rect x="24" y="66" width="52" height="46" rx="20" fill="#f3f4ff" />
      <rect x="40" y="78" width="20" height="14" rx="4" fill="#8b5cf6" />
      <circle cx="45" cy="85" r="2.5" fill="#ffd84a" />
      <circle cx="55" cy="85" r="2.5" fill="#4ee6b4" />
      <rect x="14" y="70" width="14" height="30" rx="7" fill="#e3e6fb" />
      <rect x="72" y="70" width="14" height="30" rx="7" fill="#e3e6fb" />
      {/* hair back */}
      <path d="M22 44 C20 20 80 20 78 44 C80 62 72 70 68 66 L32 66 C28 70 20 62 22 44 Z" fill="#4a2c1f" />
      {/* face */}
      <circle cx="50" cy="44" r="22" fill="#f1c7a3" />
      {/* bangs */}
      <path d="M28 38 C32 22 66 20 72 36 C62 30 50 34 42 30 C38 34 32 36 28 38 Z" fill="#5a3726" />
      {/* pigtails */}
      <circle cx="24" cy="52" r="8" fill="#4a2c1f" />
      <circle cx="76" cy="52" r="8" fill="#4a2c1f" />
      <circle cx="26" cy="45" r="3" fill="#ff6fae" />
      <circle cx="74" cy="45" r="3" fill="#ff6fae" />
      {/* eyes */}
      <ellipse cx="42" cy="45" rx="3" ry="3.6" fill="#2b1a12" />
      <ellipse cx="58" cy="45" rx="3" ry="3.6" fill="#2b1a12" />
      <circle cx="43" cy="44" r="1" fill="#fff" />
      <circle cx="59" cy="44" r="1" fill="#fff" />
      <circle cx="37" cy="52" r="3" fill="#ff9fb8" opacity="0.6" />
      <circle cx="63" cy="52" r="3" fill="#ff9fb8" opacity="0.6" />
      <path d="M44 54 q6 6 12 0" stroke="#b5523b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {helmet && (
        <>
          <circle cx="50" cy="44" r="33" fill="rgba(180,220,255,0.18)" stroke="#dfe9ff" strokeWidth="4" />
          <path d="M30 28 C36 18 46 15 54 15" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
        </>
      )}
    </svg>
  )
}
