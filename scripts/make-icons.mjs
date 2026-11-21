// Renders public/icon.svg to the PNG sizes needed by iOS / PWA. Run: node scripts/make-icons.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const svg = readFileSync(path.join(root, 'public/icon.svg'), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:#0d1036">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: path.join(root, 'public', name), omitBackground: false })
  console.log('wrote', name)
}
await browser.close()
