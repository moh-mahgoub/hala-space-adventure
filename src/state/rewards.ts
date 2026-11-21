/** Award stars with a little toast + sparkle. Finite and non-manipulative: each star once. */
import { sfx } from '../audio'
import { awardStar } from './progress'

type Listener = (key: string) => void
const listeners = new Set<Listener>()

export function onStar(fn: Listener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function earn(key: string): boolean {
  const isNew = awardStar(key)
  if (isNew) {
    sfx('star')
    listeners.forEach((l) => l(key))
  }
  return isNew
}
