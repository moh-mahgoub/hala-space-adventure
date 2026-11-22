/**
 * Parent "Sound check": plays a chime and a recorded line, then explains in
 * plain words why there might be no sound on this particular device.
 */
import { useState } from 'react'
import { narrator, recordedClipCount, say, sfx, sound, totalClipCount, unlockAudio } from '../audio'
import { audioSessionMode } from '../audio/iosAudioSession'
import { useSettings } from '../state/settings'

interface Report {
  effects: string
  session: string
  backend: string
}

export function SoundCheck() {
  const s = useSettings()
  const [report, setReport] = useState<Report | null>(null)

  const run = () => {
    unlockAudio() // inside this tap
    sfx('chime')
    void say('start.welcome')
    window.setTimeout(
      () =>
        setReport({
          effects: sound.state,
          session: audioSessionMode(),
          backend: narrator.getState().backend ?? 'finished',
        }),
      1200,
    )
  }

  const tips: string[] = []
  if (s.muted) tips.push('The child-facing speaker button is set to mute — tap the 🔊 button at the top of the screen.')
  if (!s.narration) tips.push('“Narration” is switched off above.')
  if (!s.sfx) tips.push('“Sound effects” is switched off above.')
  if (s.volume === 0) tips.push('The app volume slider is at 0.')
  if (report) {
    if (report.backend === 'captions')
      tips.push('The recording could not be played, so only the caption was shown. Close the Safari tab, reopen the app and tap “Test sound” again.')
    if (report.effects !== 'running') tips.push(`Sound effects engine is “${report.effects}”. Tap the check again; if it persists, close the Safari tab and reopen the app.`)
    if (report.session === 'none') tips.push('If the iPad is in Silent Mode (bell icon in Control Center), turn it off — this iPad version can’t override it.')
  }
  tips.push('Check the iPad volume buttons and that no Bluetooth headphones are connected.')

  return (
    <div className="rounded-2xl bg-white/5 p-3" dir="ltr" data-testid="sound-check">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xl font-bold" dir="rtl">
            فحص الصوت
          </div>
          <div className="text-sm text-white/60">Sound check — plays a chime and the storyteller says hello</div>
        </div>
        <button type="button" onClick={run} className="rounded-xl bg-violet-500 px-4 py-2 font-bold" data-testid="sound-check-run">
          🔊 Test sound
        </button>
      </div>
      {report && (
        <ul className="mt-3 space-y-1 text-sm" data-testid="sound-report">
          <li>
            Sound effects: <b>{report.effects}</b> · iPad silent-mode override: <b>{report.session === 'none' ? 'not available' : 'on'}</b>
          </li>
          <li>
            Narration: <b>{report.backend === 'recorded' ? 'playing the recording' : report.backend === 'captions' ? 'captions only' : report.backend}</b> ·
            recorded clips: <b>{recordedClipCount()} / {totalClipCount()}</b>
          </li>
        </ul>
      )}
      <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-white/80" data-testid="sound-tips">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
