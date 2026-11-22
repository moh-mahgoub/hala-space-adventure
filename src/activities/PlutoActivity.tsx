import { useState } from 'react'
import { line, narrator, sfx } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { BODIES } from '../data/planets'
import { Stage, TapHint, type ActivityProps } from './common'

/** Texture rotation that puts Pluto's heart (Tombaugh Regio) in the middle of the disk. */
const HEART_FRONT = 0.1

/** Find the hidden heart on Pluto, then see Pluto beside our Moon at their TRUE relative size. */
export function PlutoActivity({ onDone }: ActivityProps) {
  const [found, setFound] = useState(false)
  // true ratio: Pluto 2,377 km vs Moon 3,475 km
  const ratio = BODIES.pluto.diameterKm / BODIES.moon.diameterKm

  const tapHeart = () => {
    if (found) return
    setFound(true)
    sfx('success')
    void narrator.say(line('planets.pluto.activity.steps.0')).then(() => onDone())
  }

  return (
    <Stage>
      <div className="flex h-full w-full items-center justify-center gap-[6%]">
        <div className="relative aspect-square" style={{ width: found ? 'min(40%, 46vh)' : 'min(70%, 64vh)', transition: 'width .8s ease' }}>
          <PlanetArt id="pluto" rotation={HEART_FRONT} title="بلوتو" />
          {/* the heart sits just below the centre of the disk */}
          <button
            type="button"
            data-testid="pluto-heart"
            aria-label="القلب اللي على بلوتو"
            onClick={tapHeart}
            className="absolute top-[44%] left-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            {!found && <TapHint className="rounded-full" />}
            {found && (
              <svg viewBox="-50 -50 100 100" className="anim-pop h-full w-full" aria-hidden>
                <path d="M0,38 C-46,6 -40,-38 -14,-38 C-6,-38 0,-30 0,-22 C0,-30 6,-38 14,-38 C40,-38 46,6 0,38 Z" fill="#ff6fae" opacity="0.85" className="anim-pulse-glow" />
              </svg>
            )}
          </button>
          {found && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xl font-bold">بلوتو</span>}
        </div>
        {found && (
          <div className="anim-fade relative aspect-square" style={{ width: `calc(min(40%, 46vh) / ${ratio})`, maxWidth: '48%' }} data-testid="pluto-moon-compare">
            <PlanetArt id="moon" title="القمر" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xl font-bold">القمر</span>
          </div>
        )}
      </div>
    </Stage>
  )
}
