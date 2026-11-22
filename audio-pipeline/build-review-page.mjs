#!/usr/bin/env node
// Builds a single self-contained listening page (clips embedded as data URIs)
// for reviewing auditions on any device. Output path is required and should be
// OUTSIDE the repo (the clips are private review material).
//   node audio-pipeline/build-review-page.mjs /path/to/review.html
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_AUDITION_LINES } from './auditions.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'audition', 'out')
const target = process.argv[2]
if (!target) {
  console.error('usage: build-review-page.mjs <output.html>')
  process.exit(1)
}

const results = JSON.parse(readFileSync(path.join(OUT_DIR, 'results.json'), 'utf8'))
const voices = {}
for (const [id, c] of Object.entries(results.clips)) {
  if (c.status !== 'ok') continue
  const key = id.split('/')[0]
  voices[key] ??= { key, provider: c.provider, model: c.model, voice: c.voice, fx: c.fx, note: c.note, character: c.character, clips: {} }
  voices[key].clips[c.lineId] = {
    duration: c.duration,
    src: 'data:audio/mpeg;base64,' + readFileSync(path.join(OUT_DIR, c.file)).toString('base64'),
  }
}
const failed = Object.entries(results.clips).filter(([, c]) => c.status !== 'ok').map(([id, c]) => ({ id, error: String(c.error).slice(0, 160) }))
const data = { lines: ALL_AUDITION_LINES, voices: Object.values(voices), failed }

