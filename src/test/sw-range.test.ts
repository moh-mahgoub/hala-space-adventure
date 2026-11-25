/**
 * Audit finding A002-02: HTTP Range handling for narration clips in the
 * service worker (public/sw.js → serveAudio). The REAL sw.js is loaded into a
 * sandbox with a fake Cache Storage and network, then fetch events are fired
 * at it. A synthetic 1000-byte "clip" stands in for a recording (no real audio,
 * no Gemini calls).
 */
import { SCOPE, loadWorker as loadSW } from './swHarness'

const CLIP = `${SCOPE}audio/ar-EG/narrator/planets/planets.saturn.intro.mp3`
const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => i % 251)

/** The worker, with a fake network serving `body` for the clip (unversioned address). */
function loadWorker(body: Uint8Array, headers: Record<string, string> = {}) {
  const net = { status: 200 }
  const w = loadSW((url) =>
    url === CLIP ? new Response(body.slice(), { status: net.status, headers: { 'Content-Type': 'audio/mpeg', ...headers } }) : undefined,
  )
  const network = {
    get up() {
      return w.network.up
    },
    set up(v: boolean) {
      w.network.up = v
    },
    get calls() {
      return w.network.calls.length
    },
    get status() {
      return net.status
    },
    set status(v: number) {
      net.status = v
    },
  }
  return { get: (h: Record<string, string> = {}) => w.get(CLIP, h), network }
}

const N = 1000
const clip = bytes(N)
const body = async (r: Response) => new Uint8Array(await r.arrayBuffer())

async function expectPartial(r: Response, start: number, end: number, size = N) {
  expect(r.status).toBe(206)
  expect(r.headers.get('Content-Range')).toBe(`bytes ${start}-${end}/${size}`)
  expect(r.headers.get('Content-Length')).toBe(String(end - start + 1))
  expect(r.headers.get('Accept-Ranges')).toBe('bytes')
  expect(r.headers.get('Content-Type')).toBe('audio/mpeg')
  expect(await body(r)).toEqual(clip.slice(start, end + 1))
}
async function expectUnsatisfiable(r: Response, size = N) {
  expect(r.status).toBe(416)
  expect(r.headers.get('Content-Range')).toBe(`bytes */${size}`)
  expect((await body(r)).length).toBe(0)
}
async function expectWhole(r: Response, data = clip) {
  expect(r.status).toBe(200)
  expect(r.headers.get('Content-Range')).toBeNull()
  expect(await body(r)).toEqual(data)
}

