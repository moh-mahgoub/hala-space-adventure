import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Synthetic, drawn test images — never a real child's photo.
const here = path.dirname(fileURLToPath(import.meta.url))
const FACE = path.join(here, 'fixtures/synthetic-face.png')
const CARTOON = path.join(here, 'fixtures/synthetic-cartoon.png')

/** Record every network request so we can prove nothing is uploaded. */
function watchNetwork(page: Page) {
  const reqs: { method: string; url: string; body: string | null }[] = []
  page.on('request', (r) => reqs.push({ method: r.method(), url: r.url(), body: r.postData() }))
  return reqs
}

async function start(page: Page, surprises: 'never' | 'always' = 'never') {
  // surprises are random by design; pin them so assertions are deterministic
  await page.addInitScript((v) => localStorage.setItem('hala-space:debug-surprises', v), surprises)
  await page.goto('./')
  await page.getByRole('button', { name: 'يلا نبدأ!' }).click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
}

async function openAstronautPanel(page: Page) {
  if (!(await page.getByTestId('home-screen').isVisible())) {
    await page.evaluate(() => (location.hash = '#/'))
  }
  const gate = page.getByTestId('parent-gate')
  await gate.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true })
  await page.waitForTimeout(3300)
  await gate.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true })
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByTestId('tab-astronaut').click()
  await expect(page.getByTestId('personalize-panel')).toBeVisible()
}

async function closePanel(page: Page) {
  await page.getByRole('button', { name: 'إغلاق (Close)' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** Drag inside the crop frame with touch-type pointer events (iPad-style). */
async function dragCrop(page: Page, dx: number, dy: number) {
  const frame = page.getByTestId('crop-frame')
  const b = (await frame.boundingBox())!
  const x = b.x + b.width / 2
  const y = b.y + b.height / 2
  const ev = { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true }
  await frame.dispatchEvent('pointerdown', { ...ev, clientX: x, clientY: y })
  for (let i = 1; i <= 5; i++) await frame.dispatchEvent('pointermove', { ...ev, clientX: x + (dx * i) / 5, clientY: y + (dy * i) / 5 })
  await frame.dispatchEvent('pointerup', { ...ev, clientX: x + dx, clientY: y + dy })
}

async function uploadPhoto(page: Page, file = FACE, kind: 'photo' | 'cartoon' = 'photo') {
  await page.getByTestId(`file-${kind}`).setInputFiles(file)
  await expect(page.getByTestId('crop-editor')).toBeVisible()
  await page.getByTestId('crop-zoom').fill('1.6')
  await dragCrop(page, 0, 30)
  await page.getByTestId('crop-save').click()
  await expect(page.getByTestId('crop-editor')).toHaveCount(0)
  await expect(page.getByTestId(`image-row-${kind}`).locator('image')).toHaveCount(1)
}

const faceIn = (page: Page, scope = page.locator('body')) => scope.locator('[data-child-face="photo"]')

test('upload + crop a photo; it appears across the adventure and survives a reload', async ({ page }) => {
  const reqs = watchNetwork(page)
  await start(page)
  await expect(page.locator('[data-child-face="default"]').first()).toBeVisible() // works with no photo
  await openAstronautPanel(page)
  await expect(page.getByTestId('privacy-note')).toContainText('never uploaded')
  await uploadPhoto(page)
  await expect(page.getByTestId('look-photo')).toHaveAttribute('aria-checked', 'true')
  await closePanel(page)

  // scenes where her face must appear
  const scenes: [string, string][] = [
    ['#/', 'home'],
    ['#/story/1', 'story: face in the spaceship window'],
    ['#/planet/mars', 'Mars: driving the rover'],
    ['#/planet/saturn', 'Saturn: floating by the rings'],
    ['#/game/explorer', 'Explorer: pilot in the cockpit'],
    ['#/game/dayNight', 'Day & night panel'],
  ]
  for (const [hash, name] of scenes) {
    await page.evaluate((h) => (location.hash = h), hash)
    await page.waitForTimeout(500)
    expect(await faceIn(page).count(), name).toBeGreaterThan(0)
  }

  // refresh: still there (IndexedDB), including on the welcome screen
  await page.reload()
  await expect(faceIn(page, page.getByTestId('start-screen')).first()).toBeVisible()

  // privacy: nothing but same-origin GETs, ever
  for (const r of reqs) {
    expect(r.method, r.url).toBe('GET')
    expect(r.body).toBeNull()
    // blob: URLs are in-memory reads of the locally stored face (never network);
    // they must still belong to this page's own origin
    const url = r.url.startsWith('blob:') ? r.url.slice(5) : r.url
    expect(new URL(url).hostname, r.url).toBe('localhost')
  }
  expect(reqs.filter((r) => !r.url.startsWith('blob:') && /\.(jpe?g|png|webp|heic)$/i.test(r.url) && !/icon/.test(r.url))).toEqual([])
})

test('replace, choose looks, import a cartoon, then delete everything', async ({ page }) => {
  await start(page)
  await openAstronautPanel(page)
  // looks needing a picture are disabled at first
  await expect(page.getByTestId('look-photo')).toBeDisabled()
  await expect(page.getByTestId('look-cartoon')).toBeDisabled()
  await uploadPhoto(page)

  // sticker look uses the same photo with a funny outline
  await page.getByTestId('look-sticker').click()
  await closePanel(page)
  await expect(page.locator('[data-child-face="sticker"]').first()).toBeVisible()

  // imported cartoon portrait
  await openAstronautPanel(page)
  await uploadPhoto(page, CARTOON, 'cartoon')
  await page.getByTestId('look-cartoon').click()
  await closePanel(page)
  await expect(page.locator('[data-child-face="cartoon"]').first()).toBeVisible()

  // re-crop the photo
  await openAstronautPanel(page)
  await page.getByTestId('recrop-photo').click()
  await expect(page.getByTestId('crop-editor')).toBeVisible()
  await page.getByTestId('crop-zoom').fill('2.5')
  await page.getByTestId('crop-save').click()

  // delete (two taps to confirm)
  await page.getByTestId('delete-photo').click()
  await page.getByTestId('delete-photo').click()
  await page.getByTestId('delete-cartoon').click()
  await page.getByTestId('delete-cartoon').click()
  await expect(page.getByTestId('upload-photo')).toContainText('Upload')
  await closePanel(page)
  await expect(page.locator('[data-child-face="default"]').first()).toBeVisible()
  await expect(page.locator('[data-child-face="photo"], [data-child-face="cartoon"], [data-child-face="sticker"]')).toHaveCount(0)

  // gone after reload too
  await page.reload()
  await expect(page.locator('[data-child-face="default"]').first()).toBeVisible()
  const stored = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('hala-space-images')
        req.onsuccess = () => {
          const db = req.result
          const c = db.transaction('images').objectStore('images').count()
          c.onsuccess = () => resolve(c.result)
        }
      }),
  )
  expect(stored).toBe(0)
})

