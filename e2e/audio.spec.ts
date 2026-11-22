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
    if (r.url().endsWith('.mp3')) audio.push({ url: r.url(), status: r.status() })
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

test('Pluto activity: find the heart, then compare with the Moon', async ({ page }) => {
  await instrument(page)
  await start(page)
  await page.evaluate(() => (location.hash = '#/planet/pluto'))
  await page.getByTestId('pluto-heart').click()
  await expect(page.getByTestId('pluto-moon-compare')).toBeVisible()
  await expect(page.getByText('خلصتي!')).toBeVisible({ timeout: 20_000 })
})
