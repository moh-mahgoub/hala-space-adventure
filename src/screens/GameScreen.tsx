import { ChoiceGame } from '../games/ChoiceGame'
import { DayNightGame } from '../games/DayNightGame'
import { ExplorerGame } from '../games/ExplorerGame'
import { OrderGame } from '../games/OrderGame'
import type { GameId } from '../state/progress'

export function GameScreen({ id }: { id: GameId }) {
  switch (id) {
    case 'find':
      return <ChoiceGame kind="find" />
    case 'shadow':
      return <ChoiceGame kind="shadow" />
    case 'size':
      return <ChoiceGame kind="size" />
    case 'order':
      return <OrderGame />
    case 'dayNight':
      return <DayNightGame />
    case 'explorer':
      return <ExplorerGame />
  }
}
