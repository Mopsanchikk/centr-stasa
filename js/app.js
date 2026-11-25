// app.js: екрани нового Центру (Головна, Відео, Схвалення, Черга, Сценарії, Статистика, Профіль).
import { api, esc, tag, fmtDur, fmtDate, toast, STATUS_LABEL } from './api.js';
import { initTema } from './tema.js';
initTema();

const main = document.getElementById('main');
let videos = [];
let filter = 'all';
let user = null;
let ideasCache = [];

const thumb = (v) => v.thumb ? `style="background-image:url('${v.thumb}')"` : '';
const open = (v) => `review.html?id=${encodeURIComponent(v.id)}`;

function card(v) {
  const d = v.active_version?.duration_sec;
  return `<a class="vcard" href="${open(v)}">
    <div class="thumb" ${thumb(v)}><span class="st">${tag(v.status)}</span><span class="pl"></span>${d ? `<span class="dur">${fmtDur(d)}</span>` : ''}</div>
    <div class="body"><div class="t">${esc(v.title)}</div>
      <div class="m">Версія ${v.active_version?.number ?? '—'} · ${fmtDate(v.updated_at)}${v.open_comments ? ` · ✎ ${v.open_comments}` : ''}</div></div></a>`;
}

function item(v, actions = '') {
  return `<div class="item"><a class="mini" href="${open(v)}" ${thumb(v)}></a>
    <div><a href="${open(v)}" style="color:inherit"><b>${esc(v.title)}</b></a>
      <div class="small muted">${tag(v.status)} · версія ${v.active_version?.number ?? '—'} · ${fmtDate(v.updated_at)}${v.open_comments ? ` · відкритих правок: ${v.open_comments}` : ''}</div></div>
    <div class="row">${actions}</div></div>`;
}

const count = (st) => videos.filter((v) => v.status === st).length;

