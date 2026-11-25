# Egyptian Arabic narration — architecture and workflow

## 1. Overview

There are two separate worlds:

| | Development time (your Mac / this repo) | Runtime (the website) |
|---|---|---|
| What | `audio-pipeline/` asks a TTS provider for each line, post-processes with ffmpeg, and writes MP3s + `src/audio/manifest.json` | The app plays the **prerecorded** MP3s from `public/audio/ar-EG/…` |
| Needs | API key (never committed), Node 22+, ffmpeg | Nothing: no API key, no TTS service, no browser speech synthesis |

Every device (iPad, iPhone, Mac, Windows) hears exactly the same approved recordings.

## 2. The two voices (approved after the Stage A audition)

| Character | Role | Voice |
|---|---|---|
| **الحكّاءة**, the storyteller | Welcomes حلا; explains planets and science; guides games and the story | Gemini TTS **Sulafat**, directed as a warm Cairene storyteller |
| **زيزو**, Zizo the robot | Jokes, reactions, celebrations, surprises; his own lines in the story | Gemini TTS **Puck** + a light robot shimmer (`zizo-light`: +5% pitch, tempo kept, faint echo) |

Both use the model `gemini-3.1-flash-tts-preview`. The single source of truth is `audio-pipeline/voices.config.mjs`.

Zizo is deliberately occasional: 31 of the 357 clips. He says his planet joke only on the first visit in a session.

## 3. Runtime

- **Player:** `src/audio/narrator.ts`.
  - One reusable `<audio>` element, unlocked by the first tap ("يلا نبدأ!"). Nothing plays before that.
  - **Queue with cancellation.** A new line stops the old one and drops anything queued, so voices never overlap. Changing screens always stops narration.
  - **Sequences:** a line can expand into several clips (storyteller → Zizo exchanges, and composed game lines such as «دي الأرض.» + «يلا ندور تاني على زحل!»), with short natural pauses in between.
  - **Lifecycle events** for animations: `narrator.on('start' | 'pause' | 'resume' | 'complete' | 'cancel' | 'error', fn)`. The state includes `speaker`. Zizo bounces and moves his mouth only while `speaker === 'zizo'`, and captions show the speaker.
  - **Missing or failing clip:** the caption is shown for its reading time and the clip id is logged once. There is never a robotic fallback.
  - **Settings:** mute and narration on/off stop the voice; the speed setting uses `playbackRate` with pitch kept.
  - **Volume:** the volume setting works on desktop. iOS ignores media volume, so use the device buttons there.
- **Music ducking:** ambient music drops while anyone speaks.
- **Prefetch:** a planet screen hints its facts and ending clips to the browser.
- **Offline:** the service worker caches each clip **whole** the first time it plays and answers the `<audio>` element's Range requests by slicing it, which Safari needs. Clips already heard replay offline; nothing is bulk-downloaded on first visit.
- **Re-recorded clips are never served stale:** each clip is addressed by a fingerprint of its MP3 (`…/clip.mp3?v=<audioSha>`, the first 12 hex digits of its SHA-256, stored in `src/audio/manifest.json`). A new take means a new address, so the offline cache and the browser fetch it fresh; the service worker then deletes older takes of that clip. Unchanged clips are re-filed from an older cache without downloading. `npm run audio:generate` and `npm run audio:manifest` keep `audioSha` up to date; if an MP3 is replaced by hand without running `npm run audio:manifest`, a unit test fails and the release is blocked.

## 4. Catalogue and manifest

- `src/content/script.ts` and `src/content/story.ts` hold all the words, as before.
- `src/content/clips.ts` decides which clip each line plays, who says it and with what emotion:
  - **Static lines** are one clip whose id is the line id (e.g. `planets.saturn.intro`).
  - **Game lines with blanks** are **pre-recorded per planet** (`games.find.question.saturn`) or **composed** from pieces (`common.thisIs.earth` + `games.find.tryAgain.saturn`). The pieces use the right grammar («دي الأرض», «ده زحل»).
- `src/audio/manifest.json` (built by `npm run audio:manifest`) has one entry per clip: `id`, `speaker`, `category`, canonical `text`, `emotion`, `file`, `hash`, `duration`.
  - The **hash** covers text + emotion + voice, so a clip is re-recorded only when one of those changes.
