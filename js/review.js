// review.js: вікно перевірки. Відео, версії, правки з часом, мітки на таймлайні, рішення.
import { api, esc, tag, fmtTime, fmtDate, toast } from './api.js';
import { initTema } from './tema.js';
initTema();

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');
const video = $('video');
let v, versions = [], cur = null, comments = [];

async function load() {
  try { v = await api.video(id); } catch (e) { $('title').textContent = 'Відео не знайдено'; return; }
  versions = await api.versions(id);
  cur = cur ? versions.find((x) => x.id === cur.id) : versions.find((x) => x.id === v.active_version_id) || versions.at(-1);
  $('title').textContent = v.title;
  document.title = 'Перевірка · ' + v.title;
  $('status').innerHTML = tag(v.status);
  $('when').textContent = '· оновлено ' + fmtDate(v.updated_at);
  $('ver').innerHTML = versions.map((x) => `<option value="${x.id}"${x.id === cur?.id ? ' selected' : ''}>Версія ${x.number}${x.id === v.active_version_id ? ' (остання)' : ''}</option>`).join('');
  if (video.dataset.ver !== cur?.id) {
    video.dataset.ver = cur?.id || '';
    const [src, poster] = await Promise.all([api.fileUrl(cur), api.thumbUrl(cur)]);
    video.poster = poster;
    $('nofile').hidden = !!src;
    if (src) video.src = src; else video.removeAttribute('src');
  }
  await loadComments();
}

async function loadComments() {
  comments = (await api.comments(id)).filter((c) => c.version_id === cur?.id);
  $('list').innerHTML = comments.length ? comments.map((c) => `<div class="cm${c.done ? ' done' : ''}">
      <span class="tc" data-t="${c.time_sec}">${fmtTime(c.time_sec)}</span><span class="tx">${esc(c.text)}</span>
      <span><button data-done="${c.id}" title="${c.done ? 'Повернути' : 'Виконано'}">${c.done ? '↺' : '✓'}</button><button data-del="${c.id}" title="Видалити">✕</button></span></div>`).join('')
    : '<div class="small muted">Правок до цієї версії немає.</div>';
  marks();
}

function marks() {
  const d = video.duration || cur?.duration_sec || 0;
  document.querySelectorAll('#tl .mk').forEach((m) => m.remove());
  if (!d) return;
  for (const c of comments) {
    const m = document.createElement('div');
    m.className = 'mk' + (c.done ? ' done' : '');
    m.style.left = (100 * c.time_sec / d) + '%';
    m.title = fmtTime(c.time_sec) + ' ' + c.text;
    $('tl').append(m);
  }
}

video.addEventListener('loadedmetadata', marks);
video.addEventListener('timeupdate', () => {
  $('at').textContent = fmtTime(video.currentTime);
  $('pos').style.width = (100 * video.currentTime / (video.duration || 1)) + '%';
});
$('tl').addEventListener('click', (e) => {
  const r = $('tl').getBoundingClientRect();
  if (video.duration) video.currentTime = video.duration * (e.clientX - r.left) / r.width;
});
$('back').onclick = () => { video.pause(); video.currentTime = Math.max(0, video.currentTime - 1 / 30); };
$('fwd').onclick = () => { video.pause(); video.currentTime += 1 / 30; };
$('ver').onchange = (e) => { cur = versions.find((x) => x.id === e.target.value); load(); };
$('text').addEventListener('focus', () => video.pause());

$('add').onclick = async () => {
  const text = $('text').value.trim();
  if (!text || !cur) return;
  $('add').disabled = true;
  try {
    await api.addComment({ video_id: id, version_id: cur.id, time_sec: video.currentTime, text });
    $('text').value = '';
    if (v.status !== 'pravky') { await api.setStatus(id, 'pravky'); }
    await load();
  } catch (e) { toast(e.message); }
  $('add').disabled = false;
};

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-t]');
  if (t) { video.currentTime = +t.dataset.t; video.pause(); return; }
  const dn = e.target.closest('[data-done]');
  if (dn) { const c = comments.find((x) => x.id === dn.dataset.done); await api.doneComment(c.id, !c.done); return loadComments(); }
  const dl = e.target.closest('[data-del]');
  if (dl && confirm('Видалити цю правку?')) { await api.delComment(dl.dataset.del); return loadComments(); }
  const st = e.target.closest('[data-st]');
  if (st) {
    try { await api.setStatus(id, st.dataset.st); toast(st.dataset.st === 'zatverdzheno' ? 'Схвалено' : 'Позначено: потрібні правки'); }
    catch (err) { toast(err.message); }
    load();
  }
});

if (await api.requireUser()) load();
