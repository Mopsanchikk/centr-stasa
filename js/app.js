// app.js: екрани нового Центру (Головна, Відео, Схвалення, Черга, Сценарії, Статистика, Профіль).
import { api, esc, tag, fmtDur, fmtDate, toast, STATUS_LABEL } from './api.js';
import { initTema } from './tema.js';
initTema();

const main = document.getElementById('main');
let videos = [];
let filter = 'all';
let user = null;

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
    const list = await api.scripts();
    return `<h1>Сценарії</h1><p class="muted">Сценарії з папок роликів. Нові ідеї з'являтимуться тут із чату «Сценарії».</p>
      ${list.length ? `<div class="list">${list.map((s) => `<details class="card sc"><summary class="row" style="justify-content:space-between;flex-wrap:nowrap">
          <div><b>${esc(s.title)}</b><div class="small muted">${esc((s.status.split(/[.(]/)[0].trim().replace(/^ПІДТВЕРДЖЕНО/, 'Підтверджено') || 'Без статусу'))} · ${fmtDate(s.updated_at)}</div></div><span class="arr">▾</span></summary>
          <pre class="script">${esc(s.text.replace(/^#.*\n+/, '').replace(/\*\*/g, ''))}</pre></details>`).join('')}</div>`
        : '<div class="card empty">Сценаріїв ще немає.</div>'}`;
  },

  async stats() {
    const s = await api.stats();
    return `<h1>Статистика</h1><p class="muted">Поки цифри вносимо вручну (ти кажеш, я записую). Після підключення Instagram вони підтягуватимуться самі, а світлофор підкаже, що робити далі.</p>
      ${s.rows.length ? `<div class="card scroll"><table class="t"><tr>${s.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
        ${s.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`
        : `<div class="card empty">${api.local ? 'Цифр ще немає.' : 'Ручна статистика лежить на ПК. Відкрий Центр на комп’ютері або дочекайся підключення Instagram.'}</div>`}`;
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
        <div class="slot"><div class="when">Instagram</div><div>Автопублікація лише після твого «Схвалити»</div><span class="tag">Етап 5</span></div></div>`;
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

addEventListener('hashchange', render);
user = await api.requireUser();
if (user) render();
