import { useState } from 'react'
import { say, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { ProgressDots, Stage, TapHint, type ActivityProps } from './common'

const GOAL = 3

/** Tap Uranus to make it roll on its side like a ball. */
export function UranusActivity({ onDone }: ActivityProps) {
  const [rolls, setRolls] = useState(0)
  const side = rolls % 2 === 1
  const roll = () => {
    const n = rolls + 1
    setRolls(n)
    sfx('whoosh')
    if (n < GOAL) void say('planets.uranus.activity.steps.0')
    else if (n === GOAL) onDone()
  }
  return (
    <Stage>
      <div className="absolute inset-x-[6%] top-1/2 h-1 rounded-full bg-white/15" aria-hidden />
      <button
        type="button"
        data-testid="activity-target"
        aria-label="دوسي على أورانوس عشان يتدحرج"
        onClick={roll}
        className="relative aspect-square transition-transform duration-[1200ms] ease-in-out"
        style={{
          width: 'min(48%, 56vh)',
          transform: `translateX(${side ? '-45%' : '45%'}) rotate(${rolls * -360}deg)`,
        }}
      >
        {rolls === 0 && <TapHint />}
        {/* axis line — lying sideways */}
        <span className="absolute top-1/2 left-[-8%] h-1 w-[116%] -translate-y-1/2 rounded bg-white/50" aria-hidden />
        <PlanetArt id="uranus" title="أورانوس" />
      </button>
      <ProgressDots total={GOAL} done={Math.min(rolls, GOAL)} label="الدحرجة" />
    </Stage>
  )
}
