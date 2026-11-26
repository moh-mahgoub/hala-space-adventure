import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { narrator } from '../audio'
import { AvatarReaction } from '../components/character/AvatarReaction'
import { AstronautCharacter } from '../components/character/AstronautCharacter'
import { ChildAvatar } from '../components/character/ChildAvatar'
import { MissionBadge } from '../components/character/MissionBadge'
import { SpaceshipPilot } from '../components/character/SpaceshipPilot'
import { onReaction, react, type ReactionEvent } from '../profile/reactions'
import { PlanetScreen } from '../screens/PlanetScreen'
import { ChoiceGame } from '../games/ChoiceGame'
import { resetProgress } from '../state/progress'
import { DEFAULT_SETTINGS, settingsStore } from '../state/settings'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('hala-space:debug-surprises', 'never')
  settingsStore.replace(DEFAULT_SETTINGS)
  resetProgress()
  narrator.stop()
})

function captureReactions() {
  const seen: ReactionEvent[] = []
  const off = onReaction((e) => seen.push(e))
  return { seen, off }
}

describe('character components without a photo', () => {
  it('render the illustrated astronaut', () => {
    const { container } = render(
      <>
        <AstronautCharacter pose="wave" />
        <ChildAvatar />
        <MissionBadge icon="🚀" title="أول رحلة" earned />
        <svg>
          <SpaceshipPilot />
        </svg>
      </>,
    )
    expect(container.querySelectorAll('[data-child-face="default"]').length).toBe(4)
    expect(container.querySelector('image')).toBeNull()
  })

  it('render the face picture when given one', () => {
    const { container } = render(<AstronautCharacter look={{ style: 'photo', faceUrl: 'blob:x' }} />)
    expect(container.querySelector('[data-child-face="photo"] image')).toHaveAttribute('href', 'blob:x')
    const sticker = render(<AstronautCharacter look={{ style: 'sticker', faceUrl: 'blob:x' }} />)
    expect(sticker.container.querySelector('[data-child-face="sticker"]')).not.toBeNull()
  })

  it('locked badges hide the face', () => {
    const { container } = render(<MissionBadge icon="🎮" title="بطلة" earned={false} />)
    expect(container.querySelector('[data-child-face]')).toBeNull()
  })
})

describe('reactions follow real actions', () => {
  it('tapping the Sun → "واو يا حلا! الشمس منورة قوي!"', () => {
    const { seen, off } = captureReactions()
    render(<PlanetScreen id="sun" tour={false} />)
    expect(seen).toHaveLength(0) // nothing random on load
    fireEvent.click(screen.getByTestId('activity-target'))
    expect(seen[0].kind).toBe('sun')
    expect(narrator.getState().text).toBe('واو يا حلا! الشمس منورة قوي!')
    off()
  })

  it('a correct answer → cheering astronaut; a wrong one → no celebration', () => {
    const { seen, off } = captureReactions()
    render(<ChoiceGame kind="find" />)
    fireEvent.click(screen.getAllByTestId(/^choice-/).find((c) => c.dataset.target === 'no')!)
    expect(seen).toHaveLength(0)
    fireEvent.click(screen.getAllByTestId(/^choice-/).find((c) => c.dataset.target === 'yes')!)
    expect(seen.map((e) => e.kind)).toEqual(['correct'])
    expect(seen[0].pose).toBe('cheer')
    expect(narrator.getState().text).toBe('برافو يا حلا! إنتي رائدة فضاء شاطرة!')
    off()
  })

  it('finishing an activity → mission dance', async () => {
    const { seen, off } = captureReactions()
    const say = vi.spyOn(narrator, 'say').mockResolvedValue(true) // the activity ends once «خمسة» is said
    render(<PlanetScreen id="mercury" tour={false} />)
    for (let i = 0; i < 5; i++) await act(async () => void fireEvent.click(screen.getByTestId(`crater-${i}`)))
    say.mockRestore()
    expect(seen.at(-1)!.kind).toBe('mission')
    expect(seen.at(-1)!.pose).toBe('dance')
    off()
  })

  it('uses the configured name ("كابتن …")', () => {
    settingsStore.set({ childName: 'ليلى' })
    render(<AvatarReaction />)
    act(() => void react('journey'))
    expect(screen.getByTestId('avatar-reaction')).toHaveTextContent('مبروك يا كابتن ليلى! اكتشفتي المجموعة الشمسية كلها!')
  })

  it('the overlay disappears when the child navigates away', () => {
    render(<AvatarReaction />)
    act(() => void react('saturn'))
    expect(screen.getByTestId('avatar-reaction')).toBeInTheDocument()
    act(() => void window.dispatchEvent(new HashChangeEvent('hashchange')))
    expect(screen.queryByTestId('avatar-reaction')).toBeNull()
  })
})

describe('privacy guards', () => {
  const root = path.resolve(__dirname, '..')
  const files: string[] = []
  const walk = (d: string) =>
    readdirSync(d).forEach((f) => {
      const p = path.join(d, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p)
    })
  walk(root)

  it('the app has no network upload code at all', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket\(|navigator\.sendBeacon/)
    }
  })

  it('the repository ships no personal photos (only icons, docs screenshots and synthetic test images)', () => {
    const repo = path.resolve(root, '..')
    const images: string[] = []
    const scan = (d: string) =>
      readdirSync(d).forEach((f) => {
        if (['node_modules', '.git', 'dist', 'test-results', 'playwright-report'].includes(f)) return
        const p = path.join(d, f)
        if (statSync(p).isDirectory()) scan(p)
        else if (/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f)) images.push(path.relative(repo, p))
      })
    scan(repo)
    for (const img of images) {
      expect(img, img).toMatch(/^(public\/(icon-\d+|apple-touch-icon)\.png|docs\/screenshots\/[a-z-]+\.jpg|e2e\/fixtures\/synthetic-[a-z]+\.png)$/)
    }
  })
})
