/**
 * Runs the REAL public/sw.js in a sandbox with a fake Cache Storage and a fake
 * network, so tests can fire fetch / activate events at it. No real audio, no
 * Gemini calls: tests pass synthetic byte arrays.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { webcrypto } from 'node:crypto'
import vm from 'node:vm'

export const SCOPE = 'https://hala.test/hala-space-adventure/'
export const SW_SOURCE = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf8')

/** What the fake network answers for a URL (undefined = 404). */
export type Server = (url: string) => Response | undefined

/** The fake Cache Storage, kept OUTSIDE the worker so a test can "upgrade" the worker and keep the cache. */
export function makeCacheStorage() {
  const caches = new Map<string, Map<string, Response>>()
  const open = (name: string) => {
    if (!caches.has(name)) caches.set(name, new Map())
    const store = caches.get(name)!
    return {
      store,
      match: async (k: string | Request) => store.get(typeof k === 'string' ? k : k.url)?.clone(),
      put: async (k: string | Request, r: Response) => void store.set(typeof k === 'string' ? k : k.url, r),
      delete: async (k: string | Request) => store.delete(typeof k === 'string' ? k : k.url),
      keys: async () => [...store.keys()].map((u) => new Request(u)),
      addAll: async () => {},
    }
  }
  return {
    caches,
    api: {
      open: async (name: string) => open(name),
      keys: async () => [...caches.keys()],
      delete: async (name: string) => caches.delete(name),
      match: async () => undefined,
    },
    /** what is stored right now: url → bytes */
    async contents(name = 'hala-space-v2') {
      const out = new Map<string, Uint8Array>()
      for (const [k, r] of caches.get(name) ?? []) out.set(k, new Uint8Array(await r.clone().arrayBuffer()))
      return out
    },
  }
}

export function loadWorker(server: Server, storage = makeCacheStorage(), source = SW_SOURCE) {
  const network = { up: true, calls: [] as string[] }
  const listeners: Record<string, (e: unknown) => void> = {}
  const sandbox: Record<string, unknown> = {
    self: {
      registration: { scope: SCOPE },
      location: { origin: 'https://hala.test' },
      addEventListener: (t: string, fn: (e: unknown) => void) => (listeners[t] = fn),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: storage.api,
    crypto: webcrypto,
    fetch: async (url: string) => {
      network.calls.push(url)
      if (!network.up) throw new TypeError('offline')
      return server(url) ?? new Response('nope', { status: 404 })
    },
    Response,
    Request,
    Headers,
    URL,
  }
  vm.runInNewContext(source, sandbox)
  /** Deliver an event to the worker's listener (no network involved). */
  const dispatch = (type: string, event: unknown) => listeners[type]?.(event)

  /** Fire a fetch event at the worker and return its response. */
  async function get(url: string, reqHeaders: Record<string, string> = {}): Promise<Response> {
    let responded: Promise<Response> | undefined
    dispatch('fetch', {
      request: new Request(url, { headers: reqHeaders }),
      respondWith: (p: Promise<Response>) => (responded = p),
    })
    if (!responded) throw new Error('the worker did not answer')
    return responded
  }
  /** Fire the activate event (a new release taking over) and wait for it. */
  async function activate() {
    let done: Promise<unknown> = Promise.resolve()
    dispatch('activate', { waitUntil: (p: Promise<unknown>) => (done = p) })
    await done
  }
  return { get, activate, network, storage }
}

export const bytesOf = async (r: Response) => new Uint8Array(await r.arrayBuffer())

/** The app's ?v= fingerprint: first 12 hex of SHA-256. */
export async function fingerprintOf(data: Uint8Array) {
  const d = new Uint8Array(await webcrypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer))
  return Array.from(d.slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('')
}
