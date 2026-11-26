/**
 * The little Mars robot car. Shared by the Mars planet activity (where the
 * child drives it: her face is in the bubble) and the story (where it is a
 * robot on its own: empty glass dome, blinking camera "eyes", and it can wave).
 */
import { ChildFace } from './character/ChildAvatar'

export function MarsRover({
  scanning = false,
  driver = true,
  waving = false,
}: {
  /** arm lowered towards a rock (activity) */
  scanning?: boolean
  /** the child is driving (her face in the bubble) */
  driver?: boolean
  /** arm raised and waving hello (story) */
  waving?: boolean
}) {
  const arm = waving
    ? { transformOrigin: '98px 40px', animation: 'rover-wave 0.5s ease-in-out infinite alternate' }
    : { transformOrigin: '98px 40px', transform: scanning ? 'rotate(35deg)' : 'rotate(0deg)', transition: 'transform .4s' }
  return (
    <svg viewBox="0 -12 120 92" className="h-full w-full overflow-visible" aria-hidden data-testid="mars-rover" data-waving={waving ? 'yes' : 'no'}>
      {/* bubble cockpit: the driver, or just glass when the rover is on its own */}
      <circle cx="46" cy="8" r="17" fill="rgba(170,215,255,0.35)" stroke="#e8eeff" strokeWidth="3" />
      {driver ? <ChildFace cx={46} cy={8} r={13} /> : <path d="M36,2 C39,-3 44,-5 49,-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />}
      {/* mast + camera "eyes" */}
      <rect x="78" y="4" width="6" height="30" rx="3" fill="#d9dde8" />
      <rect x="70" y="0" width="22" height="12" rx="4" fill="#f4f6ff" />
      <g style={driver ? undefined : { transformOrigin: '81px 6px', animation: 'blink 3.5s infinite' }}>
        <circle cx="76" cy="6" r="3" fill="#5ecbff" />
        <circle cx="86" cy="6" r="3" fill="#5ecbff" />
      </g>
      {/* body */}
      <rect x="18" y="30" width="80" height="22" rx="6" fill="#f2f2f5" />
      <rect x="24" y="24" width="50" height="10" rx="3" fill="#3b4a8a" />
      <rect x="28" y="26" width="10" height="6" fill="#5b6fd0" />
      <rect x="42" y="26" width="10" height="6" fill="#5b6fd0" />
      <rect x="56" y="26" width="10" height="6" fill="#5b6fd0" />
      {/* arm */}
      <g style={arm}>
        <rect x="96" y="38" width="20" height="5" rx="2" fill="#d9dde8" />
        <circle cx="116" cy="40" r="4" fill="#ffd84a" />
      </g>
      {/* wheels */}
      {[28, 58, 88].map((x) => (
        <g key={x}>
          <circle cx={x} cy={64} r={11} fill="#3b3b46" />
          <circle cx={x} cy={64} r={4} fill="#9aa0b5" />
        </g>
      ))}
      <rect x="22" y="50" width="72" height="6" rx="3" fill="#bfc4d6" />
    </svg>
  )
}
