/**
 * The child's astronaut. Kept as a thin wrapper so every existing scene
 * automatically shows the personalised character (photo / sticker / cartoon,
 * or the illustrated default when no photo has been added).
 */
import { AstronautCharacter, type Pose } from './character/AstronautCharacter'

export function HalaAvatar({
  size = 90,
  helmet = true,
  className = '',
  pose = 'stand',
}: {
  size?: number
  helmet?: boolean
  className?: string
  pose?: Pose
}) {
  return <AstronautCharacter size={size} helmet={helmet} className={className} pose={pose} />
}
