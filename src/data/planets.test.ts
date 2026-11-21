import { BODIES, PLANET_IDS, TOUR_ORDER, earthsByVolume, neighbours, relativeToEarth, isPlanetId } from './planets'

describe('scientific planet data', () => {
  it('has exactly eight planets in order from the Sun', () => {
    expect(PLANET_IDS).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'])
    PLANET_IDS.forEach((id, i) => expect(BODIES[id].order).toBe(i + 1))
  })

  it('distinguishes star, planets and moon', () => {
    expect(BODIES.sun.kind).toBe('star')
    expect(BODIES.moon.kind).toBe('moon')
    expect(isPlanetId('moon')).toBe(false)
    expect(isPlanetId('sun')).toBe(false)
    PLANET_IDS.forEach((id) => expect(BODIES[id].kind).toBe('planet'))
  })

  it('orders distances outward', () => {
    const d = PLANET_IDS.map((id) => BODIES[id].distance!)
    expect([...d].sort((a, b) => a - b)).toEqual(d)
  })

  it('has correct size facts used by the app', () => {
    const bySize = [...PLANET_IDS].sort((a, b) => BODIES[b].diameterKm - BODIES[a].diameterKm)
    expect(bySize).toEqual(['jupiter', 'saturn', 'uranus', 'neptune', 'earth', 'venus', 'mars', 'mercury'])
    expect(relativeToEarth('sun')).toBeGreaterThan(100) // ~109 Earths across
    expect(earthsByVolume('jupiter')).toBeGreaterThan(1000) // "more than a thousand Earths"
    expect(relativeToEarth('jupiter')).toBeGreaterThan(11)
  })

  it('classifies planets correctly', () => {
    expect(['mercury', 'venus', 'earth', 'mars'].every((id) => BODIES[id as 'mars'].planetClass === 'rocky')).toBe(true)
    expect(BODIES.jupiter.planetClass).toBe('gas-giant')
    expect(BODIES.saturn.planetClass).toBe('gas-giant')
    expect(BODIES.uranus.planetClass).toBe('ice-giant')
    expect(BODIES.neptune.planetClass).toBe('ice-giant')
    expect(BODIES.saturn.rings).toBe('bright')
  })

  it('uses the familiar Arabic names', () => {
    expect(TOUR_ORDER.map((id) => BODIES[id].nameAr)).toEqual([
      'الشمس', 'عطارد', 'الزهرة', 'الأرض', 'القمر', 'المريخ', 'المشتري', 'زحل', 'أورانوس', 'نبتون',
    ])
  })

  it('puts the Moon right after Earth in the tour', () => {
    expect(neighbours('earth').next).toBe('moon')
    expect(neighbours('moon').next).toBe('mars')
    expect(neighbours('sun').prev).toBeUndefined()
    expect(neighbours('neptune').next).toBeUndefined()
  })
})