const screens = {
  home() {
    const wait = videos.filter((v) => v.status === 'perevirka');
    const fix = videos.filter((v) => v.status === 'pravky');
    const h = new Date().getHours();
    const hi = h < 12 ? 'Доброго ранку' : h < 18 ? 'Добрий день' : 'Добрий вечір';
    const first = wait[0];
    return `<section class="hero"><img class="ava" src="img/ava.svg" alt=""><small>Центр монтажу</small><h1>${hi}, Стасе</h1>
        <p>${first ? `Нова версія чекає на тебе: «${esc(first.title)}».` : 'Нових версій немає. Усе переглянуто.'}</p>
        ${first ? `<a class="btn" href="${open(first)}">Дивитись</a>` : '<a class="btn" href="#scripts">Відкрити сценарії</a>'}</section>
      <div class="tiles">
        <div class="tile"><div class="n">${wait.length}</div><div class="l">Чекають на тебе</div></div>
        <div class="tile"><div class="n">${fix.length}</div><div class="l">У правках</div></div>
        <div class="tile"><div class="n">${count('zatverdzheno')}</div><div class="l">Затверджено</div></div>
      </div>
      ${wait.length > 1 ? `<h2>Чекають на тебе</h2><div class="list">${wait.map((v) => item(v, `<a class="btn main" href="${open(v)}">Дивитись</a>`)).join('')}</div>` : ''}
      <h2>Останні відео</h2><div class="grid">${videos.slice(0, 4).map(card).join('')}</div>`;
  },

  videos() {
    const list = filter === 'all' ? videos : videos.filter((v) => v.status === filter);
    const chips = [['all', 'Усі'], ...Object.entries(STATUS_LABEL)]
      .map(([k, l]) => `<button class="chip${filter === k ? ' on' : ''}" data-f="${k}">${l}${k === 'all' ? '' : ` · ${count(k)}`}</button>`).join('');
    return `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1>Відео</h1><p class="muted" style="margin:0">Усі ролики й версії. Натисни на ролик, щоб переглянути.</p></div></div>
      <div class="chips">${chips}</div>
      ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<div class="card empty">Тут поки порожньо. Нові ролики з’являться, щойно я їх змонтую.</div>'}`;
  },

  approve() {
    const wait = videos.filter((v) => v.status === 'perevirka');
    return `<h1>Схвалення</h1><p class="muted">Нові версії, які чекають на твоє рішення. Без твого «Схвалити» нічого не публікується.</p>
      ${wait.length ? `<div class="list">${wait.map((v) => item(v, `
          <a class="btn quiet" href="${open(v)}">Дивитись</a>
          <button class="btn" data-st="pravky" data-id="${v.id}">Потрібні правки</button>
          <button class="btn main" data-st="zatverdzheno" data-id="${v.id}">Схвалити</button>`)).join('')}</div>`
        : `<div class="card empty"><div class="big">✓</div>Нічого не чекає на схвалення.<br>Нові версії з'являться тут, щойно я їх змонтую.</div>`}`;
  },

  queue() {
    const ready = videos.filter((v) => v.status === 'zatverdzheno').slice(0, 3);
    const slots = ['Сьогодні 18:00', 'Завтра 12:00', 'Завтра 19:30'];
    const kinds = ['Пробний рілс', 'Пробний рілс', 'Рілс у профіль'];
    return `<div class="row"><h1>Черга</h1><span class="tag demo">демо</span></div>
      <p class="muted">Розклад публікацій в Instagram. Запрацює після підключення Instagram (етап 5). Поки це приклад того, як виглядатиме.</p>
      <div class="card">${ready.length ? ready.map((v, i) => `<div class="slot"><div class="when">${slots[i]}</div>
          <div><b>${esc(v.title)}</b><div class="small muted">${kinds[i]}</div></div><span class="tag zatverdzheno">Схвалено</span></div>`).join('')
        : '<div class="empty">Немає схвалених відео.</div>'}</div>
      <p class="note">Публікація йде з твого ПК, коли він увімкнений. Якщо в призначений час ПК вимкнений, ролик вийде, щойно ти його ввімкнеш.</p>`;
  },

  async scripts() {
    const [ideas, files] = await Promise.all([api.ideas(), api.scripts()]);
    ideasCache = ideas;
    const RUB = { ekspert: 'Експерт', mif: 'Міф / правда', novyna: 'Новина', osobyste: 'Особисте', pytannia: 'Питання глядачів', eksperyment: 'Експеримент' };
    const ASK = { expand: 'розгорнути', rehook: 'нові хуки', addhook: '+ хук', idea: 'розгорнути ідею' };
    const idea = (x) => {
      const hooks = Array.isArray(x.hooks) ? x.hooks : [];
      const main = hooks.find((h) => h.main) || hooks[0];
      const pend = (x.pending || []).map((p) => ASK[p.action] || p.action);
      return `<details class="card sc idea${x.verdict === 'nope' ? ' nope' : ''}" data-idea="${x.id}"><summary class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start">
        <div><div class="row" style="gap:6px;margin-bottom:6px">${x.saved ? '<span class="tag zatverdzheno">⭐ Збережено</span>' : ''}${x.rubric ? `<span class="tag montazh">${esc(RUB[x.rubric] || x.rubric)}</span>` : ''}
          ${x.status === 'recorded' ? '<span class="tag perevirka">Знято</span>' : ''}${pend.length ? `<span class="tag demo">Сценарист: ${esc(pend.join(', '))}</span>` : ''}</div>
          <b>${esc(x.title || 'Ідея')}</b>${main ? `<div class="hook">«${esc(main.say || main.text || '')}»</div>` : ''}</div><span class="arr">▾</span></summary>
        ${hooks.length ? `<div class="sub">Хуки</div>${hooks.map((h, i) => `<div class="hk"><b>${i + 1}.</b> ${esc(h.say || '')}${h.text ? `<div class="small muted">Напис: ${esc(h.text)}</div>` : ''}${h.shot ? `<div class="small muted">У кадрі: ${esc(h.shot)}</div>` : ''}</div>`).join('')}` : ''}
        ${x.body ? `<div class="sub">${x.kind === 'full' ? 'Сценарій' : 'Суть'}</div><pre class="script">${esc(x.body)}</pre>` : ''}
        ${(x.why || []).length ? `<div class="sub">Чому має зайти</div>${x.why.map((w) => `<div class="small">• ${esc(w.fact || '')}${w.url ? ` <a href="${esc(w.url)}" target="_blank" rel="noopener">джерело</a>` : ''}</div>`).join('')}` : ''}
        ${x.shoot_hint ? `<div class="sub">Де знімати</div><div class="small">${esc(x.shoot_hint)}</div>` : ''}
        <div class="row" style="margin-top:16px">
          <button class="btn ${x.saved ? 'main' : ''}" data-act="save">${x.saved ? '⭐ Збережено' : '⭐ Зберегти'}</button>
          <button class="btn quiet" data-act="nope">✖ Не те</button>
          <button class="btn quiet" data-act="expand">Розгорнути</button>
          <button class="btn quiet" data-act="rehook">Переробити хук</button>
          ${x.body || hooks.length ? '<button class="btn quiet" data-act="prompter">Суфлер</button>' : ''}
          <button class="btn quiet" data-act="recorded">${x.status === 'recorded' ? 'Знято ✓' : 'Зняв'}</button>
        </div></details>`;
    };
    const live = ideas.filter((x) => x.verdict !== 'nope');
    const nope = ideas.filter((x) => x.verdict === 'nope');
    return `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><h1>Сценарії</h1>
        <p class="muted" style="margin:0">Ідеї від Сценариста. ⭐ — подобається, ✖ — ні: він на цьому вчиться.</p></div>
        <button class="btn main" id="newIdea">💡 Ідея</button></div>
      <div style="margin-top:18px">${live.length ? `<div class="list">${live.map(idea).join('')}</div>`
        : '<div class="card empty">Ідей ще немає. Відкрий ярлик «Сценарист» на Робочому столі: він поставить питання і зробить першу пачку.</div>'}</div>
      ${nope.length ? `<details style="margin-top:16px"><summary class="muted" style="cursor:pointer">Відкинуті (${nope.length})</summary><div class="list" style="margin-top:12px">${nope.map(idea).join('')}</div></details>` : ''}
      ${files.length ? `<h2>Сценарії роликів</h2><div class="list">${files.map((f) => `<details class="card sc"><summary class="row" style="justify-content:space-between;flex-wrap:nowrap">
          <div><b>${esc(f.title)}</b><div class="small muted">${esc((f.status.split(/[.(]/)[0].trim().replace(/^ПІДТВЕРДЖЕНО/, 'Підтверджено') || 'Без статусу'))} · ${fmtDate(f.updated_at)}</div></div><span class="arr">▾</span></summary>
          <pre class="script">${esc(f.text.replace(/^#.*\n+/, '').replace(/\*\*/g, ''))}</pre></details>`).join('')}</div>` : ''}`;
  },

  async stats() {
    const [s, tt] = await Promise.all([api.stats(), api.tiktok().catch(() => null)]);
    let ttHtml = '<div class="card empty">Дані TikTok ще не завантажились. Вони оновлюються самі кожні 6 годин, коли ПК увімкнений.</div>';
    if (tt && tt.videos?.length) {
      const views = tt.videos.map((v) => v.views || 0).sort((a, b) => a - b);
      const med = views[Math.floor(views.length / 2)] || 0;
      const light = (n) => (n >= med * 1.5 ? '🟢' : n < med * 0.6 ? '🔴' : '🟡');
      const n = (x) => (x ?? '—').toLocaleString('uk-UA');
      ttHtml = `<div class="tiles" style="margin-top:0"><div class="tile"><div class="n">${tt.videos.length}</div><div class="l">Відео</div></div>
          <div class="tile"><div class="n">${n(med)}</div><div class="l">Типові перегляди</div></div>
          <div class="tile"><div class="n">${n(Math.max(...views))}</div><div class="l">Найкраще відео</div></div></div>
        <p class="small muted">🟢 у 1,5 раза вище за твої типові перегляди · 🟡 близько · 🔴 нижче. Оновлено ${new Date(tt.fetched_at).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.</p>
        <div class="card scroll"><table class="t"><tr><th></th><th>Дата</th><th>Відео</th><th>Перегляди</th><th>Лайки</th><th>Коментарі</th><th>Репости</th></tr>
        ${tt.videos.map((v) => `<tr><td>${light(v.views || 0)}</td><td>${v.published ? new Date(v.published).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) : ''}</td>
          <td style="white-space:normal;min-width:180px"><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc((v.title || '').slice(0, 60))}</a></td>
          <td><b>${n(v.views)}</b></td><td>${n(v.likes)}</td><td>${n(v.comments)}</td><td>${n(v.shares)}</td></tr>`).join('')}</table></div>`;
    }
    return `<h1>Статистика</h1><p class="muted">TikTok підтягується сам. Час перегляду й утримання TikTok віддає лише в TikTok Studio.</p>
      <h2>TikTok</h2>${ttHtml}
      ${s.rows.length ? `<h2>Instagram (вручну)</h2><div class="card scroll"><table class="t"><tr>${s.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
        ${s.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>` : ''}`;
  },

  profile() {
    return `<h1>Профіль</h1><p class="muted">Хто ти і що вже підключено.</p>
      <div class="card row" style="gap:18px"><img src="img/ava.svg" alt="" width="84" height="84" style="border-radius:50%">
        <div><h3 style="font-size:20px">Стас</h3><div class="muted">Лікар-інтерн, акушерство-гінекологія</div>
        <div class="small"><a href="https://www.tiktok.com/@dr.stas_mendzhul" target="_blank" rel="noopener">TikTok @dr.stas_mendzhul</a></div>
        <div class="small muted">Вхід: ${esc(user?.email || '')}</div></div>
        <button class="btn quiet" id="logout" style="margin-left:auto">Вийти</button></div>
      <h2>Підключення</h2>
      <div class="card"><div class="slot"><div class="when">База</div><div>Supabase (безкоштовно): відео, правки, черга</div><span class="tag zatverdzheno">Працює</span></div>
        <div class="slot"><div class="when">Telegram</div><div>@montage_clode_bot: «Схвалити / Правки / Відхилити», коли ПК увімкнений</div><span class="tag zatverdzheno">Працює</span></div>
        <div class="slot"><div class="when">Сайт</div><div>Центр з телефона за адресою https://…</div><span class="tag">Етап 3</span></div>
        <div class="slot"><div class="when">Instagram</div><div>Автопублікація лише після твого «Схвалити»</div><span class="tag">Етап 5</span></div>
        <div class="slot"><div class="when">TikTok</div><div>Статистика з публічної сторінки, кожні 6 год</div><span class="tag zatverdzheno">Працює</span></div></div>`;
  },
};

