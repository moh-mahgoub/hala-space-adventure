import { useNarrator } from '../audio'
import { useSettings } from '../state/settings'
import { Nori } from './Nori'

/**
 * Subtitle bubble: shows what Nori is saying. Always available so the app
 * still communicates when sound is off or no Arabic voice exists.
 */
export function Caption() {
  const { text } = useNarrator()
  const { captions } = useSettings()
  if (!captions || !text) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
      style={{ bottom: 'calc(var(--safe-bottom) + 0.6rem)' }}
    >
      <div
        role="status"
        aria-live="polite"
        data-testid="caption"
        className="anim-slide-up flex max-w-3xl items-center gap-3 rounded-[2rem] border-2 border-white/20 bg-night-900/90 px-4 py-2 shadow-2xl"
      >
        <Nori size={44} talking className="shrink-0" />
        <p className="text-lg leading-snug font-bold sm:text-2xl" dir="rtl">
          {text}
        </p>
      </div>
    </div>
  )
}