test('her astronaut reacts to real actions', async ({ page }) => {
  await start(page)
  // tapping the Sun
  await page.evaluate(() => (location.hash = '#/planet/sun'))
  await page.getByTestId('activity-target').click()
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'sun')
  await expect(page.getByTestId('avatar-reaction')).toContainText('الشمس منورة قوي')

  // a correct answer in "find the planet"
  await page.evaluate(() => (location.hash = '#/game/find'))
  await page.locator('[data-target=yes]').click()
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'correct')
  await expect(page.getByTestId('avatar-reaction').getByTestId('astronaut')).toHaveAttribute('data-pose', 'cheer')

  // discovering Saturn's rings
  await page.evaluate(() => (location.hash = '#/planet/saturn'))
  await page.getByRole('button', { name: 'من فوق' }).click()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'من تحت' }).click()
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'saturn')
  await expect(page.getByTestId('avatar-reaction')).toContainText('بصي الحلقات دي')

  // finishing a mission → happy dance
  await page.getByTestId('saturn-rings').click()
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'mission')
  await expect(page.getByTestId('avatar-reaction').getByTestId('astronaut')).toHaveAttribute('data-pose', 'dance')
})

test('moon landing: she plants a flag after one full orbit', async ({ page }) => {
  await start(page)
  await page.evaluate(() => (location.hash = '#/planet/moon'))
  for (let i = 0; i < 8; i++) await page.getByTestId('moon-step').click()
  await expect(page.getByTestId('moon-landing')).toBeVisible()
  await expect(page.getByTestId('moon-landing').getByTestId('astronaut')).toHaveAttribute('data-pose', 'flag')
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'moonFlag')
})

test('surprises can appear (forced via the debug switch) and are friendly', async ({ page }) => {
  await start(page, 'always')
  await page.evaluate(() => (location.hash = '#/space'))
  await expect(page.getByTestId('friendly-alien')).toBeVisible({ timeout: 10_000 })
  await page.getByTestId('friendly-alien').click()
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'alien')

  // a correct answer now comes with the oversized-helmet surprise
  await page.evaluate(() => (location.hash = '#/game/find'))
  await page.locator('[data-target=yes]').click()
  await expect(page.getByTestId('avatar-reaction').locator('.astro-helmet-big')).toHaveCount(1)
})

test('map badges feature her face once earned', async ({ page }) => {
  await start(page)
  await openAstronautPanel(page)
  await uploadPhoto(page)
  await closePanel(page)
  await page.evaluate(() => (location.hash = '#/planet/earth'))
  await page.waitForTimeout(300)
  await page.evaluate(() => (location.hash = '#/map'))
  const first = page.getByTestId('badge-first')
  await expect(first).toHaveAttribute('data-earned', 'yes')
  await expect(faceIn(page, first)).toHaveCount(1)
  await expect(faceIn(page, page.getByTestId('badge-gamer'))).toHaveCount(0) // locked
})

test('rejects a non-image file gracefully', async ({ page }) => {
  await start(page)
  await openAstronautPanel(page)
  await page.getByTestId('file-photo').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(page.getByRole('alert')).toContainText('مش صورة')
})

test('a surprise never steals the mission celebration (dance first, then upside-down)', async ({ page }) => {
  await start(page, 'always')
  await page.evaluate(() => (location.hash = '#/planet/saturn'))
  await page.getByRole('button', { name: 'من فوق' }).click()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'من تحت' }).click()
  await page.getByTestId('saturn-rings').click()
  const reaction = page.getByTestId('avatar-reaction')
  await expect(reaction).toHaveAttribute('data-kind', 'mission')
  await page.waitForTimeout(2500)
  await expect(reaction).toHaveAttribute('data-kind', 'mission') // still dancing
  await expect(page.getByTestId('avatar-reaction')).toHaveAttribute('data-kind', 'upsideDown', { timeout: 6000 })
  await expect(page.getByTestId('saturn-astronaut').locator('.astro-upside')).toHaveCount(1)
})
