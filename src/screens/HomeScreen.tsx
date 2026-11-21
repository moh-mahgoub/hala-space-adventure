import { useState, type ReactNode } from 'react'
import { narrator, say } from '../audio'
import { RoundButton } from '../components/Button'
import { HalaAvatar } from '../components/HalaAvatar'
import { FullscreenIcon, SpeakerIcon, MuteIcon } from '../components/Icons'
import { Nori } from '../components/Nori'
import { ParentGate } from '../components/ParentGate'
import { PlanetArt } from '../components/PlanetArt'
import { SettingsPanel } from '../components/SettingsPanel'
import { ui } from '../content/ui'
import { STORY } from '../content/story'
import { useOnce } from '../hooks'
import { navigate, type Route } from '../router'
import { allStarKeys, useProgress } from '../state/progress'
import { updateSettings, useSettings } from '../state/settings'

function fullscreenSupported() {
  const d = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
  return !!(d.requestFullscreen || d.webkitRequestFullscreen)
}

function toggleFullscreen() {
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void }
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
  try {
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      ;(doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.())
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => {})
    } else el.webkitRequestFullscreen?.()
  } catch {
    /* not supported */
  }
}

function HomeCard({
  label,
  art,
  tone,
  to,
  testId,
}: {
  label: string
  art: ReactNode
  tone: string
  to: Route
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      onClick={() => navigate(to)}
      className={`btn-pop group relative flex min-h-36 flex-col items-center justify-end gap-1 overflow-hidden rounded-[2rem] border-4 border-white/20 p-3 shadow-2xl sm:min-h-52 ${tone}`}
    >
      <div className="pointer-events-none flex flex-1 items-center justify-center">{art}</div>
      <span className="text-3xl font-extrabold text-white text-shadow sm:text-4xl">{label}</span>
    </button>
  )
}

export function HomeScreen() {
  const { childName, muted } = useSettings()
  const progress = useProgress()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const totalStars = allStarKeys(STORY.map((c) => c.id)).length

  useOnce(() => {
    if (!narrator.getState().speaking) void say('home.hello')
  })

  return (
    <div className="screen" data-testid="home-screen">
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2">
        <div
          className="glass flex items-center gap-2 rounded-full px-4 py-2 text-2xl font-extrabold"
          aria-label={`${progress.stars.length} ${ui.stars}`}
          data-testid="star-count"
        >
          <span aria-hidden>⭐</span>
          <span>{progress.stars.length}</span>
          <span className="text-base text-white/60">/ {totalStars}</span>
        </div>
        <div className="flex items-center gap-2">
          {fullscreenSupported() && <RoundButton label={ui.fullscreen} icon={<FullscreenIcon />} onClick={toggleFullscreen} />}
          <RoundButton
            label={muted ? ui.soundOff : ui.soundOn}
            aria-pressed={!muted}
            icon={muted ? <MuteIcon /> : <SpeakerIcon />}
            onClick={() => updateSettings({ muted: !muted })}
          />
          <ParentGate onOpen={() => setSettingsOpen(true)} />
        </div>
      </header>

      <div className="flex shrink-0 flex-col items-center gap-1 py-2 text-center sm:py-4">
        <button
          type="button"
          aria-label="نوري بيتكلم"
          onClick={() => void say('home.hello')}
          className="btn-pop flex items-end gap-1"
        >
          <HalaAvatar size={74} pose="float" />
          <Nori size={74} className="anim-float" />
        </button>
        <h1 className="text-4xl font-extrabold text-yellow-200 text-shadow sm:text-6xl">رحلة {childName} في الفضاء</h1>
      </div>

      <nav
        aria-label="القائمة"
        className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-2 gap-3 pb-20 sm:gap-5 md:grid-cols-4 md:pb-24"
        style={{ maxHeight: 520 }}
      >
        <HomeCard
          testId="home-explore"
          label={ui.explore}
          to={{ name: 'space' }}
          tone="bg-gradient-to-b from-sky-400/80 to-indigo-700/90"
          art={
            <div className="relative h-24 w-28 sm:h-32 sm:w-36">
              <PlanetArt id="sun" size={70} className="absolute top-2 right-0" />
              <PlanetArt id="saturn" size={78} className="absolute bottom-0 left-0" spin />
            </div>
          }
        />
        <HomeCard
          testId="home-story"
          label={ui.story}
          to={{ name: 'story', chapter: null }}
          tone="bg-gradient-to-b from-pink-400/80 to-fuchsia-800/90"
          art={<span className="text-7xl sm:text-8xl">📖</span>}
        />
        <HomeCard
          testId="home-games"
          label={ui.games}
          to={{ name: 'games' }}
          tone="bg-gradient-to-b from-emerald-400/80 to-teal-800/90"
          art={<span className="text-7xl sm:text-8xl">🧩</span>}
        />
        <HomeCard
          testId="home-map"
          label={ui.map}
          to={{ name: 'map' }}
          tone="bg-gradient-to-b from-amber-400/80 to-orange-700/90"
          art={<span className="text-7xl sm:text-8xl">🗺️</span>}
        />
      </nav>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
