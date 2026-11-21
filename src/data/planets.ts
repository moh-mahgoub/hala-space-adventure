/**
 * Scientific data for the bodies in the app.
 *
 * Numbers are real (NASA planetary fact sheets, rounded). The visuals in the
 * app are NOT to scale — see `ILLUSTRATIVE_NOTE` — but anything that compares
 * sizes or order (games, tests) uses these values, so they must stay correct.
 */

export type BodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'

export type PlanetId = Exclude<BodyId, 'sun' | 'moon'>

export type BodyKind = 'star' | 'planet' | 'moon'
export type PlanetClass = 'rocky' | 'gas-giant' | 'ice-giant'

export interface Body {
  id: BodyId
  /** Arabic display name */
  nameAr: string
  /** English name (for adults / README / aria fallbacks) */
  nameEn: string
  kind: BodyKind
  /** 1–8 for planets, counted outward from the Sun. */
  order?: number
  planetClass?: PlanetClass
  /** Mean diameter in km */
  diameterKm: number
  /** Mean distance from the Sun in millions of km (for the Moon: from Earth, in thousands of km) */
  distance?: number
  /** Time for one orbit, in Earth days (Moon: around Earth) */
  orbitDays?: number
  /** Main colour, used both for art and the "colour" hints */
  color: string
  /** Arabic colour word (always paired with shape/name — never colour alone) */
  colorAr: string
  /** Has prominent rings */
  rings?: 'bright' | 'faint'
}

export const BODIES: Record<BodyId, Body> = {
  sun: {
    id: 'sun',
    nameAr: 'الشمس',
    nameEn: 'Sun',
    kind: 'star',
    diameterKm: 1_392_700,
    color: '#ffc93c',
    colorAr: 'أصفر',
  },
  mercury: {
    id: 'mercury',
    nameAr: 'عطارد',
    nameEn: 'Mercury',
    kind: 'planet',
    order: 1,
    planetClass: 'rocky',
    diameterKm: 4_879,
    distance: 57.9,
    orbitDays: 88,
    color: '#a8a29e',
    colorAr: 'رمادي',
  },
  venus: {
    id: 'venus',
    nameAr: 'الزهرة',
    nameEn: 'Venus',
    kind: 'planet',
    order: 2,
    planetClass: 'rocky',
    diameterKm: 12_104,
    distance: 108.2,
    orbitDays: 225,
    color: '#f2d398',
    colorAr: 'أصفر فاتح',
  },
  earth: {
    id: 'earth',
    nameAr: 'الأرض',
    nameEn: 'Earth',
    kind: 'planet',
    order: 3,
    planetClass: 'rocky',
    diameterKm: 12_756,
    distance: 149.6,
    orbitDays: 365.25,
    color: '#3b82f6',
    colorAr: 'أزرق وأخضر',
  },
  moon: {
    id: 'moon',
    nameAr: 'القمر',
    nameEn: 'Moon',
    kind: 'moon',
    diameterKm: 3_475,
    distance: 384.4,
    orbitDays: 27.3,
    color: '#d6d3d1',
    colorAr: 'رمادي فاتح',
  },
  mars: {
    id: 'mars',
    nameAr: 'المريخ',
    nameEn: 'Mars',
    kind: 'planet',
    order: 4,
    planetClass: 'rocky',
    diameterKm: 6_792,
    distance: 227.9,
    orbitDays: 687,
    color: '#dc5f3a',
    colorAr: 'أحمر',
  },
  jupiter: {
    id: 'jupiter',
    nameAr: 'المشتري',
    nameEn: 'Jupiter',
    kind: 'planet',
    order: 5,
    planetClass: 'gas-giant',
    diameterKm: 142_984,
    distance: 778.6,
    orbitDays: 4_333,
    color: '#d9a066',
    colorAr: 'بني وبيج',
    rings: 'faint',
  },
  saturn: {
    id: 'saturn',
    nameAr: 'زحل',
    nameEn: 'Saturn',
    kind: 'planet',
    order: 6,
    planetClass: 'gas-giant',
    diameterKm: 120_536,
    distance: 1_433.5,
    orbitDays: 10_759,
    color: '#e8cf8f',
    colorAr: 'ذهبي',
    rings: 'bright',
  },
  uranus: {
    id: 'uranus',
    nameAr: 'أورانوس',
    nameEn: 'Uranus',
    kind: 'planet',
    order: 7,
    planetClass: 'ice-giant',
    diameterKm: 51_118,
    distance: 2_872.5,
    orbitDays: 30_687,
    color: '#7dd3e0',
    colorAr: 'أزرق مخضر',
    rings: 'faint',
  },
  neptune: {
    id: 'neptune',
    nameAr: 'نبتون',
    nameEn: 'Neptune',
    kind: 'planet',
    order: 8,
    planetClass: 'ice-giant',
    diameterKm: 49_528,
    distance: 4_495.1,
    orbitDays: 60_190,
    color: '#3b5bdb',
    colorAr: 'أزرق غامق',
    rings: 'faint',
  },
}

/** The eight planets, in order from the Sun. */
export const PLANET_IDS: PlanetId[] = (Object.values(BODIES) as Body[])
  .filter((b) => b.kind === 'planet')
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  .map((b) => b.id as PlanetId)

/** Order used for exploring / guided tour: Sun, then planets, Moon right after Earth. */
export const TOUR_ORDER: BodyId[] = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]

export const ALL_BODY_IDS = TOUR_ORDER

export function isBodyId(x: unknown): x is BodyId {
  return typeof x === 'string' && x in BODIES
}

export function isPlanetId(x: unknown): x is PlanetId {
  return isBodyId(x) && BODIES[x].kind === 'planet'
}

/** Diameter relative to Earth (Earth = 1). */
export function relativeToEarth(id: BodyId): number {
  return BODIES[id].diameterKm / BODIES.earth.diameterKm
}

/** How many Earths fit inside a body by volume (rounded). */
export function earthsByVolume(id: BodyId): number {
  return Math.round(relativeToEarth(id) ** 3)
}

export function neighbours(id: BodyId): { prev?: BodyId; next?: BodyId } {
  const i = TOUR_ORDER.indexOf(id)
  return { prev: TOUR_ORDER[i - 1], next: TOUR_ORDER[i + 1] }
}

/**
 * Illustrative display radius (in arbitrary units) — compressed with a
 * square-root-ish curve so small planets stay tappable. NOT to scale.
 */
export function displayRadius(id: BodyId): number {
  if (id === 'sun') return 1
  const r = relativeToEarth(id)
  return Math.max(0.32, Math.pow(r, 0.45))
}

export const ILLUSTRATIVE_NOTE =
  'Sizes, distances and orbital speeds in the pictures are illustrative and NOT to scale. ' +
  'Facts and the size-comparison game use real data.'