- **Files:** `public/audio/ar-EG/<narrator|zizo>/<welcome|planets|stories|games|rewards|common|reactions|jokes|celebrations|hints>/<id>.mp3`
- **Release gate:** `src/audio/library.test.ts` fails if any manifest clip is missing or implausible.

## 5. Generating and editing narration

Credentials go in `.env.local` (git-ignored):

```bash
GEMINI_API_KEY=...     # aistudio.google.com → Get API key; billing (prepaid credit) enabled
```

```bash
npm run audio:generate -- --dry-run        # what would be recorded + estimated cost
npm run audio:generate                     # record every missing or changed clip (default budget $5)
npm run audio:generate -- --only planets.saturn.intro,zizo.planets.saturn --force   # redo specific phrases
npm run audio:generate -- --budget 2       # hard stop at $2 (from the usage Google reports)
```

- **Batching:** a voice's lines are recorded in batches of up to 8 as one take, split at the pauses (`lib/split.mjs`). Any doubtful cut is re-recorded on its own. A take far too long for its text (the model rambled) is rejected and retried.
- **Post-processing** (`lib/audio.mjs`): trim silence, apply the voice's effect, loudness-normalise to −18 LUFS, MP3 mono 64 kbps.
- **Reviewing:** `tsx audio-pipeline/build-library-review.mjs <out.html>` builds a single page with every clip:
  - play one clip, or **▶▶ From here** to keep playing every clip after it;
  - re-recorded clips carry a **New take** badge, and a filter can show only those;
  - a **🔁 Redo** mark belongs to a specific take, so old marks don't stick to new recordings.

  Send the marked ids back with `--only … --force`; add `--single` to skip batching for redos.
- **Pronunciation:** if the voice mispronounces a word, add a pronunciation spelling (e.g. with vowel marks: المُشْتَرِي) to `PRONUNCIATION` in `src/content/clips.ts`, listing the clip ids it applies to. Only the audio changes, not the text on screen.
- **Adding a line:** add the text to the script and call it from the app with `say('your.id')`. Then run `npm run audio:generate`. Zizo's lines go under `script.zizo` or `reactions` (see `voiceOf` in `clips.ts`).
- **Another character:** add a `Speaker` in `src/content/clips.ts` and `src/audio/manifest.ts`, a voice in `voices.config.mjs`, a direction in `characters.mjs`, and a caption avatar in `Caption.tsx`. The player itself needs no change.

## 6. Auditions (Stage A tooling, kept for future voice changes)

`npm run audio:audition` (scripts in `audition-page.mjs`/`auditions.mjs`) records the same test lines with candidate voices from Gemini, ElevenLabs or Azure. `audio-pipeline/build-review-page.mjs` builds a comparison page. Outputs stay in the git-ignored `audition/out/`.

## 7. Costs and licensing

- The full library is about 13,000 characters. At Gemini list prices one complete pass is about **$0.55**, and only changed lines are re-recorded afterwards.
- Gemini API output generated on a **paid** project may be used in your own app; Google's API terms apply. The recordings are generated speech, not anyone's real voice.
- The ElevenLabs and Azure adapters remain available. ElevenLabs' free plan is non-commercial; its paid plans grant commercial use while subscribed.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| A line shows only a caption | Its clip is missing. Run `npm run audio:generate` and check the console for `[narration] no recording for "…"` |
| `ffmpeg not found` | `brew install ffmpeg` |
| `prepayment credits are depleted` / `402` | Add credit in AI Studio → Billing |
| `429 … per day` | Daily request cap: 10/day on the free tier, **100/day on paid Tier 1** for `gemini-3.1-flash-tts`. The run stops cleanly; re-run after the reset and it continues with what's missing |
| `fetch failed … ENOTFOUND` in a cloud session | Run with `NODE_USE_ENV_PROXY=1` |
| A phrase sounds wrong | Mark it on the review page and run `npm run audio:generate -- --only <ids> --force`. For a mispronounced word, change its spelling in the script |
| No sound on iPad | Parent settings → Sound check. Silent Mode is overridden on iPadOS 17+; otherwise check the volume buttons |