async function render() {
  const page = (location.hash || '#home').slice(1);
  const fn = screens[page] || screens.home;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.p === (screens[page] ? page : 'home')));
  try {
    videos = await api.videos();
    const n = count('perevirka'), b = document.getElementById('nApprove');
    b.hidden = !n; b.textContent = n;
    main.innerHTML = await fn();
  } catch (e) {
    main.innerHTML = `<div class="card empty"><div class="big">⚠</div>${esc(e.message)}</div>`;
  }
}

main.addEventListener('click', async (e) => {
  if (e.target.id === 'logout') return api.signOut();
  if (e.target.id === 'newIdea') {
    const text = prompt('Твоя ідея (можна кількома реченнями). Сценарист розгорне її в сценарій:');
    if (!text || !text.trim()) return;
    try { await api.addIdea(text.trim()); toast('Записав. Сценарист розгорне.'); } catch (err) { toast(err.message); }
    return render();
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    e.preventDefault();
    const id = act.closest('[data-idea]').dataset.idea;
    const x = ideasCache.find((i) => i.id === id);
    const a = act.dataset.act;
    try {
      if (a === 'prompter') return prompter(x);
      if (a === 'save') await api.updateIdea(id, { saved: !x.saved, verdict: x.saved ? null : 'take' });
      if (a === 'nope') { const why = prompt('Чому не те? (можна пропустити)') ?? ''; await api.updateIdea(id, { saved: false, verdict: 'nope', verdict_reason: why.trim() || null }); }
      if (a === 'expand' || a === 'rehook') { await api.askIdea(id, a); toast('Передав Сценаристу'); }
      if (a === 'recorded') await api.updateIdea(id, { status: x.status === 'recorded' ? 'idea' : 'recorded' });
    } catch (err) { toast(err.message); }
    const open = [...document.querySelectorAll('[data-idea][open]')].map((d) => d.dataset.idea);
    await render();
    open.forEach((oid) => document.querySelector(`[data-idea="${oid}"]`)?.setAttribute('open', ''));
    return;
  }
  const f = e.target.closest('[data-f]');
  if (f) { filter = f.dataset.f; return render(); }
  const st = e.target.closest('[data-st]');
  if (st) {
    st.disabled = true;
    try { await api.setStatus(st.dataset.id, st.dataset.st); toast(st.dataset.st === 'zatverdzheno' ? 'Схвалено' : 'Позначено: потрібні правки'); }
    catch (err) { toast(err.message); }
    render();
  }
});

