/**
 * Tiny hash router — works on GitHub Pages without 404 tricks,
 * and keeps the browser back button useful.
 */
import { useSyncExternalStore } from 'react'
import { isBodyId, type BodyId } from './data/planets'
import { GAME_IDS, type GameId } from './state/progress'

export type Route =
  | { name: 'home' }
  | { name: 'space' }
  | { name: 'planet'; id: BodyId; tour: boolean }
  | { name: 'games' }
  | { name: 'game'; id: GameId }
  | { name: 'story'; chapter: number | null }
  | { name: 'map' }

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '')
  const [path, query = ''] = clean.split('?')
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
  const q = new URLSearchParams(query)
  switch (parts[0]) {
    case 'space':
      return { name: 'space' }
    case 'planet':
      return isBodyId(parts[1]) ? { name: 'planet', id: parts[1], tour: q.get('tour') === '1' } : { name: 'space' }
    case 'games':
      return { name: 'games' }
    case 'game':
      return (GAME_IDS as readonly string[]).includes(parts[1])
        ? { name: 'game', id: parts[1] as GameId }
        : { name: 'games' }
    case 'story': {
      const n = Number(parts[1])
      return { name: 'story', chapter: parts[1] !== undefined && Number.isInteger(n) && n >= 0 ? n : null }
    }
    case 'map':
      return { name: 'map' }
    default:
      return { name: 'home' }
  }
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/'
    case 'space':
      return '#/space'
    case 'planet':
      return `#/planet/${r.id}${r.tour ? '?tour=1' : ''}`
    case 'games':
      return '#/games'
    case 'game':
      return `#/game/${r.id}`
    case 'story':
      return r.chapter == null ? '#/story' : `#/story/${r.chapter}`
    case 'map':
      return '#/map'
  }
}

let current = parseHash(globalThis.location?.hash ?? '')
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = parseHash(window.location.hash)
    listeners.forEach((l) => l())
  })
}

/** Subscribe to every route change (hash change or in-app replace). */
export function onRouteChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const hash = routeToHash(r)
  if (opts.replace) {
    history.replaceState(null, '', hash)
    current = parseHash(hash)
    listeners.forEach((l) => l())
  } else if (window.location.hash !== hash) {
    window.location.hash = hash
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current,
    () => current,
  )
}
