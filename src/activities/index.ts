import type { ComponentType } from 'react'
import type { BodyId } from '../data/planets'
import type { ActivityProps } from './common'
import { SunActivity } from './SunActivity'
import { MercuryActivity } from './MercuryActivity'
import { VenusActivity } from './VenusActivity'
import { EarthActivity } from './EarthActivity'
import { MoonActivity } from './MoonActivity'
import { MarsActivity } from './MarsActivity'
import { JupiterActivity } from './JupiterActivity'
import { SaturnActivity } from './SaturnActivity'
import { UranusActivity } from './UranusActivity'
import { NeptuneActivity } from './NeptuneActivity'

/** One interactive discovery per body. */
export const ACTIVITIES: Record<BodyId, ComponentType<ActivityProps>> = {
  sun: SunActivity,
  mercury: MercuryActivity,
  venus: VenusActivity,
  earth: EarthActivity,
  moon: MoonActivity,
  mars: MarsActivity,
  jupiter: JupiterActivity,
  saturn: SaturnActivity,
  uranus: UranusActivity,
  neptune: NeptuneActivity,
}
