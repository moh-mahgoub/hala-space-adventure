import { say } from '../audio'
import { PlanetArt } from '../components/PlanetArt'
import { MissionBadge } from '../components/character/MissionBadge'
import { TopBar } from '../components/TopBar'
import { STORY } from '../content/story'
import { BODIES, TOUR_ORDER } from '../data/planets'
import { useOnce } from '../hooks'
import { navigate } from '../router'
import { BADGES, allStarKeys, useProgress, visitedAllPlanets } from '../state/progress'

/** خريطتي — visited planets, stars collected and badges. */
export function MapScreen() {
  const progress = useProgress()
  const total = allStarKeys(STORY.map((c) => c.id)).length
  useOnce(() => void say(visitedAllPlanets(progress) ? 'map.allVisited' : 'map.intro'))

  return (
    <div className="screen" data-testid="map-screen">
      <TopBar title="خريطتي" onReplay={() => void say('map.intro')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-3 pb-24">
        {/* the trail of bodies */}
        <section aria-label="الأماكن اللي زرتيها" className="glass rounded-[2rem] p-3">
          <ol className="flex flex-wrap items-end justify-center gap-2 sm:gap-4">
            {TOUR_ORDER.map((id) => {
              const visited = progress.visited.includes(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    data-testid={`map-${id}`}
                    data-visited={visited ? 'yes' : 'no'}
                    aria-label={`${BODIES[id].nameAr}${visited ? ' — زرتيه' : ' — لسه'}`}
                    onClick={() => navigate({ name: 'planet', id, tour: false })}
                    className="btn-pop relative flex w-[16vw] max-w-28 flex-col items-center gap-1 landscape:w-[8.4vw]"
                  >
                    <div className="relative aspect-square w-full">
                      <PlanetArt id={id} spin={visited} style={visited ? undefined : { filter: 'grayscale(1) brightness(0.35)' }} />
                      {!visited && (
                        <span className="absolute inset-0 flex items-center justify-center text-4xl font-extrabold text-white/70">
                          ؟
                        </span>
                      )}
                    </div>
                    <span className="text-base font-bold sm:text-lg">{visited ? BODIES[id].nameAr : '...'}</span>
                    {visited && <span className="absolute -top-1 left-0 text-xl">✅</span>}
                  </button>
                </li>
              )
            })}
          </ol>
        </section>

        {/* stars */}
        <section aria-label="النجوم" className="glass flex flex-col items-center gap-2 rounded-[2rem] p-4">
          <div className="text-4xl font-extrabold" data-testid="map-stars">
            ⭐ {progress.stars.length.toLocaleString('ar-EG')} / {total.toLocaleString('ar-EG')}
          </div>
          <div
            className="h-6 w-full max-w-xl overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={progress.stars.length}
            aria-label="النجوم"
          >
            <div
              className="h-full rounded-full bg-gradient-to-l from-yellow-200 to-amber-400 transition-all"
              style={{ width: `${(progress.stars.length / total) * 100}%` }}
            />
          </div>
        </section>

        {/* badges */}
        <section aria-label="الأوسمة">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {BADGES.map((b) => {
              const earned = b.earned(progress)
              return (
                <li
                  key={b.id}
                  data-testid={`badge-${b.id}`}
                  data-earned={earned ? 'yes' : 'no'}
                  className={`flex flex-col items-center gap-1 rounded-3xl border-4 p-3 text-center ${
                    earned ? 'border-yellow-300 bg-yellow-300/15' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <MissionBadge icon={b.icon} title={b.title} earned={earned} size={76} />
                  <span className={`text-base font-bold ${earned ? '' : 'text-white/50'}`}>{b.title}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
