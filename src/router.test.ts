import { parseHash, routeToHash, type Route } from './router'

describe('hash router', () => {
  it('round-trips all routes', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'space' },
      { name: 'planet', id: 'saturn', tour: false },
      { name: 'planet', id: 'sun', tour: true },
      { name: 'games' },
      { name: 'game', id: 'order' },
      { name: 'story', chapter: null },
      { name: 'story', chapter: 3 },
      { name: 'map' },
    ]
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r)
  })

  it('falls back safely on bad input', () => {
    expect(parseHash('')).toEqual({ name: 'home' })
    expect(parseHash('#/planet/pluto')).toEqual({ name: 'space' })
    expect(parseHash('#/game/chess')).toEqual({ name: 'games' })
    expect(parseHash('#/story/-1')).toEqual({ name: 'story', chapter: null })
    expect(parseHash('#/nonsense')).toEqual({ name: 'home' })
  })
})
