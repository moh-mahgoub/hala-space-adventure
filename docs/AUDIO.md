# Egyptian Arabic audio — architecture and workflow

> **Status: Stage A (voice selection).** The live site still uses the previous audio
> system. Nothing in this document changes production until Stage B is approved.

## 1. Overview

There are two separate worlds:

| | Development time (your Mac / this repo) | Runtime (the website) |
|---|---|---|
| What | `audio-pipeline/` scripts call a TTS provider, post-process with ffmpeg, write MP3s | The app plays the **prerecorded** MP3s |
| Needs | API key (in `.env.local`, never committed), Node 22+, ffmpeg | Nothing: no API key, no TTS service, no network beyond the site itself |
| Output | `public/audio/ar-EG/…` (Stage B) + manifest | Same recordings on every device |

The website never contacts a voice provider. A unit test enforces this.

## 2. The two voices

| Character | Role | Direction |
|---|---|---|
| **الحكّاءة**, the storyteller | Welcomes حلا, explains planets, guides stories and games, gives gentle instructions | Warm, affectionate young Cairene woman telling a story to a 4-year-old; conversational, smiling, natural pauses. Not a newsreader, not formal Arabic (MSA), not a baby voice |
| **زيزو الروبوت**, Zizo the robot | Funny reactions, surprises, celebrations, short jokes, occasional hints | Playful, energetic, slightly higher voice, comic timing, clear Egyptian pronunciation; a light robot shimmer at most |

The directions live in `audio-pipeline/characters.mjs`.

## 3. Providers

| | Google Gemini TTS | ElevenLabs | Azure AI Speech |
|---|---|---|---|
| Egyptian Arabic | Listed as supported; style is steered with natural-language directions | Egyptian-accent voices in the shared Voice Library (e.g. Hoda, Yasmine, an Egyptian audiobook narrator) | Dedicated voices `ar-EG-SalmaNeural` (female) and `ar-EG-ShakirNeural` (male) |
| Expressiveness | Directed in plain English ("warm, excited…") | v3+ inline tags (`[excited]`, `[laughs]`) | SSML prosody (rate/pitch); limited emotion |
| Default model | `gemini-3.1-flash-tts-preview` (override with `GEMINI_TTS_MODEL`) | `eleven_v3` (override with `ELEVENLABS_MODEL`; a v4 exists) | neural |
| Price (list, verify before paying) | ≈ $0.50–1/1M input tokens + $6–20/1M audio tokens; free tier | ≈ $0.08–0.10 per 1K characters; plans from $6/mo | ≈ $15–16 per 1M characters; 500K free each month |
| Licensing for a public website | Generated output is yours to use under Google's API terms; preview models have no SLA. Check the current terms (e.g. for watermarking) | **Free plan: non-commercial and requires attribution.** Paid plans (Starter+) grant commercial rights. Library voices can carry extra terms from their creators | Allowed for content creation under Microsoft's Product Terms; don't use voices to impersonate real people |

Listening quality is decided by the auditions, not by these tables.

## 4. Credentials

Create `.env.local` in the repo root (it is git-ignored):

```bash
GEMINI_API_KEY=...            # aistudio.google.com → Get API key
ELEVENLABS_API_KEY=...        # elevenlabs.io → Profile → API keys
                              #   permissions needed: Text to Speech, Voices (read + write)
AZURE_SPEECH_KEY=...          # Azure portal → Speech resource → Keys and Endpoint
AZURE_SPEECH_REGION=westeurope
```

In a Claude Code cloud session the keys are stored as environment **network secrets** instead, and Node needs `NODE_USE_ENV_PROXY=1` to use the session proxy.

## 5. Auditions (Stage A)

```bash
npm run audio:audition:dry          # plan + cost estimate, no API calls
npm run audio:audition              # generate for every provider with a key
npm run audio:audition -- --providers gemini --character zizo
npm run audio:audition -- --only n2-saturn --force   # redo one line
npm run audio:audition:serve        # listen: http://localhost:5050 (iPad: the LAN URL it prints)
npm run audio:voices                # list ElevenLabs Egyptian voices (needs a key)
```

- The scripts are in `audio-pipeline/auditions.mjs`: 5 narrator lines, 5 Zizo lines and a 3-line exchange, with identical text for every voice.
- Clips go to `audition/out/<character>/<provider-voice>/<line>.mp3`. They are **git-ignored and never deployed**.
- `audition/out/results.json` records the provider, model, voice, effect, text, duration and errors for every clip.
- The page plays each line across voices, plays a whole voice set, plays the two-voice exchange with any pairing, lists failures, and saves ★ favourites on the device.
- Only missing clips are generated unless you pass `--force`.

## 6. Post-processing

`audio-pipeline/lib/audio.mjs` (ffmpeg; on macOS `brew install ffmpeg`):
- trim leading/trailing silence, keeping a natural breath;
- optional character effect: `zizo-light` (+5% pitch, tempo kept, faint shimmer). Deliberately subtle so pronunciation survives;
- loudness-normalise to **−18 LUFS** (true peak −1.5 dB) so both voices sit at the same level;
- MP3, mono, 64 kbps (speech-transparent, about 8 KB per second).

## 7. Manifest (foundation for Stage B)

`src/audio/manifest.ts` defines one entry per clip: `id`, `speaker`, canonical `text`, optional `synthText` (pronunciation-only), `emotion`, `file`, `category`, `duration`, `scene`, `animation`, `hash`.

Files live at `audio/ar-EG/<speaker>/<category>/<id>.mp3`, where category is welcome, planets, stories, games or rewards for the narrator, and reactions, jokes, celebrations or hints for Zizo.

Components will refer to clips by `id` only. `npm run audio:manifest:draft` sizes the library from today's scripts: 218 clips, about 9,400 characters. 12 lines contain game-time placeholders (`{planet}`…) and will be split into composable clips in Stage B.

## 8. Stage B plan (after voice approval and a separate budget approval)

1. Rewrite and extend the scripts: more natural Egyptian, Zizo's lines and short narrator↔Zizo exchanges, robot renamed نوري → زيزو, and pronunciation `synthText` where needed.
2. Generate the full library with the approved voices (only changed or missing clips, cost estimate first, review page).
3. Replace browser TTS with an asset player: sequential queue with cancellation, `onStart/onComplete/onCancel/onError` events for animations, preloading, music ducking, mute and volume. Missing clips show captions and are logged, never robotic fallback speech.
4. Validation before deploy: every manifest id has a file; paths work under `/hala-space-adventure/`.
5. Service-worker caching of narration as it is played (offline replay), with no bulk download on first visit.
6. Regression tests, then deployment with your approval.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `ffmpeg not found` | `brew install ffmpeg` |
| ElevenLabs `missing the permission voices_read` | Edit the API key's permissions: Voices → read and write; Text to Speech → access |
| `fetch failed … ENOTFOUND` in a cloud session | Run with `NODE_USE_ENV_PROXY=1` |
| A line sounds wrong | Add `synthText` (spelling or diacritics for pronunciation only) and regenerate with `--only <id> --force` |
