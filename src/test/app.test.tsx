import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { App } from '../App'
import { narrator } from '../audio'
import { navigate } from '../router'
import { progressStore, resetProgress } from '../state/progress'
import { DEFAULT_SETTINGS, settingsStore } from '../state/settings'
import { PlanetScreen } from '../screens/PlanetScreen'
import { ChoiceGame } from '../games/ChoiceGame'
import { HomeScreen } from '../screens/HomeScreen'

beforeEach(() => {
  localStorage.clear()
  settingsStore.replace(DEFAULT_SETTINGS)
  resetProgress()
  narrator.stop()
  window.location.hash = ''
})

describe('App shell', () => {
  it('renders Arabic, right-to-left, starting with one big start button', () => {
    const { container } = render(<App />)
    const root = container.firstElementChild!
    expect(root).toHaveAttribute('dir', 'rtl')
    expect(root).toHaveAttribute('lang', 'ar')
    expect(screen.getByRole('heading', { name: 'رحلة حلا في الفضاء' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ!' }))
    expect(screen.getByTestId('home-screen')).toBeInTheDocument()
  })

  it('shows captions so it still communicates without audio (jsdom has no voices)', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ!' }))
    expect(screen.getByTestId('caption')).toHaveTextContent('أهلاً يا حلا')
  })

  it('navigates home → solar system → planet', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ!' }))
    fireEvent.click(screen.getByTestId('home-explore'))
    await screen.findByTestId('space-screen')
    fireEvent.click(screen.getByTestId('strip-saturn'))
    await act(() => new Promise((r) => setTimeout(r, 450)))
    expect(await screen.findByTestId('planet-screen-saturn')).toBeInTheDocument()
    expect(progressStore.get().visited).toContain('saturn')
  })

  it('applies reduced motion to the document', () => {
    render(<App />)
    act(() => settingsStore.set({ motion: 'reduce' }))
    expect(document.documentElement.dataset.motion).toBe('reduce')
    act(() => settingsStore.set({ motion: 'full' }))
    expect(document.documentElement.dataset.motion).toBe('full')
  })

  it('uses the configured child name', () => {
    settingsStore.set({ childName: 'ليلى' })
    render(<App />)
    expect(screen.getByRole('heading', { name: 'رحلة ليلى في الفضاء' })).toBeInTheDocument()
  })
})

describe('planet scenes', () => {
  it('Earth: name, "planet #3" badge, facts that narrate when tapped', () => {
    render(<PlanetScreen id="earth" tour={false} />)
    expect(screen.getByTestId('planet-name')).toHaveTextContent('الأرض')
    expect(screen.getByTestId('kind-badge')).toHaveTextContent('كوكب رقم ٣')
    fireEvent.click(screen.getByTestId('fact-1'))
    expect(narrator.getState().text).toContain('الليل والنهار')
  })

  it('distinguishes the Sun (star) and the Moon', () => {
    const { unmount } = render(<PlanetScreen id="sun" tour={false} />)
    expect(screen.getByTestId('kind-badge')).toHaveTextContent('نجمة')
    unmount()
    render(<PlanetScreen id="moon" tour={false} />)
    expect(screen.getByTestId('kind-badge')).toHaveTextContent('قمر')
  })

  it('Mercury activity: counting five craters completes it and earns a star', () => {
    render(<PlanetScreen id="mercury" tour={false} />)
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByTestId(`crater-${i}`))
    expect(screen.getByText('خلصتي!')).toBeInTheDocument()
    expect(progressStore.get().stars).toContain('activity:mercury')
  })

  it('Sun activity: three taps', () => {
    render(<PlanetScreen id="sun" tour={false} />)
    const t = screen.getByTestId('activity-target')
    fireEvent.click(t)
    fireEvent.click(t)
    expect(screen.queryByText('خلصتي!')).toBeNull()
    fireEvent.click(t)
    expect(screen.getByText('خلصتي!')).toBeInTheDocument()
  })

  it('next/previous navigation follows the tour order', () => {
    render(<PlanetScreen id="earth" tour={false} />)
    expect(screen.getByTestId('nav-next')).toHaveAccessibleName(/القمر/)
    expect(screen.getByTestId('nav-prev')).toHaveAccessibleName(/الزهرة/)
    fireEvent.click(screen.getByTestId('nav-next'))
    expect(window.location.hash).toBe('#/planet/moon')
  })
})

describe('Find the planet game', () => {
  it('wrong answers get a gentle hint (no penalty); the right answer is praised', () => {
    render(<ChoiceGame kind="find" />)
    const choices = screen.getAllByTestId(/^choice-/)
    const target = choices.find((c) => c.dataset.target === 'yes')!
    const wrong = choices.find((c) => c.dataset.target === 'no')!
    const targetName = target.getAttribute('aria-label')!
    expect(screen.getByTestId('question')).toHaveTextContent(targetName)

    fireEvent.click(wrong)
    // composed: «ده/دي <chosen>.» then «يلا ندور تاني على <target>!»
    expect(narrator.getState().text).toMatch(/^(ده|دي) .+\.$/)
    fireEvent.click(choices.filter((c) => c.dataset.target === 'no')[1])
    // after two wrong tries the correct planet glows
    expect(target.querySelector('.anim-pulse-glow')).not.toBeNull()
    expect(narrator.getState().text).toMatch(/^(ده|دي) /)

    fireEvent.click(target)
    expect(narrator.getState().text).toMatch(/شطورة|برافو|هايل|جميل/)
    expect(screen.getByTestId('next-round')).toBeInTheDocument()
  })

  it('finishing 5 rounds earns the game star', () => {
    render(<ChoiceGame kind="find" />)
    for (let i = 0; i < 5; i++) {
      const target = screen.getAllByTestId(/^choice-/).find((c) => c.dataset.target === 'yes')!
      fireEvent.click(target)
      fireEvent.click(screen.getByTestId('next-round'))
    }
    expect(progressStore.get().stars).toContain('game:find')
  })
})

describe('parent settings', () => {
  it('opens only after a 3-second hold, and saves the name', () => {
    vi.useFakeTimers()
    render(<HomeScreen />)
    const gate = screen.getByTestId('parent-gate')
    fireEvent.pointerDown(gate)
    act(() => void vi.advanceTimersByTime(1000))
    fireEvent.pointerUp(gate) // a quick tap does nothing
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.pointerDown(gate)
    act(() => void vi.advanceTimersByTime(3100))
    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByLabelText(/Child's name/)
    expect(input).toHaveValue('حلا')
    fireEvent.change(input, { target: { value: 'ليلى' } })
    fireEvent.blur(input)
    expect(settingsStore.get().childName).toBe('ليلى')
    fireEvent.click(within(dialog).getByRole('switch', { name: /Ambient music/ }))
    expect(settingsStore.get().music).toBe(true)
    vi.useRealTimers()
  })
})

describe('mute button', () => {
  it('toggles quick mute', () => {
    render(<HomeScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'الصوت شغال' }))
    expect(settingsStore.get().muted).toBe(true)
    navigate({ name: 'home' })
  })
})
