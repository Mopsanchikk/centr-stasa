// api.js: дані нового Центру з бази Supabase (config.js). Вхід — пошта і пароль Стаса.
// Сценарії й ручна статистика поки лежать на ПК: їх видно, коли Центр відкритий на цьому комп'ютері (127.0.0.1:8787).
export const STATUS_LABEL = { montazh: 'Монтаж', perevirka: 'На перевірці', pravky: 'Потрібні правки', zatverdzheno: 'Затверджено', vidhyleno: 'Відхилено' };
const CFG = window.CENTRAL_CONFIG || {};
const BUCKET = 'videos';
const LOCAL = ['127.0.0.1', 'localhost'].includes(location.hostname);

let sb = null;
async function client() {
  if (sb) return sb;
  if (!CFG.supabaseUrl) throw new Error('Немає підключення до бази (config.js порожній).');
  // Точна версія бібліотеки, щоб оновлення в мережі нічого не зламало.
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  sb = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}
const check = ({ data, error }) => { if (error) throw new Error(error.message || String(error)); return data; };

async function signed(paths) {
  if (!paths.length) return {};
  const c = await client();
  const { data } = await c.storage.from(BUCKET).createSignedUrls(paths, 6 * 3600);
  const out = {};
  for (const d of data || []) if (d?.signedUrl && !d.error) out[d.path] = d.signedUrl;
  return out;
}

async function localJson(path) {
  const r = await fetch(path, { headers: { 'X-Centr': '1' } });
  if (!r.ok) throw new Error('Немає даних');
  return r.json();
}

export const api = {
  local: LOCAL,
  async user() {
    const c = await client();
    const { data: { session } } = await c.auth.getSession();
    if (!session) return null;
    const { data: team } = await c.from('team').select('name, role').eq('user_id', session.user.id).maybeSingle();
    return { id: session.user.id, email: session.user.email, name: team?.name || session.user.email, role: team?.role || null };
  },
  async requireUser() {
    const u = await api.user().catch(() => null);
    if (!u) { location.replace('login.html' + (location.pathname.endsWith('review.html') ? '?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search) : '')); return null; }
    return u;
  },
  async signIn(email, password) { const c = await client(); check(await c.auth.signInWithPassword({ email, password })); },
  // Відновлення пароля: лист із посиланням на login.html, там Стас сам задає новий пароль.
  async resetPassword(email) { const c = await client(); check(await c.auth.resetPasswordForEmail(email, { redirectTo: location.href.split(/[?#]/)[0] })); },
  async setPassword(password) { const c = await client(); check(await c.auth.updateUser({ password })); },
  async signOut() { const c = await client(); await c.auth.signOut(); location.replace('login.html'); },

  async videos() {
    const c = await client();
    const rows = check(await c.from('videos').select('*, versions!versions_video_id_fkey(*), comments(id, done)').order('updated_at', { ascending: false }));
    const out = rows.map((v) => {
      const vers = (v.versions || []).sort((a, b) => a.number - b.number);
      return { ...v, versions: undefined, comments: undefined, versions_count: vers.length,
        open_comments: (v.comments || []).filter((x) => !x.done).length,
        active_version: vers.find((x) => x.id === v.active_version_id) || null };
    });
    const urls = await signed(out.filter((v) => v.active_version).map((v) => v.active_version.storage_path + '.jpg'));
    for (const v of out) v.thumb = v.active_version ? urls[v.active_version.storage_path + '.jpg'] || '' : '';
    return out;
  },
  async video(id) { const c = await client(); return check(await c.from('videos').select('*').eq('id', id).single()); },
  async versions(id) { const c = await client(); return check(await c.from('versions').select('*').eq('video_id', id).order('number')); },
  async comments(id) { const c = await client(); return check(await c.from('comments').select('*').eq('video_id', id).order('time_sec')); },
  async setStatus(id, status) { const c = await client(); check(await c.from('videos').update({ status }).eq('id', id)); },
  async addComment(row) {
    const c = await client();
    const { data: { session } } = await c.auth.getSession();
    return check(await c.from('comments').insert({ ...row, author_id: session.user.id, author_name: 'Стас' }).select().single());
  },
  async doneComment(id, done) { const c = await client(); check(await c.from('comments').update({ done }).eq('id', id)); },
  async delComment(id) { const c = await client(); check(await c.from('comments').delete().eq('id', id)); },
  async fileUrl(ver) { if (!ver) return ''; return (await signed([ver.storage_path]))[ver.storage_path] || ''; },
  async thumbUrl(ver) { if (!ver) return ''; return (await signed([ver.storage_path + '.jpg']))[ver.storage_path + '.jpg'] || ''; },

  // сценарії з папок роликів (лише на ПК)
  async scripts() {
    if (!LOCAL) return [];
    try { return await localJson('/api/scripts'); } catch (e) { return []; }
  },
  // ідеї від Сценариста (таблиця scripts)
  async ideas() {
    const c = await client();
    return check(await c.from('scripts').select('*').is('archived_at', null).order('saved', { ascending: false }).order('created_at', { ascending: false }));
  },
  async updateIdea(id, patch) { const c = await client(); return check(await c.from('scripts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()); },
  async askIdea(id, action) {
    const c = await client();
    const cur = check(await c.from('scripts').select('pending').eq('id', id).single()).pending || [];
    if (cur.some((p) => p.action === action)) return;
    return api.updateIdea(id, { pending: [...cur, { action, at: new Date().toISOString() }] });
  },
  async addIdea(text) {
    const c = await client();
    const title = text.split(/[.!?\n]/)[0].slice(0, 60);
    return check(await c.from('scripts').insert({ title, body: text, source: 'manual', pending: [{ action: 'idea', at: new Date().toISOString() }] }).select().single());
  },
  async tiktok() {
    const c = await client();
    const { data } = await c.from('social_snapshot').select('data, updated_at').eq('platform', 'tiktok').maybeSingle();
    return data?.data || null;
  },
  async stats() {
    if (LOCAL) { try { return await localJson('/api/stats'); } catch (e) { /* немає */ } }
    return { columns: [], rows: [] };
  },
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtTime = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
export const fmtDur = (t) => { t = Math.round(t || 0); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
export const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) : '';
export const tag = (st) => `<span class="tag ${esc(st)}">${esc(STATUS_LABEL[st] || st)}</span>`;
export function toast(msg) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg;
  document.body.append(d); setTimeout(() => d.remove(), 2600);
}
