/* Offline support for رحلة حلا في الفضاء.
 * Strategy: precache the app shell on install; then cache-first for same-origin
 * GET requests (hashed assets never change), network-first for navigations.
 * Bump VERSION to invalidate old caches (narration clips don't need it: they
 * are content-addressed, see serveAudio). */
const VERSION = 'v2'
const CACHE = `hala-space-${VERSION}`
const SCOPE = self.registration.scope
const SHELL = ['', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].map(
  (p) => new URL(p, SCOPE).toString(),
)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hala-space-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || !req.url.startsWith(SCOPE)) return

  // Narration clips: cache the WHOLE file once, answer Range requests (which
  // <audio> uses, and Safari requires) by slicing the cached copy → offline replay.
  if (url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(serveAudio(req))
    return
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(new URL('index.html', SCOPE).toString(), copy))
          return res
        })
        .catch(() => caches.match(new URL('index.html', SCOPE).toString())),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})

/**
 * HTTP Range handling for the cached narration clips (audit finding A002-02),
 * following RFC 9110 §14:
 *
 *   bytes=a-b      → 206 for a..min(b, N-1)                 (bounded)
 *   bytes=a-       → 206 for a..N-1                         (open-ended)
 *   bytes=-n       → 206 for the last min(n, N) bytes       (suffix; oversized = whole file)
 *   a ≥ N, -0, or any range of an empty file
 *                  → 416, Content-Range: bytes * /N         (unsatisfiable)
 *   a > b          → 416 (an invalid range-spec, §14.1.1)   (reversed)
 *   malformed syntax, another unit, or SEVERAL ranges
 *                  → the Range header is ignored: 200 with the whole file
 *                    (§14.2 lets a server ignore Range; media players ask for one range)
 *   If-Range that doesn't match the cached ETag / Last-Modified
 *                  → 200 with the whole file (§13.1.5)
 *
 * Returns { type: 'full' } | { type: 'partial', start, end } | { type: 'unsatisfiable' }.
 */
function byteRange(header, size) {
  if (header == null) return { type: 'full' }
  const m = /^\s*bytes\s*=\s*(.*)$/i.exec(header)
  if (!m) return { type: 'full' } // another unit, or not a range at all
  const specs = m[1].split(',').map((s) => s.trim())
  if (specs.length !== 1) return { type: 'full' } // several ranges (or an empty item): policy = whole file
  const spec = /^(\d*)-(\d*)$/.exec(specs[0])
  if (!spec || (spec[1] === '' && spec[2] === '')) return { type: 'full' } // malformed
  if (spec[1] === '') {
    // suffix: the last n bytes
    const n = Number(spec[2])
    if (n === 0 || size === 0) return { type: 'unsatisfiable' }
    return { type: 'partial', start: Math.max(0, size - n), end: size - 1 }
  }
  const first = Number(spec[1])
  if (spec[2] !== '' && Number(spec[2]) < first) return { type: 'unsatisfiable' } // reversed: invalid
  if (first >= size) return { type: 'unsatisfiable' }
  const last = spec[2] === '' ? size - 1 : Math.min(Number(spec[2]), size - 1)
  return { type: 'partial', start: first, end: last }
}

/** If-Range: only serve a part if the validator still matches the cached file (strong ETag or exact date). */
function ifRangeMatches(value, cached) {
  if (value == null) return true
  const v = value.trim()
  if (v.startsWith('W/')) return false // weak validators never match (§13.1.5)
  if (v.startsWith('"')) {
    const etag = cached.headers.get('ETag')
    return !!etag && !etag.startsWith('W/') && etag === v
  }
  const lastModified = cached.headers.get('Last-Modified')
  return !!lastModified && lastModified === v
}

/** First 12 hex digits of the SHA-256 of a response body (the app's ?v= fingerprint). */
async function fingerprint(res) {
  const digest = await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer())
  return Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Other cached copies of the same clip (same path, another ?v= or none — older takes). */
async function otherTakes(cache, url) {
  const keys = await cache.keys()
  return keys.filter((k) => {
    const u = new URL(k.url)
    return u.pathname === url.pathname && u.href !== url.href
  })
}

/**
 * Narration clips are content-addressed (audit finding A002-03): the app asks for
 * …/clip.mp3?v=<fingerprint of the recording>, so a re-recorded clip has a new
 * address and is never answered from an old take.
 *   • cached under that exact address → served from the cache (offline too)
 *   • an older copy of the clip whose bytes match the fingerprint → re-filed under
 *     the new address, no download (an update keeps working offline)
 *   • otherwise → downloaded once; kept only if its bytes match the fingerprint;
 *     older takes of that clip are then deleted
 *   • offline and the new take was never downloaded → the older take is played
 *     (better than silence) and the new one is fetched next time online
 */
async function obtainClip(cache, key) {
  const url = new URL(key)
  const version = url.searchParams.get('v')
  const versioned = !!version && /^[0-9a-f]{12}$/.test(version)
  const older = await otherTakes(cache, url)
  if (versioned) {
    for (const k of older) {
      const copy = await cache.match(k)
      if (copy && (await fingerprint(copy)) === version) {
        await cache.put(key, copy.clone())
        await Promise.all(older.map((o) => cache.delete(o)))
        return copy
      }
    }
  }
  let res
  try {
    res = await fetch(key) // no Range header: the complete file
  } catch {
    for (const k of older) {
      const copy = await cache.match(k)
      if (copy) return copy
    }
    return Response.error()
  }
  if (res.status !== 200) return res
  if (!versioned || (await fingerprint(res)) === version) {
    await cache.put(key, res.clone())
    await Promise.all(older.map((o) => cache.delete(o)))
  }
  return res
}

async function serveAudio(req) {
  const key = req.url.split('#')[0]
  const cache = await caches.open(CACHE)
  let full = await cache.match(key)
  if (!full) {
    full = await obtainClip(cache, key)
    if (full.type === 'error' || full.status !== 200) return full
  }
  const header = req.headers.get('range')
  if (header == null || !ifRangeMatches(req.headers.get('if-range'), full)) return full
  const buf = await full.arrayBuffer()
  const size = buf.byteLength
  const type = full.headers.get('Content-Type') || 'audio/mpeg'
  const r = byteRange(header, size)
  if (r.type === 'full') {
    return new Response(buf, {
      status: 200,
      headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' },
    })
  }
  if (r.type === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' },
    })
  }
  return new Response(buf.slice(r.start, r.end + 1), {
    status: 206,
    headers: {
      'Content-Type': type,
      'Content-Range': `bytes ${r.start}-${r.end}/${size}`,
      'Content-Length': String(r.end - r.start + 1),
      'Accept-Ranges': 'bytes',
    },
  })
}
