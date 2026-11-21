import { useState, type ReactNode } from 'react'
import { narrator, say, useNarrator } from '../audio'
import { ILLUSTRATIVE_NOTE } from '../data/planets'
import { resetProgress, useProgress } from '../state/progress'
import { DEFAULT_SETTINGS, updateSettings, useSettings, type Settings } from '../state/settings'
import { CloseIcon } from './Icons'
import { PersonalizePanel } from './character/PersonalizePanel'
import { SoundCheck } from './SoundCheck'

function Row({ label, en, children }: { label: string; en: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3">
      <div>
        <div className="text-xl font-bold">{label}</div>
        <div className="text-sm text-white/60" dir="ltr">
          {en}
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Toggle({ k, label, en }: { k: keyof Settings; label: string; en: string }) {
  const s = useSettings()
  const on = s[k] as boolean
  return (
    <Row label={label} en={en}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label} (${en})`}
        onClick={() => updateSettings({ [k]: !on } as Partial<Settings>)}
        className={`relative h-10 w-20 rounded-full transition-colors ${on ? 'bg-emerald-400' : 'bg-white/20'}`}
      >
        <span
          className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all ${on ? 'left-1' : 'left-11'}`}
        />
      </button>
    </Row>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { v: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-full border-2 border-white/20">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`px-4 py-2 text-base font-bold ${value === o.v ? 'bg-violet-500' : 'bg-transparent'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsPanel({ onClose, initialTab = 'settings' }: { onClose: () => void; initialTab?: 'settings' | 'astronaut' }) {
  const [tab, setTab] = useState<'settings' | 'astronaut'>(initialTab)
  const s = useSettings()
  const progress = useProgress()
  const { voiceName } = useNarrator()
  const [name, setName] = useState(s.childName)
  const [confirmReset, setConfirmReset] = useState(false)

  const saveName = () => updateSettings({ childName: name })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3"
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-white/15 bg-night-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 id="settings-title" className="text-2xl font-extrabold">
            إعدادات الكبار <span className="text-base font-medium text-white/60">Parent settings</span>
          </h2>
          <button
            type="button"
            aria-label="إغلاق (Close)"
            onClick={() => {
              saveName()
              onClose()
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl"
          >
            <CloseIcon />
          </button>
        </div>
        <div role="tablist" className="flex gap-2 border-b border-white/10 px-5 pt-3">
          {(
            [
              ['settings', '⚙︎ الإعدادات', 'Settings'],
              ['astronaut', '👩‍🚀 رائدة الفضاء', 'Astronaut & photo'],
            ] as const
          ).map(([id, ar, en]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`tab-${id}`}
              onClick={() => setTab(id)}
              className={`rounded-t-2xl px-4 py-2 text-lg font-bold ${tab === id ? 'bg-violet-500' : 'bg-white/5'}`}
            >
              {ar} <span className="text-sm font-medium opacity-70">{en}</span>
            </button>
          ))}
        </div>
        {tab === 'astronaut' ? (
          <div className="overflow-y-auto px-5 pb-6">
            <PersonalizePanel />
          </div>
        ) : (
        <div className="overflow-y-auto px-5 pb-6">
          <Row label="اسم الطفل" en="Child's name">
            <input
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              aria-label="اسم الطفل (Child's name)"
              className="w-44 rounded-xl border-2 border-white/20 bg-white/10 px-3 py-2 text-xl"
              dir="auto"
            />
            <button
              type="button"
              className="rounded-xl bg-violet-500 px-3 py-2 font-bold"
              onClick={() => {
                saveName()
                void say('home.hello')
              }}
            >
              حفظ وتجربة
            </button>
          </Row>
          <Toggle k="narration" label="صوت الراوي" en="Narration" />
          <Toggle k="captions" label="الكلام مكتوب" en="Captions (subtitles)" />
          <Toggle k="sfx" label="مؤثرات صوتية" en="Sound effects" />
          <Toggle k="music" label="موسيقى هادية" en="Ambient music" />
          <Row label="علو الصوت" en="Volume">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              aria-label="Volume"
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
              className="w-44 accent-violet-400"
            />
          </Row>
          <Row label="سرعة الكلام" en="Narration speed">
            <input
              type="range"
              min={0.6}
              max={1.3}
              step={0.05}
              value={s.rate}
              aria-label="Narration speed"
              onChange={(e) => updateSettings({ rate: Number(e.target.value) })}
              className="w-44 accent-violet-400"
            />
            <button type="button" className="rounded-xl bg-white/10 px-3 py-2 font-bold" onClick={() => void say('start.welcome')}>
              ▶︎ جرب
            </button>
          </Row>
          <div className="py-3">
            <SoundCheck />
          </div>
          <Row label="الحركة" en="Motion">
            <Segmented
              label="Motion"
              value={s.motion}
              onChange={(motion) => updateSettings({ motion })}
              options={[
                { v: 'system', label: 'زي الجهاز' },
                { v: 'reduce', label: 'أقل حركة' },
                { v: 'full', label: 'كاملة' },
              ]}
            />
          </Row>
          <Row label="طريقة الاستكشاف" en="Guided (Nori suggests next) or free exploration">
            <Segmented
              label="Exploration mode"
              value={s.mode}
              onChange={(mode) => updateSettings({ mode })}
              options={[
                { v: 'guided', label: 'مع نوري' },
                { v: 'free', label: 'حر' },
              ]}
            />
          </Row>
          <Row label="التقدم" en={`Progress: ${progress.visited.length} places visited, ${progress.stars.length} stars`}>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 font-bold ${confirmReset ? 'bg-red-500' : 'bg-white/10'}`}
              onClick={() => {
                if (confirmReset) {
                  resetProgress()
                  setConfirmReset(false)
                } else setConfirmReset(true)
              }}
            >
              {confirmReset ? 'متأكد؟ اضغط تاني (Confirm)' : 'مسح التقدم (Reset)'}
            </button>
          </Row>
          <Row label="إعادة كل الإعدادات" en="Restore default settings">
            <button
              type="button"
              className="rounded-xl bg-white/10 px-4 py-2 font-bold"
              onClick={() => {
                updateSettings(DEFAULT_SETTINGS)
                setName(DEFAULT_SETTINGS.childName)
              }}
            >
              الافتراضي (Defaults)
            </button>
          </Row>
          <div className="mt-4 space-y-2 rounded-2xl bg-white/5 p-4 text-sm leading-relaxed text-white/80" dir="ltr">
            <p>
              <b>Voice:</b>{' '}
              {voiceName
                ? `Using “${voiceName}”.`
                : narrator.speechSupported
                  ? 'No Arabic voice found on this device — captions are shown instead. On iPad: Settings → Accessibility → Spoken Content → Voices → Arabic. Recorded narration can also be added (see README).'
                  : 'Speech synthesis is not supported in this browser — captions are shown instead.'}
            </p>
            <p>
              <b>Note:</b> {ILLUSTRATIVE_NOTE}
            </p>
            <p>
              <b>Privacy:</b> No accounts, ads, analytics or network calls. Settings and progress are stored only on this
              device (localStorage).
            </p>
            <p>
              <b>Tip:</b> On iPad, use Share → “Add to Home Screen” for a full-screen, offline-capable app.
            </p>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
