import { useEffect, useRef, useState } from 'react'
import { GearIcon } from './Icons'

export const HOLD_MS = 2000
/** How far a finger may drift (px) during the hold before it counts as "moved away". */
export const MOVE_TOLERANCE_PX = 28
const HINT_MS = 3500
export const PARENT_HINT = 'للكبار: اضغط مطوّلاً ثانيتين'

/**
 * Discreet parent entrance: a gear labelled «للكبار» that must be held for 2 seconds.
 * A quick tap (what a child does) opens nothing — it only shows a short written
 * hint for grown-ups (never spoken, so it doesn't attract the child).
 *
 * iPad reliability: the button opts out of Safari's own long-press behaviours
 * (scrolling, text selection, the callout menu), keeps the pointer captured,
 * and tolerates a little finger wobble. Only a clear move off the gear cancels.
 */
export function ParentGate({ onOpen }: { onOpen: () => void }) {
  const [holding, setHolding] = useState(false)
  const [hint, setHint] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const hintTimer = useRef<number | undefined>(undefined)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const opened = useRef(false)

  const start = (x = 0, y = 0) => {
    origin.current = { x, y }
    opened.current = false
    setHolding(true)
    setHint(false)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      opened.current = true
      origin.current = null
      setHolding(false)
      onOpen()
    }, HOLD_MS)
  }
  const cancel = () => {
    origin.current = null
    setHolding(false)
    clearTimeout(timer.current)
  }
  /** finger lifted: if the hold didn't complete, show the grown-ups hint */
  const release = () => {
    const wasHolding = origin.current !== null
    cancel()
    if (wasHolding && !opened.current) {
      setHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = window.setTimeout(() => setHint(false), HINT_MS)
    }
  }
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      clearTimeout(hintTimer.current)
    },
    [],
  )

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="إعدادات الكبار — اضغط مطولاً ثانيتين (Parent settings: press and hold 2 seconds)"
        title="Parents: press & hold 2 s"
        data-testid="parent-gate"
        data-holding={holding ? 'yes' : 'no'}
        className="relative flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-white/25 bg-white/5 text-white/85 select-none"
        style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId)
          } catch {
            /* capture is a nicety; the hold must still work without it */
          }
          start(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          const o = origin.current
          if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_TOLERANCE_PX) cancel()
        }}
        onPointerUp={release}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
            e.preventDefault()
            start()
          }
        }}
        onKeyUp={release}
      >
        <span className="text-3xl leading-none" aria-hidden>
          <GearIcon />
        </span>
        <span className="mt-0.5 text-xs leading-none font-bold" aria-hidden>
          للكبار
        </span>
        {holding && (
          <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="#ffe066"
              strokeWidth="3.5"
              strokeDasharray="126"
              style={{ animation: `hold-fill ${HOLD_MS}ms linear forwards` }}
            />
          </svg>
        )}
      </button>
      {hint && (
        <div
          role="status"
          data-testid="parent-gate-hint"
          className="anim-pop absolute top-full left-0 z-30 mt-2 rounded-2xl bg-night-900/95 px-3 py-2 text-base font-bold whitespace-nowrap text-yellow-100 shadow-lg"
        >
          {PARENT_HINT}
        </div>
      )}
    </div>
  )
}
