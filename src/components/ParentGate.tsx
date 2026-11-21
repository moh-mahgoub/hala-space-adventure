import { useEffect, useRef, useState } from 'react'
import { GearIcon } from './Icons'

const HOLD_MS = 3000

/**
 * Discreet parent entrance: a small gear that must be held for 3 seconds.
 * A quick tap (what a child does) only shows a hint ring and does nothing.
 */
export function ParentGate({ onOpen }: { onOpen: () => void }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const start = () => {
    setHolding(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      onOpen()
    }, HOLD_MS)
  }
  const cancel = () => {
    setHolding(false)
    clearTimeout(timer.current)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      aria-label="إعدادات الكبار — اضغط مطولاً ٣ ثواني (Parent settings: press and hold 3 seconds)"
      title="Parents: press & hold 3 s"
      data-testid="parent-gate"
      className="relative flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white/40"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        start()
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          start()
        }
      }}
      onKeyUp={cancel}
    >
      <GearIcon />
      {holding && (
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="#ffe066"
            strokeWidth="4"
            strokeDasharray="126"
            style={{ animation: `hold-fill ${HOLD_MS}ms linear forwards` }}
          />
        </svg>
      )}
    </button>
  )
}
