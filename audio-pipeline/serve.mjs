#!/usr/bin/env node
// Serves audition/out on your local network so you can listen on the iPad
// (same Wi-Fi). Local only — nothing is published.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'audition', 'out')
const PORT = Number(process.env.PORT || 5050)
const TYPES = { '.html': 'text/html; charset=utf-8', '.mp3': 'audio/mpeg', '.json': 'application/json' }

createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html'
  const file = path.join(ROOT, rel)
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end('not found')
    return
  }
  const size = statSync(file).size
  const type = TYPES[path.extname(file)] || 'application/octet-stream'
  // Range support: Safari needs it for <audio>
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/)
  if (range) {
    const start = Number(range[1] || 0)
    const end = range[2] ? Number(range[2]) : size - 1
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
    createReadStream(file, { start, end }).pipe(res)
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' })
    createReadStream(file).pipe(res)
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Audition page: http://localhost:${PORT}/`)
  for (const list of Object.values(networkInterfaces()))
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) console.log(`On the iPad (same Wi-Fi): http://${a.address}:${PORT}/`)
})
