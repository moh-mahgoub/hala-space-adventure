import { say, sfx, unlockAudio } from '../audio'
import { HalaAvatar } from '../components/HalaAvatar'
import { PlayIcon } from '../components/Icons'
import { Nori } from '../components/Nori'
import { PlanetArt } from '../components/PlanetArt'
import { ui } from '../content/ui'
import { useSettings } from '../state/settings'

/**
 * First screen: one giant button. The tap unlocks audio on iOS/Chrome
 * (no sound ever plays before this), then Nori says hello.
 */
export function StartScreen({ onStart }: { onStart: () => void }) {
  const { childName } = useSettings()
  const start = () => {
    unlockAudio()
    sfx('whoosh')
    void say('start.welcome')
    onStart()
  }
  return (
    <div className="screen items-center justify-center gap-4 text-center" data-testid="start-screen">
      <div className="pointer-events-none absolute -top-16 -left-20 w-72 opacity-90 sm:w-96" aria-hidden>
        <PlanetArt id="saturn" spin />
      </div>
      <div className="pointer-events-none absolute -right-10 -bottom-12 w-56 opacity-80 sm:w-72" aria-hidden>
        <PlanetArt id="earth" spin />
      </div>
      <div className="relative flex items-end gap-2">
        <HalaAvatar size={120} pose="wave" className="anim-float" />
        <Nori size={110} className="anim-float" talking={false} />
      </div>
      <h1 className="relative text-5xl leading-tight font-extrabold text-yellow-200 text-shadow sm:text-7xl">
        رحلة {childName} في الفضاء
      </h1>
      <p className="relative text-2xl font-bold text-white/90 sm:text-3xl">{ui.tagline.replace('{name}', childName)}</p>
      <button
        type="button"
        onClick={start}
        aria-label={ui.start}
        className="btn-pop relative mt-4 flex items-center gap-4 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-12 py-5 text-4xl font-extrabold text-night-900 shadow-2xl shadow-orange-900/50"
      >
        <span className="anim-pulse-glow absolute inset-[-8px] rounded-full border-4 border-yellow-200" aria-hidden />
        <PlayIcon className="text-5xl" />
        {ui.start}
      </button>
      <p className="relative mt-2 text-sm text-white/50" dir="ltr">
        Hala’s Space Adventure · tap to start (sound will play)
      </p>
    </div>
  )
}
