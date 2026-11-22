#!/usr/bin/env node
// Builds a self-contained page to review the WHOLE narration library: every clip
// grouped by topic, a "redo" mark per clip, and a list of marked ids to send back.
// Clips are embedded as small 32 kbps previews so the page stays under size limits.
//   tsx audio-pipeline/build-library-review.mjs /path/outside/repo/review.html
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST } from './build-manifest.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2]
if (!target) throw new Error('usage: build-library-review.mjs <output.html>')

const manifest = JSON.parse(readFileSync(path.join(ROOT, MANIFEST), 'utf8'))
const preview = (file) =>
  execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '32k', '-f', 'mp3', '-']).toString('base64')

const GROUPS = [
  ['welcome', 'Welcome & home', (id) => /^(start|home|space|map)\./.test(id)],
  ['zizo', 'Zizo', (id, e) => e.speaker === 'zizo' && !id.startsWith('story.')],
  ['planets', 'Planets', (id) => id.startsWith('planets.')],
  ['games', 'Games', (id) => id.startsWith('games.')],
  ['common', 'Numbers, names & praise', (id) => id.startsWith('common.')],
  ['story', 'Story', (id) => id.startsWith('story.')],
]
const groups = GROUPS.map(([key, title]) => ({ key, title, clips: [] }))
let missing = 0
for (const e of manifest) {
  const file = path.join(ROOT, 'public', e.file)
  const g = groups[GROUPS.findIndex(([, , test]) => test(e.id, e))] ?? groups[0]
  const ok = e.duration && existsSync(file)
  if (!ok) missing++
  g.clips.push({ id: e.id, speaker: e.speaker, text: e.text, duration: e.duration ?? null, src: ok ? 'data:audio/mpeg;base64,' + preview(file) : null })
}
const data = { groups, total: manifest.length, missing }

