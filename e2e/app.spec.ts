import { expect, test, type Page } from '@playwright/test'

const BASE_PATH = '/hala-space-adventure/'

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`))
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`))
  return errors
}

async function start(page: Page, hash = '') {
  await page.addInitScript(() => localStorage.setItem('hala-space:debug-surprises', 'never'))
  await page.goto(hash ? `./${hash}` : './')
  await page.getByRole('button', { name: 'يلا نبدأ!' }).click()
}

const isTouch = (page: Page) => page.evaluate(() => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)

async function press(page: Page, locator: ReturnType<Page['getByTestId']>) {
  if (await isTouch(page)) await locator.tap()
  else await locator.click()
}

test('loads with no errors, assets under the GitHub Pages base path, RTL Arabic', async ({ page }) => {
  const errors = watchErrors(page)
  const requests: string[] = []
  page.on('request', (r) => requests.push(r.url()))
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'رحلة حلا في الفضاء' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  for (const url of requests) {
    const u = new URL(url)
    expect(u.hostname, `external request: ${url}`).toBe('localhost')
    expect(u.pathname.startsWith(BASE_PATH), `outside base path: ${url}`).toBe(true)
  }
  // the Arabic font is bundled and loads
  expect(requests.some((r) => r.includes('baloo-bhaijaan-2-arabic'))).toBe(true)
  expect(errors).toEqual([])
})

test('no horizontal scrolling on any main screen', async ({ page }) => {
  await start(page)
  for (const h of ['#/', '#/space', '#/planet/saturn', '#/games', '#/game/order', '#/story', '#/map']) {
    await page.evaluate((x) => (location.hash = x), h)
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, h).toBeLessThanOrEqual(1)
  }
})

test('explore: home → solar system → planet → activity → star', async ({ page }) => {
  const errors = watchErrors(page)
  await start(page)
  await press(page, page.getByTestId('home-explore'))
  await expect(page.getByTestId('space-screen')).toBeVisible()
  await expect(page.getByTestId('body-saturn')).toBeVisible()
  await press(page, page.getByTestId('strip-sun'))
  await expect(page.getByTestId('planet-screen-sun')).toBeVisible()
  await expect(page.getByTestId('kind-badge')).toContainText('نجمة')
  const sun = page.getByTestId('activity-target')
  for (let i = 0; i < 3; i++) await press(page, sun)
  await expect(page.getByText('خلصتي!')).toBeVisible()
  await press(page, page.getByTestId('nav-next'))
  await expect(page.getByTestId('planet-screen-mercury')).toBeVisible()
  await page.getByRole('button', { name: 'البيت' }).click()
  await expect(page.getByTestId('star-count')).toContainText('3') // visit sun + activity + visit mercury
  expect(errors).toEqual([])
})

test('tapping a moving planet in the orbit view opens it', async ({ page }) => {
  await start(page, '#/space')
  const jupiter = page.getByTestId('body-jupiter')
  await jupiter.dispatchEvent('pointerdown')
  await jupiter.click({ force: true })
  await expect(page.getByTestId('planet-screen-jupiter')).toBeVisible()
  await expect(page.getByTestId('planet-name')).toHaveText('المشتري')
})

test('find the planet: correct answer is praised', async ({ page }) => {
  await start(page, '#/game/find')
  const target = page.locator('[data-target=yes]')
  await press(page, page.locator('[data-target=no]').first())
  // «ده/دي <planet>.» then «يلا ندور تاني على …!»
  await expect(page.getByTestId('caption')).toContainText(/(^|: )(ده|دي) |يلا ندور تاني/)
  await press(page, target)
  await expect(page.getByTestId('next-round')).toBeVisible()
})

