import { useNarrator } from '../audio'
import { useSettings } from '../state/settings'
import { Zizo } from './Zizo'

/** The storyteller's small badge: a warm moon and star (she is heard, not seen). */
function StorytellerBadge({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="shrink-0">
      <circle cx="24" cy="24" r="23" fill="#ffe7b8" />
      <path d="M28 10a14 14 0 1 0 10 24A11 11 0 0 1 28 10z" fill="#ffb347" />
      <path d="M34 12l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#8b5cf6" />
    </svg>
  )
}

/**
 * Subtitle bubble: shows what is being said and WHO says it (storyteller or
 * Zizo). Always available, so the app still communicates with sound off.
 */
export function Caption() {
  const { text, speaker } = useNarrator()
  const { captions } = useSettings()
  if (!captions || !text) return null
  const zizo = speaker === 'zizo'
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
      style={{ bottom: 'calc(var(--safe-bottom) + 0.6rem)' }}
    >
      <div
        role="status"
        aria-live="polite"
        data-testid="caption"
        data-speaker={speaker ?? ''}
        className={`anim-slide-up flex max-w-3xl items-center gap-3 rounded-[2rem] border-2 bg-night-900/90 px-4 py-2 shadow-2xl ${
          zizo ? 'border-emerald-300/70' : 'border-amber-200/40'
        }`}
      >
        {zizo ? <Zizo size={44} talking className="shrink-0" /> : <StorytellerBadge />}
        <p className="text-lg leading-snug font-bold sm:text-2xl" dir="rtl">
          <span className="sr-only">{zizo ? 'زيزو: ' : 'الحكّاءة: '}</span>
          {text}
        </p>
      </div>
    </div>
  )
}
