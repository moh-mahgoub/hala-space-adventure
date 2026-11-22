/**
 * The secret mission: after Neptune (the last of the eight planets) a little
 * card invites the child onward to the dwarf planet Pluto. Optional, shown
 * every time Neptune's activity is finished, and Pluto stays reachable from
 * everywhere else too — nothing is locked behind it.
 */
import { useEffect, useState } from 'react'
import { sfx, useNarrator } from '../audio'
import { navigate } from '../router'
import { PlanetArt } from './PlanetArt'
import { Zizo } from './Zizo'

export const PLUTO_INVITE_TITLE = 'المهمة السرية: اكتشفي قلب بلوتو!'

export function PlutoInvite({ tour, onClose }: { tour: boolean; onClose: () => void }) {
  const { clipId } = useNarrator()
  const [dressed, setDressed] = useState(false)

  // Zizo puts his winter gear on as he says «استني ألبس الجاكت بتاعي!»
  useEffect(() => {
    if (clipId === 'zizo.pluto.jacket') setDressed(true)
  }, [clipId])
  useEffect(() => {
    const t = window.setTimeout(() => setDressed(true), 12_000) // in case narration is off
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div
      data-testid="pluto-invite"
      role="dialog"
      aria-label={PLUTO_INVITE_TITLE}
      className="anim-pop absolute inset-x-3 bottom-14 z-20 flex items-center gap-3 rounded-[2rem] border-4 border-sky-200/70 bg-gradient-to-b from-indigo-800/95 to-night-900/95 p-3 shadow-2xl sm:inset-x-8"
    >
      <button
        type="button"
        aria-label="بعدين"
        data-testid="pluto-invite-close"
        onClick={onClose}
        className="btn-pop absolute -top-4 -left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl font-bold"
      >
        ✕
      </button>
      <Zizo size={84} outfit={dressed ? 'winter' : 'none'} className="shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
        <p className="text-lg leading-snug font-extrabold text-sky-100 sm:text-xl">🤫 {PLUTO_INVITE_TITLE}</p>
        <button
          type="button"
          data-testid="pluto-invite-go"
          onClick={() => {
            sfx('whoosh')
            navigate({ name: 'planet', id: 'pluto', tour }, { replace: true })
          }}
          className="btn-pop relative flex items-center gap-3 rounded-full bg-gradient-to-b from-sky-200 to-indigo-300 px-6 py-3 text-2xl font-extrabold text-night-900 shadow-lg"
        >
          {/* the ring pulses, not the button, so it stays easy to hit */}
          <span className="anim-pulse-glow pointer-events-none absolute inset-[-6px] rounded-full border-4 border-sky-200" aria-hidden />
          <PlanetArt id="pluto" size={48} />
          يلا نكتشف بلوتو!
        </button>
      </div>
    </div>
  )
}