test('order game: drag (or tap-tap) planets into place', async ({ page }) => {
  await start(page, '#/game/order')
  const order = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
  // wrong place first: gentle hint, planet stays in the tray
  if (await isTouch(page)) {
    await page.getByTestId('tray-venus').tap()
    await page.getByTestId('slot-0').tap()
  } else {
    await page.getByTestId('tray-venus').dragTo(page.getByTestId('slot-0'))
  }
  await expect(page.getByTestId('slot-0')).toHaveAttribute('data-filled', '')
  await expect(page.getByTestId('caption')).toContainText('جربي تاني')
  for (const [i, id] of order.entries()) {
    if (await isTouch(page)) {
      await page.getByTestId(`tray-${id}`).tap()
      await page.getByTestId(`slot-${i}`).tap()
    } else {
      await page.getByTestId(`tray-${id}`).dragTo(page.getByTestId(`slot-${i}`))
    }
    await expect(page.getByTestId(`slot-${i}`)).toHaveAttribute('data-filled', id)
  }
  await expect(page.getByRole('dialog', { name: 'برافو!' })).toBeVisible({ timeout: 20_000 })
})

test('day & night: turning the Earth changes day to night', async ({ page }) => {
  await start(page, '#/game/dayNight')
  const sky = page.getByTestId('sky-panel')
  await expect(sky).toHaveAttribute('data-state', 'day')
  const earth = page.getByTestId('daynight-earth')
  await earth.focus()
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowLeft')
  await expect(sky).toHaveAttribute('data-state', 'night')
  await expect(sky).toContainText('ليل')
})

test('settings and progress persist across reloads', async ({ page }) => {
  await start(page, '#/planet/mars')
  await expect(page.getByTestId('planet-screen-mars')).toBeVisible()
  await page.evaluate(() => {
    const k = 'hala-space:settings'
    const s = JSON.parse(localStorage.getItem(k) || '{}')
    localStorage.setItem(k, JSON.stringify({ ...s, childName: 'ليلى' }))
  })
  await page.goto('./#/map')
  await page.reload() // a real reload, not just a hash change
  await expect(page.getByRole('heading', { name: 'رحلة ليلى في الفضاء' })).toBeVisible()
  await page.getByRole('button', { name: 'يلا نبدأ!' }).click()
  await expect(page.getByTestId('map-mars')).toHaveAttribute('data-visited', 'yes')
  await expect(page.getByTestId('map-saturn')).toHaveAttribute('data-visited', 'no')
})

test('respects the system reduced-motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await start(page)
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
})

test('works with speech synthesis unavailable (captions only)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined })
  })
  const errors = watchErrors(page)
  await start(page)
  await expect(page.getByTestId('caption')).toContainText('أهلاً يا حلا')
  expect(errors).toEqual([])
})

test('story: start, continue, make a choice', async ({ page }) => {
  await start(page, '#/story')
  await press(page, page.getByTestId('story-start'))
  await expect(page.getByTestId('story-chapter-start')).toBeVisible()
  for (let i = 0; i < 3; i++) await press(page, page.getByTestId('story-next'))
  await press(page, page.getByTestId('story-target'))
  await expect(page.getByTestId('story-chapter-sun')).toBeVisible({ timeout: 15_000 })
  // tap "continue" through the narrated lines until the choice appears
  for (let i = 0; i < 6 && !(await page.getByTestId('choices').isVisible()); i++) {
    await press(page, page.getByTestId('story-next'))
    await page.waitForTimeout(150)
  }
  await expect(page.getByTestId('choices')).toBeVisible()
  await press(page, page.getByTestId('choice-0'))
  await expect(page.getByTestId('caption')).toContainText('فكرة حلوة')
})

test('works offline after the first visit', async ({ page, context, browserName }, info) => {
  test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'service worker check on desktop Chromium')
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload() // let the worker control the page and cache assets
  await page.waitForLoadState('networkidle')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'رحلة حلا في الفضاء' })).toBeVisible()
  await page.getByRole('button', { name: 'يلا نبدأ!' }).click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await context.setOffline(false)
})

