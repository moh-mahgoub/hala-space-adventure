/**
 * Shows the child's astronaut reacting (pose + speech bubble) whenever
 * `react()` is called from a real interaction. One at a time; the newest wins.
 */
import { useEffect, useState } from 'react'
import { fill } from '../../content/lines'
import { onReaction, type ReactionEvent } from '../../profile/reactions'
import { useSettings } from '../../state/settings'
import { AstronautCharacter } from './AstronautCharacter'
import { ChildAvatar } from './ChildAvatar'

const SHOW_MS = 3600

export function AvatarReaction() {
  const [ev, setEv] = useState<ReactionEvent | null>(null)
  const [helmetBig, setHelmetBig] = useState(false)
  const { childName } = useSettings()

  useEffect(() => {
    let hide: number | undefined
    let grow: number | undefined
    const off = onReaction((e) => {
      setEv(e)
      setHelmetBig(false)
      clearTimeout(hide)
      clearTimeout(grow)
      // the oversized helmet "pops" a moment after appearing — that's the joke
      if (e.bigHelmet) grow = window.setTimeout(() => setHelmetBig(true), 450)
      hide = window.setTimeout(() => setEv(null), e.sticker ? SHOW_MS + 800 : SHOW_MS)
    })
    // a reaction belongs to the scene it happened in: clear it when the child navigates away
    const onNav = () => setEv(null)
    window.addEventListener('hashchange', onNav)
    return () => {
      off()
      window.removeEventListener('hashchange', onNav)
      clearTimeout(hide)
      clearTimeout(grow)
    }
  }, [])

  if (!ev) return null
  const text = fill(ev.line.template, childName, ev.line.params)
  return (
    <div
      className="pointer-events-none fixed z-[45] flex items-end gap-2"
      style={{ left: 'calc(var(--safe-left) + 0.75rem)', bottom: 'calc(var(--safe-bottom) + 5.5rem)' }}
      data-testid="avatar-reaction"
      data-kind={ev.kind}
      role="status"
      aria-live="polite"
    >
      <div key={ev.id} className="anim-pop">
        <AstronautCharacter size={110} pose={ev.pose} bigHelmet={helmetBig} upsideDown={ev.upsideDown} />
      </div>
      <div
        key={`b${ev.id}`}
        className="anim-slide-up mb-16 max-w-56 rounded-3xl rounded-bl-none border-2 border-white/30 bg-white px-4 py-2 text-lg leading-snug font-extrabold text-night-900 shadow-2xl"
        dir="rtl"
      >
        {text}
      </div>
      {ev.sticker && (
        <div className="anim-pop absolute -top-28 left-10 rotate-[-8deg] rounded-[2rem] bg-white p-2 shadow-2xl" data-testid="face-sticker">
          <div className="relative rounded-[1.6rem] border-4 border-dashed border-pink-400 bg-gradient-to-b from-violet-200 to-sky-200 p-2">
            <ChildAvatar size={80} ring="#ff6fae" />
            <span className="absolute -top-3 -right-3 text-3xl">🚀</span>
            <span className="absolute -bottom-2 -left-3 text-2xl">⭐</span>
            <span className="absolute -bottom-3 right-0 text-xl">🪐</span>
          </div>
        </div>
      )}
    </div>
  )
}