function prompter(x) {
  const hooks = Array.isArray(x.hooks) ? x.hooks : [];
  const main = hooks.find((h) => h.main) || hooks[0];
  const d = document.createElement('div');
  d.className = 'prompter';
  d.innerHTML = `<button class="btn" id="pClose">Закрити</button><div class="pz">
    ${main ? `<div class="ph">ХУК</div><p class="pt hookline">${esc(main.say || main.text || '')}</p>` : ''}
    ${hooks.filter((h) => h !== main).map((h, i) => `<div class="ph">ДУБЛЬ ХУКА ${i + 2}</div><p class="pt">${esc(h.say || h.text || '')}</p>`).join('')}
    ${x.body ? `<div class="ph">ТЕКСТ</div><p class="pt">${esc(x.body).replace(/\n/g, '<br>')}</p>` : ''}<div class="pend"></div></div>
    <div class="pbar">
      <button class="btn" id="pTop" title="На початок">⏮ На початок</button>
      <button class="btn pri" id="pGo">▶ Старт</button>
      <label class="pspd">Швидкість <input type="range" id="pSpd" min="10" max="150" step="5"><b id="pSpdV"></b></label>
    </div>
    <div class="pcount" id="pCnt"></div>`;
  document.body.append(d);
  // Автопрокрутка як у телесуфлері. Швидкість (пікселів за секунду) запам'ятовується.
  const KEY = 'centr2-suf-speed';
  const go = d.querySelector('#pGo'), spd = d.querySelector('#pSpd'), spdV = d.querySelector('#pSpdV'), cnt = d.querySelector('#pCnt');
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* без збереження */ } } };
  spd.value = ls.get(KEY) || 40;
  const showSpd = () => { spdV.textContent = spd.value; };
  showSpd();
  spd.oninput = () => { ls.set(KEY, spd.value); showSpd(); };
  let run = false, raf = 0, last = 0, acc = 0, timer = 0;
  const setBtn = () => { go.textContent = run || timer ? '⏸ Пауза' : '▶ Старт'; };
  const step = (t) => {
    if (!run) return;
    if (last) { acc += (t - last) / 1000 * spd.value; const px = Math.floor(acc); if (px) { d.scrollTop += px; acc -= px; } }
    last = t;
    if (d.scrollTop + d.clientHeight >= d.scrollHeight - 2) { stop(); return; }
    raf = requestAnimationFrame(step);
  };
  const stop = () => { run = false; cancelAnimationFrame(raf); clearInterval(timer); timer = 0; cnt.style.display = 'none'; setBtn(); };
  const start = () => {
    let n = 3; cnt.textContent = n; cnt.style.display = 'flex';
    timer = setInterval(() => {
      n--;
      if (n > 0) { cnt.textContent = n; return; }
      clearInterval(timer); timer = 0; cnt.style.display = 'none';
      run = true; last = 0; acc = 0; raf = requestAnimationFrame(step); setBtn();
    }, 800);
    setBtn();
  };
  go.onclick = (e) => { e.stopPropagation(); (run || timer) ? stop() : start(); };
  d.querySelector('#pTop').onclick = (e) => { e.stopPropagation(); stop(); d.scrollTop = 0; };
  d.querySelector('.pz').onclick = () => { if (run || timer) stop(); };   // тап по тексту — пауза
  // Екран не гасне, поки суфлер відкритий (Wake Lock; повертаємо після згортання вкладки)
  let lock = null;
  const wake = async () => { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen'); } catch (e) { /* браузер не дав */ } };
  const onVis = () => { if (document.visibilityState === 'visible' && document.body.contains(d)) wake(); };
  wake();
  document.addEventListener('visibilitychange', onVis);
  d.querySelector('#pClose').onclick = () => {
    stop(); document.removeEventListener('visibilitychange', onVis);
    if (lock) lock.release().catch(() => {});
    d.remove();
  };
}

addEventListener('hashchange', render);
user = await api.requireUser();
if (user) render();
