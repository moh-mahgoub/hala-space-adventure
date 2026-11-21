// Builds audition/out/index.html — a self-contained local page for listening and comparing.
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { ALL_AUDITION_LINES } from './auditions.mjs'

export function buildAuditionPage(outDir, results) {
  const data = { lines: ALL_AUDITION_LINES, clips: results.clips, providers: results.providers, generatedAt: results.generatedAt }
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voice auditions — رحلة حلا</title>
<style>
:root{--bg:#0d1036;--card:#171a52;--ink:#f6f5ff;--muted:#a9acd6;--accent:#ffd84a;--ok:#4ee6b4;--bad:#ff7a8a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px}
h1{font-size:1.4rem;margin:0 0 4px}h2{margin:28px 0 8px;font-size:1.25rem}h3{margin:18px 0 6px;font-size:1rem;color:var(--muted)}
.card{background:var(--card);border-radius:16px;padding:12px 14px;margin:10px 0}
.ar{direction:rtl;font-size:1.15rem;font-family:"Geeza Pro","Noto Naskh Arabic",system-ui,sans-serif}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.clip{background:#0f1240;border-radius:12px;padding:8px 10px}.clip b{display:block}.small{color:var(--muted);font-size:.85rem}
audio{width:100%;height:40px;margin-top:4px}button{background:#8b5cf6;color:#fff;border:0;border-radius:10px;padding:8px 12px;font-weight:700;font-size:.95rem}
button.fav{background:#2a2e72}button.fav.on{background:var(--accent);color:#111}select{font-size:1rem;padding:6px;border-radius:8px;max-width:100%}
.bad{color:var(--bad)}.ok{color:var(--ok)}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
</style></head><body>
<h1>Voice auditions — رحلة حلا في الفضاء</h1>
<div class="small">Private, local review page. Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Mark favourites with ★ (saved on this device only).</div>
<div id="app"></div>
<script>
const D = ${JSON.stringify(data)};
const app = document.getElementById('app');
const favs = JSON.parse(localStorage.getItem('audition-favs') || '{}');
const saveFavs = () => localStorage.setItem('audition-favs', JSON.stringify(favs));
let current = null;
function play(src, then) { if (current) { current.pause(); } current = new Audio(src); current.onended = then || null; current.play(); }
const voicesOf = (character) => {
  const m = new Map();
  for (const [id, c] of Object.entries(D.clips)) if (c.character === character && c.status === 'ok') {
    const key = id.split('/')[0]; if (!m.has(key)) m.set(key, c);
  }
  return [...m.entries()];
};
const clip = (voiceKey, lineId) => D.clips[voiceKey + '/' + lineId];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let html = '';
// providers status
html += '<div class="card"><b>Providers</b><ul>';
for (const [p, s] of Object.entries(D.providers || {})) html += '<li>' + esc(s.label) + ': ' + (s.available ? '<span class="ok">credentials found</span>' : '<span class="bad">not configured (' + esc(s.credentials.join(' + ')) + ')</span>') + '</li>';
html += '</ul></div>';
for (const character of ['narrator', 'zizo']) {
  const title = character === 'narrator' ? 'Narrator — الحكّاءة' : 'Zizo the robot — زيزو';
  const voices = voicesOf(character);
  html += '<h2>' + title + '</h2>';
  if (!voices.length) { html += '<div class="card small">No clips yet for this character.</div>'; continue; }
  html += '<h3>Voices (play a whole set, mark favourites)</h3><div class="grid">';
  for (const [key, c] of voices) {
    html += '<div class="clip"><b>' + esc(c.provider + ' · ' + c.voice + (c.fx !== 'none' ? ' · ' + c.fx : '')) + '</b><div class="small">' + esc(c.model) + (c.note ? ' — ' + esc(c.note) : '') + '</div>' +
      '<div class="row" style="margin-top:6px"><button data-playall="' + key + '" data-char="' + character + '">▶ Play all</button>' +
      '<button class="fav ' + (favs[key] ? 'on' : '') + '" data-fav="' + key + '">★</button></div></div>';
  }
  html += '</div><h3>Line by line</h3>';
  for (const line of D.lines.filter((l) => l.speaker === character && !l.id.startsWith('d'))) {
    html += '<div class="card"><div class="ar">' + esc(line.text) + '</div><div class="small">' + esc(line.id) + ' · ' + esc(line.emotion) + '</div><div class="grid" style="margin-top:8px">';
    for (const [key, c0] of voices) {
      const c = clip(key, line.id);
      html += '<div class="clip"><b>' + esc(c0.provider + ' · ' + c0.voice + (c0.fx !== 'none' ? ' · fx' : '')) + '</b>' +
        (c && c.status === 'ok' ? '<audio controls preload="none" src="' + esc(c.file) + '"></audio><span class="small">' + c.duration + ' s</span>' : '<span class="bad small">' + esc(c ? c.error : 'missing') + '</span>') + '</div>';
    }
    html += '</div></div>';
  }
}
// dialogue
const nv = voicesOf('narrator'), zv = voicesOf('zizo');
if (nv.length && zv.length) {
  html += '<h2>Together — sequential dialogue</h2><div class="card"><div class="ar">';
  for (const l of D.lines.filter((l) => l.id.startsWith('d'))) html += '<div><b>' + (l.speaker === 'narrator' ? 'الحكّاءة' : 'زيزو') + ':</b> ' + esc(l.text) + '</div>';
  html += '</div><div class="row" style="margin-top:8px"><select id="dn">' + nv.map(([k, c]) => '<option value="' + k + '">' + esc(c.provider + ' · ' + c.voice) + '</option>').join('') + '</select>' +
    '<select id="dz">' + zv.map(([k, c]) => '<option value="' + k + '">' + esc(c.provider + ' · ' + c.voice + (c.fx !== 'none' ? ' · fx' : '')) + '</option>').join('') + '</select>' +
    '<button id="dplay">▶ Play exchange</button></div></div>';
}
// failures
const failed = Object.entries(D.clips).filter(([, c]) => c.status !== 'ok');
if (failed.length) html += '<h2 class="bad">Failed / missing (' + failed.length + ')</h2><div class="card small">' + failed.map(([id, c]) => esc(id) + ': ' + esc(c.error)).join('<br>') + '</div>';
app.innerHTML = html;
app.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.fav) { favs[t.dataset.fav] = !favs[t.dataset.fav]; saveFavs(); t.classList.toggle('on'); }
  if (t.dataset.playall) {
    const key = t.dataset.playall;
    const list = D.lines.filter((l) => l.speaker === t.dataset.char).map((l) => clip(key, l.id)).filter((c) => c && c.status === 'ok');
    const step = (i) => { if (i < list.length) play(list[i].file, () => setTimeout(() => step(i + 1), 500)); };
    step(0);
  }
  if (t.id === 'dplay') {
    const n = document.getElementById('dn').value, z = document.getElementById('dz').value;
    const list = D.lines.filter((l) => l.id.startsWith('d')).map((l) => clip(l.speaker === 'narrator' ? n : z, l.id)).filter(Boolean);
    const step = (i) => { if (i < list.length) play(list[i].file, () => setTimeout(() => step(i + 1), 350)); };
    step(0);
  }
});
</script></body></html>`
  writeFileSync(path.join(outDir, 'index.html'), html)
}
