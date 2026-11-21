/**
 * Recorded narration registry.
 *
 * By default the app uses the browser's Arabic speech voice. To use real
 * recorded Egyptian-Arabic narration for a line:
 *
 *   1. Record the line (mp3 or m4a; mono 64–96 kbps is plenty).
 *   2. Save it as  public/audio/narration/<line-id>.mp3
 *      e.g.        public/audio/narration/planets.earth.intro.mp3
 *   3. Add the id to RECORDED_LINES below.
 *
 * Recordings are only used when the line has no dynamic placeholders, and
 * (for lines containing {name}) only while the child's name is the default
 * "حلا" — because the recording says that name. Otherwise the app falls back
 * to speech synthesis automatically.
 *
 * Use `npm run list-lines` to print every line id with its text.
 */
export const RECORDED_LINES: readonly string[] = [
  // 'start.welcome',
  // 'planets.earth.intro',
]

export const RECORDING_EXT = 'mp3'
