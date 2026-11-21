/**
 * What is under the centre of the Earth disk for a given rotation (0..1).
 * Matches the continent shapes in PlanetArt's Earth texture.
 */
export type Region = 'ocean' | 'land' | 'desert'

const REGIONS: { from: number; to: number; kind: Region }[] = [
  { from: -100, to: -76, kind: 'ocean' },
  { from: -76, to: -30, kind: 'land' }, // the Americas
  { from: -30, to: 0, kind: 'ocean' }, // Atlantic
  { from: 0, to: 38, kind: 'desert' }, // Africa (Sahara)
  { from: 38, to: 46, kind: 'ocean' },
  { from: 46, to: 94, kind: 'land' }, // Asia
  { from: 94, to: 100, kind: 'ocean' },
]

/** texture x-coordinate (-100..100) visible at the disk centre */
export function centreX(rotation: number): number {
  const x = ((((rotation * 200 + 100) % 200) + 200) % 200) - 100
  return x
}

export function regionAt(rotation: number): Region {
  const x = centreX(rotation)
  return REGIONS.find((r) => x >= r.from && x < r.to)?.kind ?? 'ocean'
}

export const REGION_STEP: Record<Region, number> = { ocean: 0, land: 1, desert: 2 }
export const REGION_LABEL: Record<Region, { icon: string; text: string }> = {
  ocean: { icon: '🐳', text: 'بحر' },
  land: { icon: '🌳', text: 'أرض خضرا' },
  desert: { icon: '🐪', text: 'صحرا' },
}