describe('service worker Range handling (A002-02)', () => {
  it('no Range header: the whole clip, 200', async () => {
    const { get } = loadWorker(clip)
    await expectWhole(await get())
  })

  it('bounded ranges', async () => {
    const { get } = loadWorker(clip)
    await expectPartial(await get({ Range: 'bytes=0-99' }), 0, 99)
    await expectPartial(await get({ Range: 'bytes=100-199' }), 100, 199)
    await expectPartial(await get({ Range: 'bytes=0-0' }), 0, 0)
    await expectPartial(await get({ Range: 'bytes=999-999' }), 999, 999)
  })

  it('a last-byte past the end is clamped to the end', async () => {
    const { get } = loadWorker(clip)
    await expectPartial(await get({ Range: 'bytes=900-5000' }), 900, 999)
  })

  it('suffix ranges are the LAST n bytes (the old code returned bytes 0–500)', async () => {
    const { get } = loadWorker(clip)
    await expectPartial(await get({ Range: 'bytes=-500' }), 500, 999)
    await expectPartial(await get({ Range: 'bytes=-1' }), 999, 999)
  })

  it('an oversized suffix is the whole file, as a 206', async () => {
    const { get } = loadWorker(clip)
    await expectPartial(await get({ Range: 'bytes=-5000' }), 0, 999)
    await expectPartial(await get({ Range: 'bytes=-1000' }), 0, 999)
  })

  it('open-ended ranges run to the end', async () => {
    const { get } = loadWorker(clip)
    await expectPartial(await get({ Range: 'bytes=0-' }), 0, 999)
    await expectPartial(await get({ Range: 'bytes=990-' }), 990, 999)
  })

  it('reversed ranges are invalid: 416 with bytes */N', async () => {
    const { get } = loadWorker(clip)
    await expectUnsatisfiable(await get({ Range: 'bytes=500-100' }))
  })

  it('out-of-bounds ranges: 416 with bytes */N', async () => {
    const { get } = loadWorker(clip)
    await expectUnsatisfiable(await get({ Range: 'bytes=1000-' }))
    await expectUnsatisfiable(await get({ Range: 'bytes=1000-1100' }))
    await expectUnsatisfiable(await get({ Range: 'bytes=1500-1600' }))
    await expectUnsatisfiable(await get({ Range: 'bytes=-0' })) // a zero-length suffix
  })

  it('malformed headers or another unit are ignored: the whole clip, 200', async () => {
    const { get } = loadWorker(clip)
    for (const h of ['bytes=abc', 'bytes=1-2-3', 'bytes=-', 'bytes=', 'bytes=1.5-2', 'bytes=+1-2', 'items=0-10', '0-10', 'bytes 0-10'])
      await expectWhole(await get({ Range: h }))
  })

  it('several ranges in one request: policy = ignore Range, the whole clip, 200', async () => {
    const { get } = loadWorker(clip)
    for (const h of ['bytes=0-1,5-6', 'bytes=0-99, 200-299', 'bytes=-10,0-5', 'bytes=0-1,'])
      await expectWhole(await get({ Range: h }))
  })

  it('unit and spacing are read leniently', async () => {
    const { get } = loadWorker(clip)
    await expectPartial(await get({ Range: 'Bytes=0-9' }), 0, 9)
    await expectPartial(await get({ Range: 'bytes = 10-19' }), 10, 19)
  })

  it('a zero-length clip: whole = 200 empty; every range = 416 bytes */0', async () => {
    const empty = new Uint8Array(0)
    const { get } = loadWorker(empty)
    await expectWhole(await get(), empty)
    for (const h of ['bytes=0-', 'bytes=0-0', 'bytes=-10', 'bytes=-0']) await expectUnsatisfiable(await get({ Range: h }), 0)
  })

  it('If-Range: a matching strong ETag gets the part; anything else gets the whole clip', async () => {
    const { get } = loadWorker(clip, { ETag: '"abc"', 'Last-Modified': 'Tue, 24 Nov 2026 10:00:00 GMT' })
    await expectPartial(await get({ Range: 'bytes=0-9', 'If-Range': '"abc"' }), 0, 9)
    await expectPartial(await get({ Range: 'bytes=0-9', 'If-Range': 'Tue, 24 Nov 2026 10:00:00 GMT' }), 0, 9)
    await expectWhole(await get({ Range: 'bytes=0-9', 'If-Range': '"other"' }))
    await expectWhole(await get({ Range: 'bytes=0-9', 'If-Range': 'W/"abc"' }))
    await expectWhole(await get({ Range: 'bytes=0-9', 'If-Range': 'Mon, 01 Jan 2024 00:00:00 GMT' }))
  })

  it('cached / offline: the clip is fetched once, then ranges are served from the cache with the network down', async () => {
    const { get, network } = loadWorker(clip)
    await expectPartial(await get({ Range: 'bytes=0-' }), 0, 999) // first play: downloads the whole clip
    expect(network.calls).toBe(1)
    network.up = false // offline
    await expectPartial(await get({ Range: 'bytes=-500' }), 500, 999)
    await expectPartial(await get({ Range: 'bytes=100-199' }), 100, 199)
    await expectUnsatisfiable(await get({ Range: 'bytes=2000-' }))
    await expectWhole(await get())
    expect(network.calls).toBe(1) // never went back to the network
  })

  it('offline and never cached: a network error, not a fake answer', async () => {
    const { get, network } = loadWorker(clip)
    network.up = false
    const r = await get({ Range: 'bytes=0-' })
    expect(r.type).toBe('error')
  })

  it('a failed download (e.g. 404) is passed through and not cached', async () => {
    const { get, network } = loadWorker(clip)
    network.status = 404
    expect((await get({ Range: 'bytes=0-' })).status).toBe(404)
    network.status = 200
    await expectPartial(await get({ Range: 'bytes=0-9' }), 0, 9)
    expect(network.calls).toBe(2)
  })
})
