import { useRef, useState } from 'react'
import { line, narrator, sfx } from '../audio'
import { ChildFace } from '../components/character/ChildAvatar'
import { react } from '../profile/reactions'
import { useTimeouts } from '../hooks'
import { ProgressDots, type ActivityProps } from './common'

/** x positions (% of width) of the three things to inspect */
const TARGETS = [
  { x: 28, label: 'صخرة حمرا', kind: 'rock' as const },
  { x: 52, label: 'صخرة بطبقات', kind: 'layers' as const },
  { x: 80, label: 'البركان', kind: 'volcano' as const },
]

function Rover({ scanning }: { scanning: boolean }) {
  return (
    <svg viewBox="0 -12 120 92" className="h-full w-full overflow-visible" aria-hidden>
      {/* bubble cockpit with the driver */}
      <circle cx="46" cy="8" r="17" fill="rgba(170,215,255,0.35)" stroke="#e8eeff" strokeWidth="3" />
      <ChildFace cx={46} cy={8} r={13} />
      {/* mast + camera */}
      <rect x="78" y="4" width="6" height="30" rx="3" fill="#d9dde8" />
      <rect x="70" y="0" width="22" height="12" rx="4" fill="#f4f6ff" />
      <circle cx="76" cy="6" r="3" fill="#5ecbff" />
      <circle cx="86" cy="6" r="3" fill="#5ecbff" />
      {/* body */}
      <rect x="18" y="30" width="80" height="22" rx="6" fill="#f2f2f5" />
      <rect x="24" y="24" width="50" height="10" rx="3" fill="#3b4a8a" />
      <rect x="28" y="26" width="10" height="6" fill="#5b6fd0" />
      <rect x="42" y="26" width="10" height="6" fill="#5b6fd0" />
      <rect x="56" y="26" width="10" height="6" fill="#5b6fd0" />
      {/* arm */}
      <g style={{ transformOrigin: '98px 40px', transform: scanning ? 'rotate(35deg)' : 'rotate(0deg)', transition: 'transform .4s' }}>
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

export function MarsActivity({ onDone }: ActivityProps) {
  const [roverX, setRoverX] = useState(8)
  const [checked, setChecked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const checkedRef = useRef<number[]>([])
  const later = useTimeouts()

  const drives = useRef(0)
  const go = (i: number) => {
    if (busy) return
    setBusy(true)
    sfx('whoosh')
    // first drive: she cheers from the driver's seat, then the rock is explained
    const intro = drives.current++ === 0 ? narrator.say(react('rover')) : Promise.resolve(true)
    setRoverX(TARGETS[i].x - 9)
    later(() => {
      sfx('star')
      const spoken = intro.then(() => narrator.say(line(`planets.mars.activity.steps.${i}`)))
      const c = checkedRef.current
      if (!c.includes(i)) {
        const next = [...c, i]
        checkedRef.current = next
        setChecked(next)
        if (next.length === TARGETS.length) void spoken.then(() => onDone())
      }
      later(() => setBusy(false), 600)
    }, 1300)
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[2rem]"
      style={{ background: 'linear-gradient(180deg,#e9b98c 0%,#d99266 45%,#c77048 60%)' }}
    >
      {/* distant Sun — on Mars the daytime sky is butterscotch */}
      <div className="absolute top-[8%] left-[10%] h-10 w-10 rounded-full bg-yellow-100 opacity-90 shadow-[0_0_30px_10px_rgba(255,240,200,0.7)]" aria-hidden />
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[75%] w-full" aria-hidden>
        {/* Olympus Mons: a huge, gently sloped shield volcano */}
        <path d="M230,120 C270,40 330,40 380,120 Z" fill="#b8613c" />
        <path d="M295,62 C305,55 315,55 325,62 Z" fill="#8d4126" />
        <path d="M0,130 C60,110 120,125 180,115 C240,105 320,125 400,112 L400,200 L0,200 Z" fill="#c4643d" />
        <path d="M0,160 C80,145 160,165 240,150 C300,140 360,155 400,150 L400,200 L0,200 Z" fill="#a9512f" />
        <circle cx="40" cy="175" r="4" fill="#8a3f25" />
        <circle cx="140" cy="185" r="3" fill="#8a3f25" />
        <circle cx="260" cy="178" r="5" fill="#8a3f25" />
      </svg>

      {TARGETS.map((t, i) => {
        const isChecked = checked.includes(i)
        const isVolcano = t.kind === 'volcano'
        return (
          <button
            key={i}
            type="button"
            data-testid={`mars-target-${i}`}
            aria-label={t.label}
            onClick={() => go(i)}
            className="btn-pop absolute -translate-x-1/2"
            style={{
              left: `${t.x}%`,
              bottom: isVolcano ? '42%' : '14%',
              width: isVolcano ? '22%' : '13%',
              aspectRatio: isVolcano ? '1.6' : '1.3',
            }}
          >
            {!isChecked && (
              <span className="anim-pulse-glow absolute inset-[-12%] rounded-full border-4 border-yellow-200" aria-hidden />
            )}
            {!isVolcano && (
              <svg viewBox="0 0 60 46" className="h-full w-full" aria-hidden>
                <path d="M4,44 C2,26 14,8 30,6 C46,4 58,22 56,44 Z" fill={t.kind === 'rock' ? '#9c3f22' : '#b5653f'} />
                {t.kind === 'layers' && (
                  <g stroke="#e8a37a" strokeWidth="3" fill="none">
                    <path d="M8,34 C20,30 40,32 54,30" />
                    <path d="M10,24 C22,20 38,22 50,20" />
                  </g>
                )}
                <path d="M16,16 C20,12 26,11 30,12" stroke="#d2805a" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            )}
            {isChecked && (
              <span className="anim-pop absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-2 text-lg font-bold text-night-900">
                ✓
              </span>
            )}
          </button>
        )
      })}

      <div
        className="pointer-events-none absolute bottom-[10%] transition-[left] duration-[1300ms] ease-in-out"
        style={{ left: `${roverX}%`, width: '22%', aspectRatio: '1.5' }}
        data-testid="rover"
      >
        <Rover scanning={busy} />
      </div>
      <ProgressDots total={TARGETS.length} done={checked.length} label="الصخور" />
    </div>
  )
}
