/**
 * Helpers that turn a script id (e.g. `planets.earth.intro`) into spoken text.
 */
import { script } from './script'
import { STORY } from './story'

export const DEFAULT_CHILD_NAME = 'حلا'

export type Params = Record<string, string | number>

/** A line ready to be narrated. `id` is used to look up recorded audio. */
export interface Line {
  id?: string
  /** Template text (may contain {name} and other placeholders) */
  template: string
  params?: Params
}

function resolvePath(root: unknown, path: string[]): unknown {
  let cur: unknown = root
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

/** Look up raw template text by dotted id. Throws in dev for typos. */
export function templateFor(id: string): string {
  const parts = id.split('.')
  let value: unknown
  if (parts[0] === 'story') {
    const chapter = STORY.find((c) => c.id === parts[1])
    const step = chapter?.steps[Number(parts[2])]
    if (step) {
      const sub = parts[3]
      if (!sub) value = step.text
      else if (sub === 'done' && 'done' in step) value = step.done
      else if (sub.startsWith('reply') && step.type === 'choice') value = step.options[Number(sub.slice(5))]?.reply
    }
  } else {
    value = resolvePath(script, parts)
  }
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) console.warn(`[narration] missing line: ${id}`)
    return ''
  }
  return value
}

export function line(id: string, params?: Params): Line {
  return { id, template: templateFor(id), params }
}

/** Fill `{name}` and other placeholders. */
export function fill(template: string, childName: string, params: Params = {}): string {
  const all: Params = { name: childName || DEFAULT_CHILD_NAME, ...params }
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in all ? String(all[key]) : m))
}

/** True if the template only uses {name} (or nothing) — safe for a single recording. */
export function isStaticTemplate(template: string): boolean {
  const keys = [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
  return keys.every((k) => k === 'name')
}