const html = `<title>Hala Narration Library</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@600;800&family=Readex+Pro:wght@400;500;600&display=swap">
<style>
/* Layout: a review sheet — sticky summary of marked clips, then one section per topic with a row per clip. */
:root {
  --bg: #f4f2fb; --panel: #ffffff; --ink: #1c1940; --muted: #5d5a85; --line: #dedaf2;
  --accent: #6d3fe0; --accent-ink: #ffffff; --zizo: #0d8f73; --flag: #d1495b; --flag-bg: #fde8eb;
  --display: 'Baloo Bhaijaan 2', 'Readex Pro', system-ui, sans-serif;
  --body: 'Readex Pro', 'Geeza Pro', 'Noto Naskh Arabic', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e0c24; --panel: #1a1740; --ink: #f1efff; --muted: #a9a5d6; --line: #2c2862;
  --accent: #a98bff; --accent-ink: #120f2e; --zizo: #4ee6b4; --flag: #ff8a96; --flag-bg: #3a1622; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0e0c24; --panel: #1a1740; --ink: #f1efff; --muted: #a9a5d6; --line: #2c2862;
  --accent: #a98bff; --accent-ink: #120f2e; --zizo: #4ee6b4; --flag: #ff8a96; --flag-bg: #3a1622; color-scheme: dark }
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.5;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 16px 48px; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg); }
.wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 22px; }
h1, h2 { font-family: var(--display); margin: 0; line-height: 1.15; text-wrap: balance; }
h1 { font-size: clamp(1.7rem, 4vw, 2.4rem); }
h2 { font-size: 1.4rem; }
.lede { color: var(--muted); margin: 4px 0 0; max-width: 65ch; }
.bar { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; display: grid; gap: 8px; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
button { font: inherit; font-weight: 600; border: 0; border-radius: 10px; padding: 8px 12px; cursor: pointer; background: var(--accent); color: var(--accent-ink); }
button.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
textarea { width: 100%; min-height: 3.2em; font: 13px/1.4 ui-monospace, Menlo, monospace; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); padding: 8px; box-sizing: border-box; }
section { display: grid; gap: 8px; }
.clip { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 8px 10px; }
.clip.flagged { border-color: var(--flag); background: var(--flag-bg); }
.clip.playing { border-color: var(--accent); }
.play { width: 38px; height: 38px; border-radius: 50%; padding: 0; display: grid; place-items: center; }
.txt { min-width: 0; }
.ar { direction: rtl; font-size: 1.05rem; }
.meta { color: var(--muted); font-size: .76rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.who { font-weight: 600; }
.who.zizo { color: var(--zizo); }
.flag[aria-pressed="true"] { background: var(--flag); color: #fff; border-color: var(--flag); }
.missing { color: var(--flag); font-size: .85rem; }
@media (max-width: 480px) { .clip { grid-template-columns: auto 1fr; } .clip .flag { grid-column: 1 / -1; } }
</style>
<div class="wrap">
  <header>
    <h1>Hala Narration Library</h1>
    <p class="lede">Every recorded line in the app: the storyteller (Sulafat) and Zizo (Puck + light robot effect). Play any clip, mark the ones that sound wrong with “🔁 Redo”, then copy the list below and send it to Claude. Previews are slightly compressed; the app uses the full-quality files.</p>
  </header>
  <div class="bar">
    <div class="row"><b id="count"></b><button class="ghost" id="playall">▶ Play this page from the top</button><button class="ghost" id="stop">■ Stop</button></div>
    <label for="out" class="meta">Clips marked for redo (send this to Claude):</label>
    <textarea id="out" readonly></textarea>
    <div class="row"><button id="copy">Copy list</button><span class="meta" id="copied"></span></div>
  </div>
  <div id="groups"></div>
</div>
<script>
const D = ${JSON.stringify(data)};
let flags = {}; try { flags = JSON.parse(localStorage.getItem('hala-library-flags') || '{}'); } catch {}
const save = () => { try { localStorage.setItem('hala-library-flags', JSON.stringify(flags)); } catch {} };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const all = D.groups.flatMap((g) => g.clips);
const byId = Object.fromEntries(all.map((c) => [c.id, c]));
let audio = null, chain = 0, playingRow = null;
function mark(row) { if (playingRow) playingRow.classList.remove('playing'); playingRow = row; if (row) row.classList.add('playing'); }
function play(c) { return new Promise((res) => { if (audio) audio.pause(); if (!c.src) return res(); audio = new Audio(c.src); mark(document.querySelector('[data-id="' + CSS.escape(c.id) + '"]')); audio.onended = () => { mark(null); res(); }; audio.onerror = () => res(); audio.play().catch(() => res()); }); }
function stop() { chain++; if (audio) audio.pause(); mark(null); }
document.getElementById('groups').innerHTML = D.groups.filter((g) => g.clips.length).map((g) =>
  '<section><h2>' + esc(g.title) + ' <span class="meta">' + g.clips.length + ' clips</span></h2>' +
  g.clips.map((c) => '<div class="clip" data-id="' + esc(c.id) + '">' +
    (c.src ? '<button class="play" data-play="' + esc(c.id) + '" aria-label="Play ' + esc(c.id) + '">▶</button>' : '<span class="missing">missing</span>') +
    '<div class="txt"><div class="ar">' + esc(c.text) + '</div><div class="meta"><span class="who ' + c.speaker + '">' + (c.speaker === 'zizo' ? 'Zizo' : 'Storyteller') + '</span> · ' + esc(c.id) + (c.duration ? ' · ' + c.duration + 's' : '') + '</div></div>' +
    '<button class="ghost flag" data-flag="' + esc(c.id) + '" aria-pressed="false">🔁 Redo</button></div>').join('') + '</section>').join('');
function render() {
  const ids = Object.keys(flags).filter((k) => flags[k]);
  document.getElementById('count').textContent = (D.total - D.missing) + ' of ' + D.total + ' clips recorded · ' + ids.length + ' marked for redo';
  document.getElementById('out').value = ids.join(',');
  document.querySelectorAll('[data-flag]').forEach((b) => { const on = !!flags[b.dataset.flag]; b.setAttribute('aria-pressed', String(on)); b.closest('.clip').classList.toggle('flagged', on); });
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.play) { stop(); play(byId[t.dataset.play]); }
  else if (t.dataset.flag) { flags[t.dataset.flag] = !flags[t.dataset.flag]; save(); render(); }
  else if (t.id === 'stop') stop();
  else if (t.id === 'playall') { stop(); const my = chain; for (const c of all) { if (my !== chain) break; await play(c); await new Promise((r) => setTimeout(r, 300)); } }
  else if (t.id === 'copy') {
    const box = document.getElementById('out');
    try { await navigator.clipboard.writeText(box.value); document.getElementById('copied').textContent = 'Copied.'; }
    catch { box.select(); document.getElementById('copied').textContent = 'Selected — copy it with your device’s Copy.'; }
  }
});
render();
</script>
`
writeFileSync(target, html)
console.log(`wrote ${target} (${Math.round(html.length / 1024)} KB, ${manifest.length - missing}/${manifest.length} clips)`)
