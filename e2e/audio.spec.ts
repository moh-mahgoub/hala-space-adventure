import { expect, test, type Page } from '@playwright/test'

const BASE = '/hala-space-adventure/'

/** Count speechSynthesis.speak calls (there must be none) and record audio requests. */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hala-space:debug-surprises', 'never')
    const w = window as unknown as { __speakCalls: number }
    w.__speakCalls = 0
    if ('speechSynthesis' in window) {
      const orig = window.speechSynthesis.speak.bind(window.speechSynthesis)
      window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        w.__speakCalls++
        orig(u)
      }
    }
  })
  const audio: { url: string; status: number }[] = []
  page.on('response', (r) => {
    // clips are content-addressed (…/clip.mp3?v=<fingerprint>); compare by path
    const u = new URL(r.url())
    if (u.pathname.endsWith('.mp3')) audio.push({ url: u.origin + u.pathname, status: r.status() })
  })
  return audio
}

async function start(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'يلا نبدأ!' }).click()
}

test('plays the prerecorded storyteller, then Zizo — never browser speech', async ({ page }) => {
  const audio = await instrument(page)
  await start(page)
  const caption = page.getByTestId('caption')
  await expect(caption).toHaveAttribute('data-speaker', 'narrator')
  await expect(caption).toContainText('أهلاً يا حلا')
  // after the welcome, Zizo introduces himself in his own voice
  await expect(caption).toHaveAttribute('data-speaker', 'zizo', { timeout: 20_000 })
  await expect(caption).toContainText('أنا زيزو')
  await expect(page.locator('[data-testid=zizo][data-talking=yes]').first()).toBeVisible()

  const welcome = audio.find((a) => a.url.includes('/audio/ar-EG/narrator/welcome/start.welcome.mp3'))
  expect(welcome, 'welcome clip requested').toBeTruthy()
  expect(new URL(welcome!.url).pathname.startsWith(BASE)).toBe(true)
  expect([200, 206]).toContain(welcome!.status)
  expect(audio.some((a) => a.url.includes('/audio/ar-EG/zizo/'))).toBe(true)
  expect(audio.filter((a) => a.status >= 400)).toEqual([])
  expect(await page.evaluate(() => (window as unknown as { __speakCalls: number }).__speakCalls)).toBe(0)
})

test('changing screens stops the previous narration (no stale audio)', async ({ page }) => {
  await instrument(page)
  await start(page)
  await page.evaluate(() => (location.hash = '#/planet/saturn'))
  await expect(page.getByTestId('caption')).toContainText('زحل')
  await page.evaluate(() => (location.hash = '#/games'))
  await expect(page.getByTestId('caption')).toContainText('اختاري لعبة')
  await expect(page.getByTestId('caption')).not.toContainText('زحل')
})

test('a game answer is narrated from composed clips', async ({ page }) => {
  const audio = await instrument(page)
  await start(page)
  await page.evaluate(() => (location.hash = '#/game/find'))
  await page.locator('[data-target=no]').first().click()
  await expect(page.getByTestId('caption')).toContainText(/(^|: )(ده|دي) /)
  await expect.poll(() => audio.some((a) => /\/common\/common\.thisIs\.\w+\.mp3$/.test(a.url)), { timeout: 10_000 }).toBe(true)
  await expect(page.getByTestId('caption')).toContainText('يلا ندور تاني', { timeout: 15_000 })
  expect(audio.filter((a) => a.status >= 400)).toEqual([])
})

test('every body in the app has a working scene with its recorded intro', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one full walkthrough is enough')
  test.setTimeout(120_000)
  const audio = await instrument(page)
  await start(page)
  const bodies = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  for (const id of bodies) {
    await page.evaluate((h) => (location.hash = h), `#/planet/${id}`)
    await expect(page.getByTestId(`planet-screen-${id}`)).toBeVisible()
    await expect(page.getByTestId('kind-badge')).toBeVisible()
    if (id === 'pluto') await expect(page.getByTestId('kind-badge')).toContainText('كوكب قزم')
    expect(await page.getByTestId(/^fact-\d$/).count(), id).toBeGreaterThanOrEqual(2)
    await expect(page.getByRole('region', { name: /نشاط/ })).toBeVisible()
    await expect.poll(() => audio.some((a) => a.url.endsWith(`/planets.${id}.intro.mp3`) && a.status < 400), { timeout: 8000 }).toBe(true)
  }
  // Pluto is visible in the solar system and the strip too
  await page.evaluate(() => (location.hash = '#/space'))
  await expect(page.getByTestId('body-pluto')).toBeAttached()
  await expect(page.getByTestId('strip-pluto')).toBeVisible()
})

