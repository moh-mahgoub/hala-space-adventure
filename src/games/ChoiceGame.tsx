/**
 * Shared engine for the tap-the-answer games:
 *   find   — "فين كوكب زحل؟" with 3 planets
 *   shadow — match a silhouette to its planet
 *   size   — which of two planets is really bigger?
 * Mistakes get a gentle hint, never a penalty.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { line, narrator, sfx } from '../audio'
import { Celebration, Confetti } from '../components/Celebration'
import { PlanetArt } from '../components/PlanetArt'
import { TopBar } from '../components/TopBar'
import { script } from '../content/script'
import { ui } from '../content/ui'
import { BODIES, relativeToEarth, type BodyId } from '../data/planets'
import { earn } from '../state/rewards'
import { react } from '../profile/reactions'
import { checkAnswer, makeChoiceRounds, makeSizeRounds, shouldHint, type ChoiceRound } from './logic'

export type ChoiceKind = 'find' | 'shadow' | 'size'

const ROUNDS = 5

function buildRounds(kind: ChoiceKind): ChoiceRound[] {
  if (kind === 'size') return makeSizeRounds(ROUNDS).map((r) => ({ target: r.bigger, choices: [r.a, r.b] }))
  return makeChoiceRounds(ROUNDS)
}

function questionLine(kind: ChoiceKind, round: ChoiceRound) {
  if (kind === 'size')
    return line('games.size.question', { a: BODIES[round.choices[0]].nameAr, b: BODIES[round.choices[1]].nameAr, aId: round.choices[0], bId: round.choices[1] })
  return line(`games.${kind}.question`, { planet: BODIES[round.target].nameAr, planetId: round.target })
}

export function ChoiceGame({ kind }: { kind: ChoiceKind }) {
  const [game, setGame] = useState(0)
  const rounds = useMemo(() => buildRounds(kind), [kind, game]) // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0)
  const [wrong, setWrong] = useState<BodyId[]>([])
  const [solved, setSolved] = useState(false)
  const [finished, setFinished] = useState(false)
  const [shake, setShake] = useState<BodyId | null>(null)
  const praiseIdx = useRef(0)
  const round = rounds[index]

  const ask = (withIntro: boolean) => {
    const lines = [questionLine(kind, round)]
    if (withIntro) lines.unshift(line(`games.${kind}.intro`))
    void narrator.say(lines)
  }

  useEffect(() => {
    ask(index === 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, game])

  const choose = (id: BodyId) => {
    if (solved || finished) return
    if (checkAnswer(round, id) === 'correct') {
      setSolved(true)
      sfx('success')
      // alternate her catch-phrase with the other praise lines so it stays fresh
      const n = praiseIdx.current++
      const cheer = react('correct', n % 2 === 0 ? {} : { line: line(`common.praise.${(n >> 1) % script.common.praise.length}`) })
      void narrator
        .say([
          cheer,
          line(`games.${kind}.correct`, { planet: BODIES[round.target].nameAr, planetId: round.target }),
        ])
        .then((completed) => {
          if (!completed) return
          if (index + 1 < rounds.length) {
            setIndex(index + 1)
            setWrong([])
            setSolved(false)
          } else {
            setFinished(true)
            earn(`game:${kind}`)
            void narrator.say(line(`games.${kind}.end`))
          }
        })
    } else {
      sfx('gentle')
      setShake(id)
      window.setTimeout(() => setShake(null), 1000)
      const nextWrong = wrong.includes(id) ? wrong : [...wrong, id]
      setWrong(nextWrong)
      const lines = [line(`games.${kind}.wrong`, { chosen: BODIES[id].nameAr, planet: BODIES[round.target].nameAr, chosenId: id, planetId: round.target })]
      if (shouldHint(nextWrong.length)) lines.push(line(`games.${kind}.hint`, { planet: BODIES[round.target].nameAr, planetId: round.target }))
      void narrator.say(lines)
    }
  }

  // "continue" safety: if narration was interrupted after solving, allow manual next
  const goNext = () => {
    narrator.stop()
    if (index + 1 < rounds.length) {
      setIndex(index + 1)
      setWrong([])
      setSolved(false)
    } else {
      setFinished(true)
      earn(`game:${kind}`)
    }
  }

  const restart = () => {
    setFinished(false)
    setIndex(0)
    setWrong([])
    setSolved(false)
    setGame((g) => g + 1)
  }

  const hint = shouldHint(wrong.length)
  const title = script.games.names[kind]
  const maxRel = Math.max(...round.choices.map(relativeToEarth))

  return (
    <div className="screen" data-testid={`game-${kind}`}>
      <TopBar back={{ name: 'games' }} title={title} onReplay={() => ask(false)} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-20">
        {/* round progress */}
        <div className="flex gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={ROUNDS} aria-valuenow={index} aria-label="الجولات">
          {rounds.map((_, i) => (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                i < index || (i === index && solved) ? 'bg-yellow-300 text-night-900' : 'border-2 border-white/40'
              }`}
            >
              {i < index || (i === index && solved) ? '★' : ''}
            </span>
          ))}
        </div>

        {kind === 'shadow' && (
          <div className="relative my-3 aspect-square w-[min(34vw,26vh)]" data-testid="shadow-target">
            <div className="absolute inset-[-8%] rounded-[2rem] bg-gradient-to-b from-sky-100 to-indigo-200 shadow-inner" />
            <div className="relative h-full w-full">
              <PlanetArt id={round.target} silhouette={!solved} spin={solved} />
            </div>
          </div>
        )}
        <p className="text-center text-3xl font-extrabold text-shadow sm:text-4xl" data-testid="question">
          {kind === 'find' && <>فين {BODIES[round.target].nameAr}؟</>}
          {kind === 'shadow' && <>ده ضل مين؟</>}
          {kind === 'size' && <>مين أكبر؟</>}
        </p>

        <div className="flex w-full max-w-4xl items-end justify-center gap-[4vw]">
          {round.choices.map((id) => {
            const isTarget = id === round.target
            const glow = (hint && isTarget && !solved) || (solved && isTarget)
            const dim = solved && !isTarget
            // In the size game, after answering, show the TRUE relative sizes
            const scale = kind === 'size' && solved ? relativeToEarth(id) / maxRel : 1
            return (
              <button
                key={`${index}-${id}`}
                type="button"
                data-testid={`choice-${id}`}
                data-target={isTarget ? 'yes' : 'no'}
                aria-label={BODIES[id].nameAr}
                onClick={() => choose(id)}
                className={`btn-pop relative flex flex-col items-center gap-2 rounded-[2rem] p-3 transition-opacity ${
                  dim ? 'opacity-40' : ''
                } ${shake === id ? 'anim-wiggle' : ''}`}
                style={{ width: kind === 'size' ? 'min(36vw, 42vh)' : 'min(26vw, 30vh)' }}
              >
                {glow && <span className="anim-pulse-glow absolute inset-0 rounded-[2rem] border-4 border-yellow-300" aria-hidden />}
                <div className="flex aspect-square w-full items-center justify-center">
                  <div
                    className="aspect-square transition-all duration-700"
                    style={{ width: `${Math.max(6, scale * 100)}%` }}
                  >
                    <PlanetArt id={id} spin />
                  </div>
                </div>
                {(solved || kind === 'size' || wrong.includes(id)) && (
                  <span className="anim-fade text-2xl font-bold">{BODIES[id].nameAr}</span>
                )}
                {wrong.includes(id) && !isTarget && (
                  <span className="absolute top-2 left-2 text-2xl" aria-hidden>
                    🤔
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {solved && !finished && (
          <button
            type="button"
            onClick={goNext}
            data-testid="next-round"
            className="btn-pop anim-pop rounded-full bg-gradient-to-b from-emerald-300 to-teal-500 px-8 py-3 text-2xl font-extrabold text-night-900"
          >
            {ui.continue} ←
          </button>
        )}
      </div>
      {solved && <Confetti pieces={20} key={index} />}
      {finished && (
        <Celebration title="برافو!" icon="🌟" onClose={restart}>
          <p className="text-2xl font-bold">{ui.playAgain} 🔁</p>
        </Celebration>
      )}
    </div>
  )
}
