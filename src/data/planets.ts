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
  | 'pluto'

/** The eight planets (Pluto is a dwarf planet, not one of them). */
export type PlanetId = Exclude<BodyId, 'sun' | 'moon' | 'pluto'>

export type BodyKind = 'star' | 'planet' | 'moon' | 'dwarf'
export type PlanetClass = 'rocky' | 'gas-giant' | 'ice-giant'

export interface Body {
  id: BodyId
  /** Arabic display name */
  nameAr: string
  /** grammatical gender of the Arabic name: "دي الأرض" (f) vs "ده زحل" (m) */
  genderAr: 'f' | 'm'
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
    genderAr: 'f',
    nameEn: 'Sun',
    kind: 'star',
    diameterKm: 1_392_700,
    color: '#ffc93c',
    colorAr: 'أصفر',
  },
  mercury: {
    id: 'mercury',
    nameAr: 'عطارد',
    genderAr: 'm',
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
    genderAr: 'f',
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
    genderAr: 'f',
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
    genderAr: 'm',
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
    genderAr: 'm',
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
    genderAr: 'm',
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
    genderAr: 'm',
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
    genderAr: 'm',
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
    genderAr: 'm',
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
  pluto: {
    id: 'pluto',
    nameAr: 'بلوتو',
    genderAr: 'm',
    nameEn: 'Pluto',
    kind: 'dwarf', // a dwarf planet since 2006 — never counted as a 9th planet
    diameterKm: 2_377, // smaller than our Moon (3,475 km)
    distance: 5_906.4,
    orbitDays: 90_560, // ≈ 248 years
    color: '#d9c3a5',
    colorAr: 'بيج',
  },
}

/** The eight planets, in order from the Sun. */
export const PLANET_IDS: PlanetId[] = (Object.values(BODIES) as Body[])
  .filter((b) => b.kind === 'planet')
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  .map((b) => b.id as PlanetId)

/**
 * Every body shown in the app, in exploring / guided-tour order: the Sun, the
 * planets (Moon right after Earth), then the dwarf planet Pluto beyond Neptune.
 * Each one must have a full scene and recordings (enforced by tests).
 */
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
  'pluto',
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
