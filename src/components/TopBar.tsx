import type { ReactNode } from 'react'
import { navigate, type Route } from '../router'
import { updateSettings, useSettings } from '../state/settings'
import { ui } from '../content/ui'
import { RoundButton } from './Button'
import { BackIcon, HomeIcon, MuteIcon, ReplayIcon, SpeakerIcon } from './Icons'

/**
 * Header used by every screen. In RTL the first items sit on the right:
 * Home + Back on the right, Replay + Sound on the left.
 */
export function TopBar({
  title,
  back,
  onReplay,
  children,
  hideHome,
}: {
  title?: ReactNode
  back?: Route
  onReplay?: () => void
  children?: ReactNode
  hideHome?: boolean
}) {
  const { muted } = useSettings()
  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {!hideHome && (
          <RoundButton label={ui.home} icon={<HomeIcon />} tone="violet" onClick={() => navigate({ name: 'home' })} />
        )}
        {back && <RoundButton label={ui.back} icon={<BackIcon />} onClick={() => navigate(back)} />}
      </div>
      {title && (
        <h1 className="min-w-0 truncate text-center text-3xl font-extrabold text-shadow sm:text-5xl">{title}</h1>
      )}
      <div className="flex items-center gap-2">
        {children}
        {onReplay && <RoundButton label={ui.replay} icon={<ReplayIcon />} tone="sun" onClick={onReplay} />}
        <RoundButton
          label={muted ? ui.soundOff : ui.soundOn}
          aria-pressed={!muted}
          icon={muted ? <MuteIcon /> : <SpeakerIcon />}
          onClick={() => updateSettings({ muted: !muted })}
        />
      </div>
    </header>
  )
}
