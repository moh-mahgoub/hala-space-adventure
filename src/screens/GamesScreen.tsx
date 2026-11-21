import { say } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { script } from '../content/script'
import { useOnce } from '../hooks'
import { navigate } from '../router'
import { GAME_IDS, useProgress, type GameId } from '../state/progress'
import type { ReactNode } from 'react'

const CARDS: Record<GameId, { art: ReactNode; tone: string }> = {
  find: { art: <span className="text-6xl">🔍</span>, tone: 'from-sky-400/80 to-indigo-700/90' },
  order: { art: <span className="text-6xl">🪐</span>, tone: 'from-violet-400/80 to-purple-800/90' },
  dayNight: { art: <span className="text-6xl">🌗</span>, tone: 'from-amber-400/80 to-orange-700/90' },
  explorer: { art: <span className="text-6xl">🚀</span>, tone: 'from-pink-400/80 to-fuchsia-800/90' },
  shadow: { art: <div className="w-16"><PlanetArt id="saturn" silhouette /></div>, tone: 'from-slate-400/80 to-slate-700/90' },
  size: { art: <span className="text-6xl">🐘</span>, tone: 'from-emerald-400/80 to-teal-800/90' },
}

export function GamesScreen() {
  const progress = useProgress()
  useOnce(() => void say('games.hub'))
  return (
    <div className="screen" data-testid="games-screen">
      <TopBar title="الألعاب" onReplay={() => void say('games.hub')} />
      <div className="mx-auto grid w-full max-w-5xl flex-1 auto-rows-fr grid-cols-2 gap-3 overflow-y-auto py-3 pb-20 sm:gap-5 lg:grid-cols-3">
        {GAME_IDS.map((id) => {
          const earned = progress.stars.includes(`game:${id}`)
          return (
            <button
              key={id}
              type="button"
              data-testid={`game-card-${id}`}
              aria-label={script.games.names[id]}
              onClick={() => navigate({ name: 'game', id })}
              className={`btn-pop relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-[2rem] border-4 border-white/20 bg-gradient-to-b p-3 shadow-2xl ${CARDS[id].tone}`}
            >
              {CARDS[id].art}
              <span className="text-2xl font-extrabold text-shadow sm:text-3xl">{script.games.names[id]}</span>
              {earned && (
                <span className="absolute top-2 left-3 text-3xl" aria-label="كسبتي نجمة">
                  ⭐
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
