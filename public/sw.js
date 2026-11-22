/* Offline support for رحلة حلا في الفضاء.
 * Strategy: precache the app shell on install; then cache-first for same-origin
 * GET requests (hashed assets never change), network-first for navigations.
 * Bump VERSION to invalidate old caches. */
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

async function serveAudio(req) {
  const key = req.url.split('#')[0]
  const cache = await caches.open(CACHE)
  let full = await cache.match(key)
  if (!full) {
    try {
      const res = await fetch(key) // no Range header: the complete file
      if (res.status !== 200) return res
      await cache.put(key, res.clone())
      full = res
    } catch {
      return Response.error()
    }
  }
  const range = req.headers.get('range')
  if (!range) return full
  const buf = await full.arrayBuffer()
  const m = /bytes=(\d*)-(\d*)/.exec(range) || []
  const start = m[1] ? Number(m[1]) : 0
  const end = m[2] ? Math.min(Number(m[2]), buf.byteLength - 1) : buf.byteLength - 1
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  })
}
