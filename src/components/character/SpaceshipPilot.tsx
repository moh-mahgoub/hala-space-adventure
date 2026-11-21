/**
 * The spaceship with the child's face looking out of the cockpit window.
 * `wobble` gently shakes it (takeoff); `launching` flies it up and away.
 */
import { ChildFace } from './ChildAvatar'

export function SpaceshipPilot({
  launching,
  wobble,
  glow,
  onTap,
  className = '',
  height = '100%',
  pilot = true,
}: {
  /** false = empty cockpit (she hasn't boarded yet / she's outside) */
  pilot?: boolean
  launching?: boolean
  wobble?: boolean
  glow?: boolean
  onTap?: () => void
  className?: string
  height?: number | string
}) {
  const art = (
    <svg viewBox="0 0 100 160" style={{ height, overflow: 'visible' }} aria-hidden data-testid="spaceship-pilot">
      <g style={wobble ? { transformOrigin: '50px 130px', transformBox: 'view-box', animation: 'ship-wobble 0.6s ease-in-out 3' } : undefined}>
        <path d="M50,4 C78,30 80,80 72,118 L28,118 C20,80 22,30 50,4 Z" fill="#f4f6ff" />
        <path d="M50,4 C62,14 70,28 74,44 L26,44 C30,28 38,14 50,4 Z" fill="#ff6fae" />
        <circle cx={50} cy={70} r={19} fill="#23286b" />
        {pilot && <ChildFace cx={50} cy={70} r={15} />}
        <circle cx={50} cy={70} r={19} fill="none" stroke="#c9d1f3" strokeWidth={5} />
        <path d="M38,60 C41,55 46,53 50,53" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.7} />
        <path d="M28,96 L8,128 L28,122 Z" fill="#8b5cf6" />
        <path d="M72,96 L92,128 L72,122 Z" fill="#8b5cf6" />
        <path d="M36,118 L64,118 L58,132 L42,132 Z" fill="#c9d1f3" />
        {(launching || wobble) && <path d="M40,132 L50,158 L60,132 Z" fill="#ffb21f" className="anim-twinkle" />}
      </g>
    </svg>
  )
  const style = launching ? { animation: 'launch 2.2s 1.2s ease-in forwards' } : undefined
  if (onTap) {
    return (
      <button type="button" onClick={onTap} aria-label="سفينة الفضاء" data-testid="story-target" className={`relative h-full ${className}`} style={style}>
        {glow && <span className="anim-pulse-glow absolute inset-[-8%] rounded-full border-4 border-yellow-300" aria-hidden />}
        {art}
      </button>
    )
  }
  return (
    <div className={`relative h-full ${className}`} style={style}>
      {glow && <span className="anim-pulse-glow absolute inset-[-8%] rounded-full border-4 border-yellow-300" aria-hidden />}
      {art}
    </div>
  )
}
