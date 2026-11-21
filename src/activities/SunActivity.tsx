import { useState } from 'react'
import { narrator, say, sfx } from '../audio'
import { react } from '../profile/reactions'
import { PlanetArt } from '../components/PlanetArt'
import { ProgressDots, Stage, TapHint, type ActivityProps } from './common'

const SMALL = ['mercury', 'venus', 'earth', 'mars'] as const

export function SunActivity({ onDone }: ActivityProps) {
  const [taps, setTaps] = useState(0)
  const finished = taps >= 3
  const tap = () => {
    if (finished) {
      sfx('pop')
      setTaps((t) => t + 1)
      return
    }
    const n = taps + 1
    setTaps(n)
    sfx('pop')
    if (n === 1) void narrator.say(react('sun'))
    else if (n < 3) void say(`planets.sun.activity.steps.${n - 1}`)
    else onDone()
  }
  const glow = Math.min(taps, 3)
  return (
    <Stage>
      {/* planets get lit as the Sun brightens */}
      {SMALL.map((id, i) => (
        <div
          key={id}
          className="absolute transition-all duration-700"
          style={{
            width: '9%',
            top: `${15 + i * 22}%`,
            left: `${6 + (i % 2) * 6}%`,
            filter: `brightness(${0.35 + glow * 0.22})`,
          }}
          aria-hidden
        >
          <PlanetArt id={id} />
        </div>
      ))}
      <button
        type="button"
        data-testid="activity-target"
        aria-label="دوسي على الشمس"
        onClick={tap}
        className="btn-pop relative aspect-square"
        style={{ width: 'min(70%, 70vh)' }}
      >
        {!finished && <TapHint />}
        <span
          key={taps}
          className="anim-pop absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 ${40 + glow * 40}px ${10 + glow * 18}px rgba(255,200,60,${0.25 + glow * 0.15})` }}
          aria-hidden
        />
        <PlanetArt id="sun" rays spin style={{ transform: `scale(${1 + glow * 0.04})`, transition: 'transform .4s' }} />
      </button>
      <ProgressDots total={3} done={Math.min(taps, 3)} label="نور الشمس" />
    </Stage>
  )
}