const html = `<title>Hala Voice Casting</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@600;800&family=Readex+Pro:wght@400;500;600&display=swap">
<style>
/* Layout: a casting sheet — one section per character, voices as columns of takes, the script line as the row label. */
:root {
  --bg: #f4f2fb; --panel: #ffffff; --ink: #1c1940; --muted: #5d5a85; --line: #dedaf2;
  --accent: #6d3fe0; --accent-ink: #ffffff; --star: #e0a400; --zizo: #0d8f73; --bad: #c0392b;
  --display: 'Baloo Bhaijaan 2', 'Readex Pro', system-ui, sans-serif;
  --body: 'Readex Pro', 'Geeza Pro', 'Noto Naskh Arabic', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0e0c24; --panel: #1a1740; --ink: #f1efff; --muted: #a9a5d6; --line: #2c2862;
  --accent: #a98bff; --accent-ink: #120f2e; --star: #ffd24a; --zizo: #4ee6b4; --bad: #ff8a80; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0e0c24; --panel: #1a1740; --ink: #f1efff; --muted: #a9a5d6; --line: #2c2862;
  --accent: #a98bff; --accent-ink: #120f2e; --star: #ffd24a; --zizo: #4ee6b4; --bad: #ff8a80; color-scheme: dark }
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.55;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 20px 48px; }
.wrap { max-width: 1100px; margin: 0 auto; display: grid; gap: 28px; }
h1, h2 { font-family: var(--display); text-wrap: balance; margin: 0; line-height: 1.15; }
h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); }
h2 { font-size: 1.6rem; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
h2 small { font-family: var(--body); font-size: .9rem; color: var(--muted); font-weight: 500; }
.lede { color: var(--muted); max-width: 65ch; margin: 6px 0 0; }
.ar { direction: rtl; font-size: 1.12rem; font-family: var(--body); }
section { display: grid; gap: 14px; }
.voices { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.voice { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: grid; gap: 8px; min-width: 0; }
.voice.picked { border-color: var(--star); box-shadow: 0 0 0 2px var(--star) inset; }
.vname { font-weight: 600; font-size: 1.05rem; }
.meta { color: var(--muted); font-size: .82rem; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
button { font: inherit; font-weight: 600; border: 0; border-radius: 10px; padding: 8px 12px; cursor: pointer; background: var(--accent); color: var(--accent-ink); }
button.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
button.star[aria-pressed="true"] { background: var(--star); color: #1c1940; border-color: var(--star); }
button:focus-visible { outline: 3px solid var(--star); outline-offset: 2px; }
.line { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: grid; gap: 10px; }
.line .id { font-size: .78rem; color: var(--muted); letter-spacing: .04em; text-transform: uppercase; }
.takes { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.take { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 10px; padding: 6px 8px; background: transparent; color: var(--ink); font-weight: 500; text-align: start; min-width: 0; }
.take .play { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; flex: none; font-size: .8rem; }
.take.playing { border-color: var(--accent); }
.take .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .9rem; }
.take .dur { margin-inline-start: auto; color: var(--muted); font-size: .78rem; font-variant-numeric: tabular-nums; }
.zizo h2 { color: var(--zizo); }
.duo { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px; display: grid; gap: 10px; }
.duo .script div { padding: 2px 0; }
select { font: inherit; padding: 8px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); max-width: 100%; }
.failed { color: var(--bad); font-size: .85rem; }
.picks { background: var(--panel); border: 1px dashed var(--star); border-radius: 14px; padding: 12px 14px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<div class="wrap">
  <header>
    <h1>Hala Voice Casting</h1>
    <p class="lede">Gemini TTS auditions for رحلة حلا في الفضاء. Same script for every voice. Tap a take to play it, use “Play all” to hear a voice's full set, and star the voices you like (stars are saved on this device). Only one clip plays at a time.</p>
  </header>
  <div class="picks" id="picks"></div>
  <div id="sections"></div>
  <section id="duo-wrap"></section>
  <div id="failed"></div>
</div>
<script>
const D = ${JSON.stringify(data)};
let audio = null, playingBtn = null, chain = 0;
function stop() { chain++; if (audio) { audio.pause(); audio = null; } if (playingBtn) playingBtn.classList.remove('playing'); playingBtn = null; }
function play(src, btn) {
  return new Promise((resolve) => {
    if (audio) audio.pause();
    if (playingBtn) playingBtn.classList.remove('playing');
    audio = new Audio(src); playingBtn = btn || null;
    if (btn) btn.classList.add('playing');
    audio.onended = () => { if (btn) btn.classList.remove('playing'); resolve(true); };
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}
async function sequence(srcs) { const my = ++chain; for (const s of srcs) { if (my !== chain) return; await play(s); await new Promise((r) => setTimeout(r, 350)); } }
let stars = {}; try { stars = JSON.parse(localStorage.getItem('hala-casting-stars') || '{}'); } catch {}
const saveStars = () => { try { localStorage.setItem('hala-casting-stars', JSON.stringify(stars)); } catch {} };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const label = (v) => v.voice + (v.fx && v.fx !== 'none' ? ' + robot fx' : '');
const CH = { narrator: { title: 'Narrator', ar: 'الحكّاءة' }, zizo: { title: 'Zizo the robot', ar: 'زيزو' } };

function renderPicks() {
  const el = document.getElementById('picks');
  const picked = D.voices.filter((v) => stars[v.key]);
  el.innerHTML = picked.length
    ? '<b>Your stars:</b> ' + picked.map((v) => esc(CH[v.character].title + ': ' + label(v))).join(' · ')
    : '<b>Your stars:</b> none yet. Star a voice for each character, then tell Claude your picks.';
  document.querySelectorAll('.voice').forEach((c) => c.classList.toggle('picked', !!stars[c.dataset.key]));
  document.querySelectorAll('button.star').forEach((b) => b.setAttribute('aria-pressed', String(!!stars[b.dataset.key])));
}

let html = '';
for (const ch of ['narrator', 'zizo']) {
  const vs = D.voices.filter((v) => v.character === ch);
  html += '<section class="' + ch + '"><h2>' + CH[ch].title + ' <span class="ar">' + CH[ch].ar + '</span> <small>' + vs.length + ' voices</small></h2>';
  if (!vs.length) { html += '<p class="meta">No takes yet.</p></section>'; continue; }
  html += '<div class="voices">' + vs.map((v) => '<div class="voice" data-key="' + v.key + '"><div class="vname">' + esc(label(v)) + '</div><div class="meta">' + esc(v.note || '') + '<br>' + esc(v.model) + '</div><div class="row"><button data-all="' + v.key + '">▶ Play all</button><button class="ghost star" data-key="' + v.key + '" aria-pressed="false">★ Star</button></div></div>').join('') + '</div>';
  for (const line of D.lines.filter((l) => l.speaker === ch && !l.id.startsWith('d'))) {
    html += '<div class="line"><div class="ar">' + esc(line.text) + '</div><div class="id">' + esc(line.id) + ' · ' + esc(line.emotion) + '</div><div class="takes">';
    for (const v of vs) {
      const c = v.clips[line.id];
      html += c ? '<button class="take" data-v="' + v.key + '" data-l="' + line.id + '"><span class="play" aria-hidden="true">▶</span><span class="lbl">' + esc(label(v)) + '</span><span class="dur">' + c.duration + 's</span></button>'
                : '<div class="take"><span class="lbl failed">' + esc(label(v)) + ': missing</span></div>';
    }
    html += '</div></div>';
  }
  html += '</section>';
}
document.getElementById('sections').innerHTML = html;

const nv = D.voices.filter((v) => v.character === 'narrator'), zv = D.voices.filter((v) => v.character === 'zizo');
const duoLines = D.lines.filter((l) => l.id.startsWith('d'));
if (nv.length && zv.length) {
  document.getElementById('duo-wrap').innerHTML = '<h2>Together <small>narrator and Zizo, one after the other</small></h2><div class="duo"><div class="script ar">' +
    duoLines.map((l) => '<div><b>' + CH[l.speaker].ar + ':</b> ' + esc(l.text) + '</div>').join('') +
    '</div><div class="row"><label for="dn" class="meta">Narrator</label><select id="dn">' + nv.map((v) => '<option value="' + v.key + '">' + esc(label(v)) + '</option>').join('') + '</select>' +
    '<label for="dz" class="meta">Zizo</label><select id="dz">' + zv.map((v) => '<option value="' + v.key + '">' + esc(label(v)) + '</option>').join('') + '</select>' +
    '<button id="duo">▶ Play the exchange</button><button class="ghost" id="stop">■ Stop</button></div></div>';
}
if (D.failed.length) document.getElementById('failed').innerHTML = '<p class="failed"><b>Not generated (' + D.failed.length + '):</b> ' + D.failed.map((f) => esc(f.id)).join(', ') + '</p>';

const byKey = Object.fromEntries(D.voices.map((v) => [v.key, v]));
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.classList.contains('take')) { stop(); play(byKey[t.dataset.v].clips[t.dataset.l].src, t); }
  else if (t.dataset.all) { stop(); const v = byKey[t.dataset.all]; sequence(D.lines.filter((l) => l.speaker === v.character && !l.id.startsWith('d') && v.clips[l.id]).map((l) => v.clips[l.id].src)); }
  else if (t.classList.contains('star')) { stars[t.dataset.key] = !stars[t.dataset.key]; saveStars(); renderPicks(); }
  else if (t.id === 'duo') { stop(); const n = byKey[document.getElementById('dn').value], z = byKey[document.getElementById('dz').value];
    sequence(duoLines.map((l) => (l.speaker === 'narrator' ? n : z).clips[l.id]).filter(Boolean).map((c) => c.src)); }
  else if (t.id === 'stop') stop();
});
renderPicks();
</script>
`
writeFileSync(target, html)
console.log(`wrote ${target} (${Math.round(html.length / 1024)} KB, ${data.voices.length} voices, ${data.failed.length} missing)`)