test('every planet activity can be completed', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'mouse-driven walkthrough on desktop')
  test.setTimeout(120_000)
  await start(page)
  const go = async (id: string) => {
    await page.evaluate((h) => (location.hash = h), `#/planet/${id}`)
    await expect(page.getByTestId(`planet-screen-${id}`)).toBeVisible()
  }
  const done = () => expect(page.getByText('خلصتي!')).toBeVisible({ timeout: 20_000 })

  await go('venus')
  for (let i = 0; i < 5; i++) await page.getByTestId(`cloud-${i}`).click()
  await done()

  await go('earth')
  const earth = page.getByTestId('earth-spinner')
  const eb = (await earth.boundingBox())!
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(eb.x + eb.width * 0.85, eb.y + eb.height / 2)
    await page.mouse.down()
    await page.mouse.move(eb.x + eb.width * 0.15, eb.y + eb.height / 2, { steps: 12 })
    await page.mouse.up()
  }
  await done()

  await go('moon')
  for (let i = 0; i < 8; i++) await page.getByTestId('moon-step').click()
  await done()

  await go('mars')
  for (let i = 0; i < 3; i++) {
    await page.getByTestId(`mars-target-${i}`).click()
    await page.waitForTimeout(2200)
  }
  await done()

  await go('jupiter')
  for (let i = 0; i < 10; i++) await page.getByTestId('drop-earth').click()
  await done()
  await expect(page.getByTestId('earth-count')).toContainText('١٠')

  await go('saturn')
  await page.getByRole('button', { name: 'من فوق' }).click()
  await page.getByRole('button', { name: 'من تحت' }).click()
  await page.getByRole('button', { name: 'من تحت' }).click()
  await page.getByRole('button', { name: 'من تحت' }).click()
  await page.getByRole('button', { name: 'من تحت' }).click()
  await page.getByTestId('saturn-rings').click()
  await done()
  await expect(page.getByTestId('ring-zoom')).toBeVisible()

  for (const id of ['uranus', 'neptune']) {
    await go(id)
    for (let i = 0; i < 3; i++) await page.getByTestId('activity-target').click()
    await done()
  }
})

test('parent sound check reports the audio state and gives advice', async ({ page }) => {
  const errors = watchErrors(page)
  await start(page)
  const gate = page.getByTestId('parent-gate')
  await gate.dispatchEvent('pointerdown', { pointerId: 1 })
  await page.waitForTimeout(2300)
  await gate.dispatchEvent('pointerup', { pointerId: 1 })
  await page.getByTestId('sound-check-run').click()
  await expect(page.getByTestId('sound-report')).toContainText('Sound effects: running')
  await expect(page.getByTestId('sound-report')).toContainText('recorded clips:')
  await expect(page.getByTestId('sound-tips')).toContainText('volume')
  expect(errors).toEqual([])
})

test('parent gate on a touch screen: a quick tap shows the hint; a wobbly 2-second hold opens settings', async ({ page }) => {
  await start(page)
  const gate = page.getByTestId('parent-gate')
  await expect(gate).toContainText('للكبار')
  const box = (await gate.boundingBox())!
  const at = (dx: number, dy: number) => ({
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: box.x + box.width / 2 + dx,
    clientY: box.y + box.height / 2 + dy,
  })
  // a child's quick tap: only a written note for grown-ups
  await gate.dispatchEvent('pointerdown', at(0, 0))
  await page.waitForTimeout(150)
  await gate.dispatchEvent('pointerup', at(0, 0))
  await expect(page.getByTestId('parent-gate-hint')).toHaveText('للكبار: اضغط مطوّلاً ثانيتين')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // a real finger wobbles a little while holding — that must not cancel it
  await gate.dispatchEvent('pointerdown', at(0, 0))
  for (const [dx, dy] of [[4, -3], [-9, 6], [12, 10], [-6, -14], [3, 2]]) {
    await page.waitForTimeout(350)
    await gate.dispatchEvent('pointermove', at(dx, dy))
  }
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1500 })
  await gate.dispatchEvent('pointerup', at(3, 2)).catch(() => {})
  await expect(page.getByTestId('parent-gate-hint')).toHaveCount(0)
})
