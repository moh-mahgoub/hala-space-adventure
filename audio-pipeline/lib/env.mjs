// Credentials come ONLY from the environment or a git-ignored .env.local file.
// Never hardcode keys; never commit them. They are only used by these
// development-time scripts — the website itself never talks to a TTS service.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

let loaded = false
export function loadEnv(root = process.cwd()) {
  if (loaded) return
  loaded = true
  for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

export function env(name) {
  loadEnv()
  const v = process.env[name]
  return v && v.trim() ? v.trim() : null
}
