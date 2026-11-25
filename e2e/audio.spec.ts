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

test('secret mission: Neptune invites her to Pluto, she finds the heart and earns the badge', async ({ page }) => {
  test.setTimeout(150_000)
  await instrument(page)
  await start(page)
  await page.evaluate(() => (location.hash = '#/planet/neptune'))
  for (let i = 0; i < 3; i++) await page.getByTestId('activity-target').click()
  const invite = page.getByTestId('pluto-invite')
  await expect(invite).toBeVisible()
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

test('leaving the app stops the narration; coming back, the old lines do not resume', async ({ page }) => {
  test.setTimeout(60_000)
  const audio = await instrument(page)
  await page.addInitScript(() => {
    const w = window as unknown as { __plays: string[] }
    w.__plays = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      if (this.src && !this.src.startsWith('data:')) w.__plays.push(this.src.split('/').pop()!)
      return play.call(this)
    }
  })
  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate((s) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s })
      document.dispatchEvent(new Event('visibilitychange'))
    }, state)

  await start(page)
  await page.evaluate(() => (location.hash = '#/planet/saturn'))
  await expect(page.getByTestId('caption')).toContainText('زحل')
  await expect.poll(() => audio.some((a) => a.url.endsWith('/planets.saturn.intro.mp3'))).toBe(true)

  await setVisibility('hidden') // e.g. she pressed the home button
  await expect(page.getByTestId('caption')).toHaveCount(0)
  const playsWhenLeft = await page.evaluate(() => (window as unknown as { __plays: string[] }).__plays.length)
  await page.waitForTimeout(12_000) // the intro + Zizo's joke would have played by now
  await setVisibility('visible')
  await page.waitForTimeout(6_000)
  // nothing more was played: no Zizo joke, no activity prompt
  const plays = await page.evaluate(() => (window as unknown as { __plays: string[] }).__plays)
  expect(plays.slice(playsWhenLeft)).toEqual([])
  await expect(page.getByTestId('caption')).toHaveCount(0)
  // and the screen's replay button still works
  await page.getByRole('button', { name: 'اسمعي تاني' }).click()
  await expect(page.getByTestId('caption')).toContainText('زحل')
})
