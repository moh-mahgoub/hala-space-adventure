import { useState } from 'react'
import { say, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { ProgressDots, Stage, TapHint, type ActivityProps } from './common'

const GOAL = 3

export function NeptuneActivity({ onDone }: ActivityProps) {
  const [gusts, setGusts] = useState(0)
  const blow = () => {
    const n = gusts + 1
    setGusts(n)
    sfx('whoosh')
    if (n < GOAL) void say(`planets.neptune.activity.steps.${n - 1}`)
    else if (n === GOAL) onDone()
  }
  return (
    <Stage>
      {/* the Sun is just a bright dot from out here */}
      <div className="absolute top-[8%] right-[6%] flex flex-col items-center gap-1" aria-label="الشمس بعيدة قوي" role="img">
        <span className="h-3 w-3 rounded-full bg-yellow-200 shadow-[0_0_12px_4px_rgba(255,230,120,0.8)]" />
        <span className="text-sm text-white/70">الشمس بعيدة قوي</span>
      </div>
      <button
        type="button"
        data-testid="activity-target"
        aria-label="دوسي على نبتون عشان الرياح"
        onClick={blow}
        className="btn-pop relative aspect-square"
        style={{ width: 'min(66%, 66vh)' }}
      >
        {gusts === 0 && <TapHint />}
        <PlanetArt id="neptune" spin title="نبتون" />
        <span key={gusts} className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden>
          {gusts > 0 &&
            [20, 35, 50, 62, 76].map((top, i) => (
              <span
                key={i}
                className="absolute h-2 w-1/2 rounded-full bg-white/70"
                style={{ top: `${top}%`, right: 0, animation: `wind 1.1s ${i * 0.12}s ease-out both` }}
              />
            ))}
        </span>
      </button>
      <ProgressDots total={GOAL} done={Math.min(gusts, GOAL)} label="الرياح" />
    </Stage>
  )
}
