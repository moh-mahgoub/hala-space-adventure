// Prints every narration line id and its text — handy when recording real narration.
// Usage: npm run list-lines   (tab-separated: id <TAB> text). Needs Node ≥ 22.18 (built-in TS type stripping).
import { script } from '../src/content/script.ts'
import { STORY } from '../src/content/story.ts'

const out = []
const walk = (o, path) => {
  if (typeof o === 'string') out.push([path.join('.'), o])
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, [...path, k])
}
walk(script, [])
STORY.forEach((c) =>
  c.steps.forEach((s, i) => {
    out.push([`story.${c.id}.${i}`, s.text])
    if (s.done) out.push([`story.${c.id}.${i}.done`, s.done])
    s.options?.forEach((o, j) => out.push([`story.${c.id}.${i}.reply${j}`, o.reply]))
  }),
)
for (const [id, text] of out) if (!id.includes('factIcons') && !id.startsWith('games.names')) console.log(`${id}\t${text}`)