test('secret mission: Neptune invites her to Pluto, she finds the heart and earns the badge', async ({ page }) => {
  test.setTimeout(150_000)
  await instrument(page)
  await start(page)
  await page.evaluate(() => (location.hash = '#/planet/neptune'))
  for (let i = 0; i < 3; i++) await page.getByTestId('activity-target').click()
  const invite = page.getByTestId('pluto-invite')
  // the invitation waits until Neptune's facts have been heard
  await expect(page.getByTestId('fact-0')).toHaveAttribute('data-suggested', 'yes')
  await expect(invite).toHaveCount(0)
  for (let i = 0; i < 3; i++) await page.getByTestId(`fact-${i}`).click()
  await expect(invite).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('caption')).toContainText('آخر كوكب من الكواكب التمانية', { timeout: 20_000 })
  // Zizo puts his winter gear on when he says he's getting his jacket
  await expect(invite.getByTestId('zizo-winter')).toBeAttached({ timeout: 20_000 })
  await page.getByRole('button', { name: /يلا نكتشف بلوتو/ }).click()

  await expect(page.getByTestId('planet-screen-pluto')).toBeVisible()
  await expect(page.getByTestId('kind-badge')).toContainText('كوكب قزم')
  // the heart isn't highlighted: she looks for it. If she waits, a gentle hint comes.
  await expect(page.getByTestId('pluto-heart')).toHaveAttribute('data-hinted', 'no')
  await expect(page.getByTestId('caption')).toContainText('شبه القلب', { timeout: 60_000 })
  await page.getByTestId('pluto-heart').click()
  await expect(page.getByTestId('pluto-moon-compare')).toBeVisible()
  await expect(page.getByTestId('pluto-badge-celebration')).toBeVisible({ timeout: 45_000 })
  await page.getByRole('button', { name: /هيييه/ }).click()
  await page.evaluate(() => (location.hash = '#/map'))
  await expect(page.getByTestId('badge-pluto')).toHaveAttribute('data-earned', 'yes')
})

test('an old cached take is replaced by the re-recording at the same path, online and offline (A002-03)', async ({ page, context, browserName }, info) => {
  test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'service worker check on desktop Chromium')
  test.setTimeout(60_000)
  const PATH = 'audio/ar-EG/narrator/planets/planets.saturn.intro.mp3'
  const real = await (await page.request.get(PATH)).body()

  await page.goto('./')
  await page.evaluate(async () => void (await navigator.serviceWorker.ready))
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  // seed an "old installation": the previous release cached a different take at the plain path
  const plain = new URL(PATH, page.url()).href
  await page.evaluate(async (url) => {
    const c = await caches.open('hala-space-v2')
    await c.put(url, new Response(new TextEncoder().encode('OLD-TAKE-'.repeat(50)), { headers: { 'Content-Type': 'audio/mpeg' } }))
  }, plain)

  // the app asks for the clip by its fingerprinted address
  const asked: string[] = []
  page.on('request', (r) => r.url().includes('planets.saturn.intro.mp3') && asked.push(r.url()))
  await page.getByRole('button', { name: 'يلا نبدأ!' }).click()
  await page.evaluate(() => (location.hash = '#/planet/saturn'))
  await expect.poll(() => asked.length, { timeout: 10_000 }).toBeGreaterThan(0)
  const address = asked[0]
  expect(address).toMatch(/planets\.saturn\.intro\.mp3\?v=[0-9a-f]{12}$/)

  const read = (url: string) =>
    page.evaluate(async (u) => {
      const r = await fetch(u)
      return { status: r.status, bytes: Array.from(new Uint8Array(await r.arrayBuffer())) }
    }, url)
  const cachedPaths = () =>
    page.evaluate(async (path) => (await (await caches.open('hala-space-v2')).keys()).map((k) => k.url).filter((u) => u.includes(path)), PATH)

  const online = await read(address)
  expect(online.status).toBe(200)
  expect(online.bytes).toEqual([...real]) // the real recording, not the seeded old take
  await expect.poll(cachedPaths).toEqual([address]) // the old take was removed

  await context.setOffline(true)
  expect((await read(address)).bytes).toEqual([...real])
  // narration still replays offline, and a new screen still cancels it
  await page.getByRole('button', { name: 'اسمعي تاني' }).click()
  await expect(page.getByTestId('caption')).toContainText('زحل')
  await page.evaluate(() => (location.hash = '#/games'))
  await expect(page.getByTestId('caption')).not.toContainText('زحل')
  await context.setOffline(false)
})
