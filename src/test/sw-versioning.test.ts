/**
 * Audit finding A002-03: a re-recorded clip at the same file path must never be
 * answered from an old cached take — online or offline — after a release.
 * The app now asks for …/clip.mp3?v=<fingerprint>; these tests drive the REAL
 * public/sw.js with synthetic "recordings" (no real audio, no Gemini calls).
 */
import { SCOPE, bytesOf, fingerprintOf, loadWorker, makeCacheStorage } from './swHarness'

const PATH = `${SCOPE}audio/ar-EG/narrator/welcome/home.hello.mp3`
const OLD = Uint8Array.from({ length: 800 }, (_, i) => i % 7) // the take an old install has cached
const NEW = Uint8Array.from({ length: 900 }, (_, i) => (i * 13) % 256) // the re-recording at the same path
const serving = (data: Uint8Array) => (url: string) =>
  new URL(url).pathname === new URL(PATH).pathname ? new Response(data.slice(), { headers: { 'Content-Type': 'audio/mpeg' } }) : undefined

/** An installation made by the PREVIOUS release: whole clip cached under its plain path. */
async function oldInstallation(data = OLD) {
  const storage = makeCacheStorage()
  const cache = await storage.api.open('hala-space-v2')
  await cache.put(PATH, new Response(data.slice(), { headers: { 'Content-Type': 'audio/mpeg' } }))
  return storage
}

describe('content-addressed narration cache (A002-03)', () => {
  it('after a release, a re-recorded clip plays the NEW take online, then offline — never the cached old one', async () => {
    const storage = await oldInstallation()
    const sw = loadWorker(serving(NEW), storage) // the new release's worker, same cache
    await sw.activate()
    const address = `${PATH}?v=${await fingerprintOf(NEW)}`

    const online = await sw.get(address)
    expect(online.status).toBe(200)
    expect(await bytesOf(online)).toEqual(NEW)
    expect(sw.network.calls).toEqual([address])

    // the old take is gone; only the new one is kept
    expect([...(await storage.contents()).keys()]).toEqual([address])

    sw.network.up = false
    expect(await bytesOf(await sw.get(address))).toEqual(NEW)
    const part = await sw.get(address, { Range: 'bytes=-100' })
    expect(part.status).toBe(206)
    expect(part.headers.get('Content-Range')).toBe(`bytes 800-899/900`)
    expect(await bytesOf(part)).toEqual(NEW.slice(800))
    expect(sw.network.calls).toHaveLength(1)
  })

  it('also replaces an older content-addressed take (?v=old → ?v=new)', async () => {
    const storage = makeCacheStorage()
    const oldAddress = `${PATH}?v=${await fingerprintOf(OLD)}`
    await (await storage.api.open('hala-space-v2')).put(oldAddress, new Response(OLD.slice()))
    const sw = loadWorker(serving(NEW), storage)
    const address = `${PATH}?v=${await fingerprintOf(NEW)}`
    expect(await bytesOf(await sw.get(address))).toEqual(NEW)
    expect([...(await storage.contents()).keys()]).toEqual([address])
  })

  it('an UNCHANGED clip is re-filed from the old cache with no download — so an update still works offline', async () => {
    const storage = await oldInstallation(NEW)
    const sw = loadWorker(serving(NEW), storage)
    await sw.activate()
    sw.network.up = false
    const address = `${PATH}?v=${await fingerprintOf(NEW)}`
    const r = await sw.get(address)
    expect(r.status).toBe(200)
    expect(await bytesOf(r)).toEqual(NEW)
    expect(sw.network.calls).toEqual([]) // nothing downloaded
    expect([...(await storage.contents()).keys()]).toEqual([address])
  })

  it('offline before the new take was ever downloaded: the old take plays (better than silence), then is replaced once online', async () => {
    const storage = await oldInstallation()
    const sw = loadWorker(serving(NEW), storage)
    await sw.activate()
    const address = `${PATH}?v=${await fingerprintOf(NEW)}`

    sw.network.up = false
    expect(await bytesOf(await sw.get(address))).toEqual(OLD)
    expect([...(await storage.contents()).keys()]).toEqual([PATH]) // not filed under the new address

    sw.network.up = true
    expect(await bytesOf(await sw.get(address))).toEqual(NEW)
    sw.network.up = false
    expect(await bytesOf(await sw.get(address))).toEqual(NEW)
    expect([...(await storage.contents()).keys()]).toEqual([address])
  })

  it('a download whose bytes do not match the fingerprint (e.g. a stale CDN copy) is played but not kept', async () => {
    const storage = makeCacheStorage()
    const sw = loadWorker(serving(OLD), storage) // the server still hands out the old take
    const address = `${PATH}?v=${await fingerprintOf(NEW)}`
    expect(await bytesOf(await sw.get(address))).toEqual(OLD)
    expect((await storage.contents()).size).toBe(0)
    await sw.get(address)
    expect(sw.network.calls).toHaveLength(2) // asked again: it will pick up the right take when it arrives
  })

  it('activation keeps the clip cache (no mass re-download), and only prunes other app caches', async () => {
    const storage = await oldInstallation()
    await storage.api.open('hala-space-v1') // a much older cache
    const sw = loadWorker(serving(NEW), storage)
    await sw.activate()
    expect(storage.caches.has('hala-space-v1')).toBe(false)
    expect([...(await storage.contents()).keys()]).toEqual([PATH])
  })

  it('a malformed ?v= is treated as a plain address (cached as-is, no comparison)', async () => {
    const storage = makeCacheStorage()
    const sw = loadWorker(serving(NEW), storage)
    const address = `${PATH}?v=not-a-hash`
    expect(await bytesOf(await sw.get(address))).toEqual(NEW)
    expect([...(await storage.contents()).keys()]).toEqual([address])
  })
})
