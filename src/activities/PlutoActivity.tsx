import { useEffect, useRef, useState } from 'react'
import { line, narrator, sfx, useNarrator } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { BODIES } from '../data/planets'
import { Stage, TapHint, type ActivityProps } from './common'

/** Texture rotation that puts Pluto's heart (Tombaugh Regio) in the middle of the disk. */
const HEART_FRONT = 0.1
/** Quiet time (after narration ends) before a gentle hint. */
export const PLUTO_IDLE_HINT_MS = 8000

/**
 * Find the heart on Pluto, then see Pluto beside our Moon at their TRUE relative size.
 * The heart is NOT highlighted at first — she discovers it. Tapping elsewhere on
 * Pluto, or waiting, brings a gentle hint (never "wrong"); the second hint makes
 * the heart glow.
 */
export function PlutoActivity({ onDone }: ActivityProps) {
  const [found, setFound] = useState(false)
  const [hints, setHints] = useState(0)
  const [lastTap, setLastTap] = useState(0)
  const { speaking } = useNarrator()
  const speakingRef = useRef(speaking)
  speakingRef.current = speaking
  // true ratio: Pluto 2,377 km vs Moon 3,475 km
  const ratio = BODIES.pluto.diameterKm / BODIES.moon.diameterKm

  const hint = () => {
    if (found || speakingRef.current) return
    const level = Math.min(hints + 1, 2)
    setHints(level)
    void narrator.say(line(`planets.pluto.hints.${level - 1}`))
  }

  // a gentle hint after a quiet moment (timer restarts after every tap / line)
  useEffect(() => {
    if (found || speaking) return
    const t = window.setTimeout(hint, PLUTO_IDLE_HINT_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, speaking, hints, lastTap])

  const tapHeart = () => {
    if (found) return
    setFound(true)
    sfx('success')
    void narrator.say([line('planets.pluto.activity.steps.0'), line('zizo.pluto.heartFound')]).then(() => onDone())
  }

  return (
    <Stage>
      <div className="flex h-full w-full items-center justify-center gap-[6%]">
        <div
          className="relative aspect-square"
          style={{ width: found ? 'min(40%, 46vh)' : 'min(70%, 64vh)', transition: 'width .8s ease' }}
        >
          {/* tapping Pluto anywhere but the heart = a gentle hint */}
          <button
            type="button"
            data-testid="pluto-disk"
            aria-label="بلوتو"
            className="absolute inset-0 rounded-full"
            onClick={() => {
              setLastTap(Date.now())
              if (!found) {
                sfx('pop')
                hint()
              }
            }}
          >
            <PlanetArt id="pluto" rotation={HEART_FRONT} title="بلوتو" />
          </button>
          {/* the heart sits just above the centre of the disk */}
          <button
            type="button"
            data-testid="pluto-heart"
            data-hinted={hints >= 2 ? 'yes' : 'no'}
            aria-label="الشكل اللي شبه القلب على بلوتو"
            onClick={tapHeart}
            className="absolute top-[44%] left-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          >
            {!found && hints >= 2 && <TapHint className="rounded-full" />}
            {found && (
              <span className="anim-pop absolute inset-0" aria-hidden data-testid="pluto-heart-found">
                {/* a soft icy glow over the real plain — no invented coloured heart */}
                <span
                  className="anim-pulse-glow absolute inset-[8%] rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(220,240,255,0.35) 45%, rgba(220,240,255,0) 70%)' }}
                />
                <span className="anim-twinkle absolute -top-[10%] right-[5%] text-2xl">✨</span>
                <span className="anim-twinkle absolute bottom-0 -left-[8%] text-xl" style={{ animationDelay: '.4s' }}>
                  ✨
                </span>
                <span className="anim-twinkle absolute top-[30%] -right-[18%] text-lg" style={{ animationDelay: '.8s' }}>
                  ✨
                </span>
              </span>
            )}
          </button>
          {found && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xl font-bold">بلوتو</span>}
        </div>
        {found && (
          <div
            className="anim-fade relative aspect-square"
            style={{ width: `calc(min(40%, 46vh) / ${ratio})`, maxWidth: '48%' }}
            data-testid="pluto-moon-compare"
          >
            <PlanetArt id="moon" title="القمر" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xl font-bold">القمر</span>
          </div>
        )}
      </div>
    </Stage>
  )
}
