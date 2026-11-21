import { useEffect, useState } from 'react'
import { Caption } from './components/Caption'
import { Celebration } from './components/Celebration'
import { StarToast } from './components/StarToast'
import { Starfield } from './components/Starfield'
import { useReducedMotion } from './hooks'
import { useRoute, type Route } from './router'
import { progressStore, useProgress, visitedAllPlanets } from './state/progress'
import { say } from './audio'
import { StartScreen } from './screens/StartScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SolarSystemScreen } from './screens/SolarSystemScreen'
import { PlanetScreen } from './screens/PlanetScreen'
import { GamesScreen } from './screens/GamesScreen'
import { GameScreen } from './screens/GameScreen'
import { StoryScreen } from './screens/StoryScreen'
import { MapScreen } from './screens/MapScreen'
import { useSettings } from './state/settings'

function routeKey(r: Route): string {
  switch (r.name) {
    case 'planet':
      return `planet-${r.id}`
    case 'game':
      return `game-${r.id}`
    case 'story':
      return `story-${r.chapter ?? 'menu'}`
    default:
      return r.name
  }
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />
    case 'space':
      return <SolarSystemScreen />
    case 'planet':
      return <PlanetScreen id={route.id} tour={route.tour} />
    case 'games':
      return <GamesScreen />
    case 'game':
      return <GameScreen id={route.id} />
    case 'story':
      return <StoryScreen chapter={route.chapter} />
    case 'map':
      return <MapScreen />
  }
}

export function App() {
  const route = useRoute()
  const reduced = useReducedMotion()
  const progress = useProgress()
  const { childName } = useSettings()
  const [started, setStarted] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full'
  }, [reduced])

  useEffect(() => {
    document.title = `رحلة ${childName} في الفضاء`
  }, [childName])

  // One-time celebration after discovering all eight planets
  useEffect(() => {
    if (started && visitedAllPlanets(progress) && !progress.celebratedAll) {
      progressStore.set({ celebratedAll: true })
      const t = window.setTimeout(() => {
        setCelebrate(true)
        void say('map.allVisited')
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [progress, started])

  return (
    <div className="app-bg fixed inset-0 overflow-hidden" dir="rtl" lang="ar">
      <Starfield />
      {!started ? (
        <StartScreen onStart={() => setStarted(true)} />
      ) : (
        <main key={routeKey(route)} className="anim-zoom absolute inset-0">
          <Screen route={route} />
        </main>
      )}
      <Caption />
      <StarToast />
      {celebrate && (
        <Celebration title="مستكشفة الكواكب!" icon="🪐" onClose={() => setCelebrate(false)}>
          <p className="text-2xl font-bold">زرتي التمن كواكب كلهم!</p>
        </Celebration>
      )}
    </div>
  )
}
