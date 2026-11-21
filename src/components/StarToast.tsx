import { useEffect, useState } from 'react'
import { onStar } from '../state/rewards'
import { ui } from '../content/ui'

/** "+1 ⭐" pop-up whenever a new star is earned. */
export function StarToast() {
  const [n, setN] = useState(0)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let t: number | undefined
    const off = onStar(() => {
      setN((x) => x + 1)
      setVisible(true)
      clearTimeout(t)
      t = window.setTimeout(() => setVisible(false), 1800)
    })
    return () => {
      off()
      clearTimeout(t)
    }
  }, [])
  if (!visible) return null
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{ top: 'calc(var(--safe-top) + 5.5rem)' }}
      role="status"
      aria-label="نجمة جديدة"
    >
      <div
        key={n}
        className="anim-pop flex items-center gap-2 rounded-full bg-yellow-300 px-5 py-2 text-2xl font-extrabold text-night-900 shadow-2xl"
      >
        <span aria-hidden>⭐</span> +1 <span className="text-lg">{ui.stars}</span>
      </div>
    </div>
  )
}
