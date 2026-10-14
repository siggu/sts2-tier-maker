// 로그인(구글), 투표·티어표 동기화, 티어표 갤러리, 좋아요/싫어요, 댓글, 항목별 댓글.
// app.js 와 detail.js 가 아래 함수들을 부른다.
// 로그인 기능이 꺼져 있으면(config.js 의 GOOGLE_CLIENT_ID 가 비어 있으면) 모두 아무것도 하지 않는다.
// 사용자가 쓴 글(이름·제목·댓글)은 항상 글자 노드로 넣는다 (html 금지).

import { t, lang } from './i18n.js';
import { h, toast, board } from './ui.js';
import { openDetail } from './detail.js';
import { verdictsFor, loadMine, saveMine } from './balance.js';
import { loadState, saveState, savedSummary, sanitize, setStorageHooks } from './tierlist.js';
import { renderPng } from './export.js';
import {
  currentUser, onAuthChange, requireLogin, loginEnabled, api, errorText,
  openModal, openLogin, preloadLogin, logout, fetchMe, updateUser,
} from './auth.js';

let ctxRef = null;
const enc = encodeURIComponent;
const VERDICT_KEYS = ['nerf', 'fair', 'buff'];
const LIMITS = { title: 80, comment: 500, nameMin: 2, nameMax: 20, report: 200 };
const strLen = s => [...s].length;
// 경로 표시 등에 쓰는 짧은 제목
const short = (s, n = 24) => { const a = [...String(s || '')]; return a.length > n ? `${a.slice(0, n - 1).join('')}…` : a.join(''); };

// ================================================================ 작은 도구

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  up: 'M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z',
  down: 'M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z',
  chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  grid: 'M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z',
  caret: 'M7 10l5 5 5-5z',
};
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ic ic-${name}`);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', ICONS[name]);
  p.setAttribute('fill', 'currentColor');
  svg.append(p);
  return svg;
}

// 서버 시각(밀리초. 초로 오면 바꾼다)
const toMs = ts => {
  const n = Number(ts) || 0;
  return n < 1e12 ? n * 1000 : n;
};
const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
const dtf = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' });
const STEPS = [['year', 31536e3], ['month', 2592e3], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
function ago(ts) {
  const sec = (toMs(ts) - Date.now()) / 1000;
  for (const [unit, s] of STEPS) if (Math.abs(sec) >= s) return rtf.format(Math.round(sec / s), unit);
  return t('acct.justNow');
}
function timeEl(ts) {
  const ms = toMs(ts);
  return h('time', { class: 'acct-time', datetime: new Date(ms).toISOString(), title: dtf.format(ms) }, ago(ts));
}

// 프로필 사진(구글) — 없거나 깨지면 이름 첫 글자
function avatar(user, cls = '') {
  const name = String(user?.name || '?').trim();
  const initial = ([...name][0] || '?').toUpperCase();
  let hue = 0;
  for (const ch of String(user?.id || name)) hue = (hue * 31 + ch.charCodeAt(0)) % 3600;
  hue = (hue * 137) % 360; // 비슷한 id 도 색이 멀리 떨어지게
  const fallback = h('span', { class: `acct-av acct-av-init ${cls}`, style: { '--hue': String(hue) }, 'aria-hidden': 'true' }, initial);
  const pic = typeof user?.picture === 'string' && /^https:\/\//.test(user.picture) ? user.picture : null;
  if (!pic) return fallback;
  const img = h('img', { class: `acct-av ${cls}`, src: pic, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy', decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
  return img;
}

const isMine = author => Boolean(currentUser() && author && author.id === currentUser().id);
const canDelete = author => isMine(author) || Boolean(currentUser()?.admin);

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* 저장소 없음 */ }
}

// 모달이나 상세 창이 열려 있으면 닫힌 뒤에 다시 그린다 (다시 그리면 상세 창이 닫히므로).
let refreshTimer = null;
function refreshView() {
  clearTimeout(refreshTimer);
  if (!ctxRef) return;
  if (document.querySelector('.detail-backdrop, .acct-modal-backdrop, .popover')) {
    refreshTimer = setTimeout(refreshView, 600);
    return;
  }
  ctxRef.rerender();
}

// ================================================================ 동기화

const TIER_KEY = id => `sts2tier.v1.${id}`;
const SUBMITTED_KEY = cat => `sts2bal.v1.submitted.${cat}`;
const PENDING_KEY = 'sts2bal.pending';
// 이 브라우저의 투표·티어표가 어느 계정 것인지 (다른 계정으로 로그인하면 섞지 않는다)
const OWNER_KEY = 'sts2.acct.owner';

const sameMap = (a, b) => {
  const ka = Object.keys(a || {}), kb = Object.keys(b || {});
  return ka.length === kb.length && ka.every(k => a[k] === b[k]);
};
const placedCount = s => (Array.isArray(s?.tiers) ? s.tiers.reduce((n, r) => n + (Array.isArray(r.items) ? r.items.length : 0), 0) : 0);
const compactState = s => ({
  title: String(s.title || '').slice(0, LIMITS.title),
  tiers: s.tiers.slice(0, 20).map(r => ({ label: String(r.label ?? '').slice(0, 40), color: r.color, items: r.items })),
  updatedAt: s.updatedAt || 0,
});

// 서버 표 → 제출본. 초안이 비어 있으면(또는 다른 계정 것이면) 초안도.
function applyVotes(votes, replaceDraft) {
  const db = ctxRef.db;
  const pending = readJson(PENDING_KEY) || {};
  let changed = false;
  for (const cat of db.categories) {
    const snap = {};
    const prefix = `${cat.id}/`;
    for (const [key, v] of Object.entries(votes || {})) {
      if (key.startsWith(prefix) && VERDICT_KEYS.includes(v)) snap[key.slice(prefix.length)] = v;
    }
    // 아직 보내지 못한 표는 곧 서버에 반영되므로 제출본에 얹는다.
    for (const [key, v] of Object.entries(pending)) {
      if (!key.startsWith(prefix)) continue;
      const id = key.slice(prefix.length);
      if (v) snap[id] = v; else delete snap[id];
    }
    if (!sameMap(readJson(SUBMITTED_KEY(cat.id)), snap)) { writeJson(SUBMITTED_KEY(cat.id), snap); changed = true; }

    const draft = loadMine(cat.id);
    const empty = VERDICT_KEYS.every(k => !draft[k].length);
    if (replaceDraft || (empty && Object.keys(snap).length)) {
      const rows = { nerf: [], fair: [], buff: [] };
      for (const item of cat.items) if (snap[item.id]) rows[snap[item.id]].push(item.id);
      if (VERDICT_KEYS.some(k => rows[k].join() !== draft[k].join())) { saveMine(cat.id, rows); changed = true; }
    }
  }
  return changed;
}

// 티어표: updatedAt 이 새로운 쪽이 이긴다.
function applyTiers(serverTiers, foreign) {
  const db = ctxRef.db;
  let changed = false;
  const push = [];
  for (const tpl of db.templates) {
    const remote = serverTiers?.[tpl.id];
    const local = readJson(TIER_KEY(tpl.id));
    const ru = Number(remote?.updatedAt) || 0;
    const lu = Number(local?.updatedAt) || 0;
    if (remote?.state && (foreign || !local || lu < ru)) {
      writeJson(TIER_KEY(tpl.id), { ...remote.state, updatedAt: ru });
      changed = true;
    } else if (foreign && local) {
      // 다른 계정이 남긴 티어표는 이 계정으로 올리지 않고 치운다.
      writeJson(TIER_KEY(tpl.id), null);
      changed = true;
    } else if (local && placedCount(local) > 0 && (!remote || lu > ru)) {
      push.push(tpl.id);
    }
  }
  return { changed, push };
}

let syncRun = null;
async function syncAll() {
  const me = await fetchMe();
  const user = currentUser();
  if (!me || !user) return false;
  let owner = null;
  try { owner = localStorage.getItem(OWNER_KEY); } catch { /* 저장소 없음 */ }
  const foreign = Boolean(owner && owner !== user.id);
  let changed = applyVotes(me.votes || {}, foreign);
  const tiers = applyTiers(me.tiers || {}, foreign);
  changed = tiers.changed || changed;
  try { localStorage.setItem(OWNER_KEY, user.id); } catch { /* 저장소 없음 */ }
  for (const id of tiers.push) dirty.add(id);
  if (dirty.size) flushTiers();
  return changed;
}
function runSync() {
  if (!syncRun) syncRun = syncAll().catch(err => { console.error(err); return false; }).finally(() => { syncRun = null; });
  return syncRun;
}

// 로그인한 동안 티어표를 고치면 잠시 뒤 서버에 올린다.
const dirty = new Set();
const cleared = new Set();
let pushTimer = null;
let pushing = false;
function schedulePush(ms = 1500) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(flushTiers, ms);
}
function markDirty(id) {
  if (!currentUser()) return;
  cleared.delete(id);
  dirty.add(id);
  schedulePush();
}
function markCleared(id) {
  if (!currentUser()) return;
  dirty.delete(id);
  cleared.add(id);
  schedulePush();
}
const retryable = err => err.code === 'network' || err.status === 429 || err.status >= 500;

async function flushTiers({ keepalive = false } = {}) {
  clearTimeout(pushTimer);
  if (!currentUser()) { dirty.clear(); cleared.clear(); return; }
  if (pushing && !keepalive) { schedulePush(800); return; }
  pushing = true;
  let retry = false;
  try {
    for (const id of [...cleared]) {
      cleared.delete(id);
      try { await api(`/me/tiers/${enc(id)}`, { method: 'DELETE', keepalive }); } catch (err) {
        if (retryable(err)) { cleared.add(id); retry = true; }
      }
    }
    for (const id of [...dirty]) {
      dirty.delete(id);
      const local = readJson(TIER_KEY(id));
      if (!local || !Array.isArray(local.tiers)) continue;
      try {
        const res = await api(`/me/tiers/${enc(id)}`, { method: 'PUT', body: { state: compactState(local) }, keepalive });
        // 서버 시각으로 맞춰 두면 다음 비교가 한 시계 기준이 된다 (그사이 고치지 않았을 때만).
        const now = readJson(TIER_KEY(id));
        if (res?.updatedAt && now && now.updatedAt === local.updatedAt) writeJson(TIER_KEY(id), { ...now, updatedAt: Number(res.updatedAt) });
      } catch (err) {
        if (retryable(err)) { dirty.add(id); retry = true; }
      }
    }
  } finally {
    pushing = false;
  }
  if (retry && !keepalive) schedulePush(15000);
}

// ================================================================ 시작

// 데이터를 읽은 뒤 한 번: 로그인 상태 복원, 서버와 동기화
export async function init(ctx) {
  ctxRef = ctx;
  if (!loginEnabled()) return;
  setStorageHooks({ save: markDirty, clear: markCleared });
  window.addEventListener('pagehide', () => { if (dirty.size || cleared.size) flushTiers({ keepalive: true }); });

  let lastUser = currentUser()?.id || null;
  onAuthChange(user => {
    const id = user?.id || null;
    if (id === lastUser) return; // 이름만 바뀜 (상단은 스스로 다시 그린다)
    lastUser = id;
    homeCache.clear();
    if (id) runSync().then(() => refreshView());
    else { dirty.clear(); cleared.clear(); refreshView(); }
  });

  if (currentUser()) {
    // 첫 화면이 동기화된 내용으로 그려지도록 잠깐 기다린다. 늦으면 끝난 뒤 다시 그린다.
    const run = runSync();
    const quick = await Promise.race([run.then(() => true), new Promise(r => setTimeout(() => r(false), 1500))]);
    if (!quick) run.then(changed => { if (changed) refreshView(); });
  }
}

// ================================================================ 상단 (로그인 / 프로필)

export function topbar(ctx) {
  if (!loginEnabled()) return null;
  ctxRef = ctxRef || ctx;
  const box = h('div', { class: 'acct-top' });
  const draw = () => {
    const user = currentUser();
    if (!user) {
      box.replaceChildren(h('button', {
        class: 'btn small acct-login-btn', type: 'button',
        onpointerenter: preloadLogin, onfocus: preloadLogin,
        onclick: () => openLogin(),
      }, icon('user'), h('span', { class: 'acct-login-label' }, t('acct.login'))));
      return;
    }
    const chip = h('button', {
      class: 'acct-chip', type: 'button', 'aria-haspopup': 'menu', 'aria-label': t('acct.menuAria', { name: user.name }),
      onclick: () => openMenu(chip),
    }, avatar(user), h('span', { class: 'acct-chip-name' }, user.name), icon('caret'));
    box.replaceChildren(chip);
  };
  onAuthChange(draw);
  draw();
  return box;
}

function openMenu(anchor) {
  const user = currentUser();
  if (!user || !ctxRef) return;
  let close = () => {};
  const item = (ic, label, onclick, cls = '') => h('button', { class: `acct-menu-item ${cls}`, type: 'button', role: 'menuitem', onclick: () => { close(); onclick(); } }, icon(ic), h('span', {}, label));
  const menu = h('div', { class: 'acct-menu', role: 'menu' },
    h('div', { class: 'acct-menu-head' },
      avatar(user, 'lg'),
      h('div', { class: 'acct-menu-who' },
        h('strong', {}, user.name),
        h('span', {}, user.admin ? t('acct.admin') : t('acct.signedIn'))),
    ),
    item('grid', t('acct.myGallery'), () => { location.hash = galleryHref(null, { author: user.id }); }),
    item('edit', t('acct.rename'), renameDialog),
    item('logout', t('acct.logout'), () => logout(), 'danger'),
  );
  close = ctxRef.popover(anchor, menu);
  menu.querySelector('button')?.focus();
}

function renameDialog() {
  const user = currentUser();
  if (!user) return;
  const input = h('input', { type: 'text', value: user.name, maxlength: String(LIMITS.nameMax), autocomplete: 'nickname', 'aria-describedby': 'acct-rename-help' });
  const help = h('p', { class: 'acct-help', id: 'acct-rename-help' }, t('acct.renameHelp', { min: LIMITS.nameMin, max: LIMITS.nameMax }));
  const save = h('button', { class: 'btn primary', type: 'submit' }, t('acct.save'));
  const form = h('form', { class: 'acct-form', onsubmit: async e => {
    e.preventDefault();
    const name = input.value.trim().replace(/\s+/g, ' ');
    const n = strLen(name);
    if (n < LIMITS.nameMin || n > LIMITS.nameMax) { help.classList.add('error'); input.focus(); return; }
    if (name === user.name) { m.close(); return; }
    save.disabled = true;
    try {
      const res = await api('/me', { method: 'PATCH', body: { name } });
      updateUser(res?.user || { id: user.id, name });
      toast(t('acct.renamed'));
      m.close();
    } catch (err) {
      toast(errorText(err));
      save.disabled = false;
    }
  } },
    h('label', { class: 'field' }, h('span', {}, t('acct.displayName')), input),
    help,
    h('div', { class: 'acct-form-actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => m.close() }, t('acct.cancel')),
      save),
  );
  const m = openModal({ title: t('acct.rename'), body: form, className: 'acct-small' });
  input.select();
}

// ================================================================ 메뉴 링크·라우팅

export function navLinks(parts) {
  if (!loginEnabled()) return [];
  const active = parts[0] === 'gallery' || parts[0] === 'g';
  return [h('a', { href: '#/gallery', class: active ? 'active' : null }, t('gallery.nav'))];
}

let viewToken = 0;
export function route(parts, params, ctx) {
  if (!loginEnabled()) return false;
  ctxRef = ctx;
  if (parts[0] === 'gallery') { viewGallery(parts[1] || null, params, ctx); return true; }
  if (parts[0] === 'g' && parts[1]) { viewPost(parts[1], ctx); return true; }
  return false;
}

function galleryHref(tplId, { sort, author } = {}) {
  const q = new URLSearchParams();
  if (sort && sort !== 'new') q.set('sort', sort);
  if (author) q.set('author', author);
  const qs = q.toString();
  return `#/gallery${tplId ? `/${tplId}` : ''}${qs ? `?${qs}` : ''}`;
}

function galleryQuery({ template, sort, author, cursor }) {
  const q = new URLSearchParams();
  if (template) q.set('template', template);
  if (sort) q.set('sort', sort);
  if (author) q.set('author', author);
  if (cursor) q.set('cursor', cursor);
  return `/gallery?${q}`;
}

const tplLabel = tpl => (tpl.parts.length ? tpl.parts.map(p => p.label).join(' · ') : t('tpl.all'));

// ================================================================ 갤러리 카드

// 위쪽 줄 몇 개의 첫 항목 이미지로 만든 작은 미리보기
function preview(post, tpl) {
  const state = tpl ? sanitize(post.state, tpl) : null;
  const rows = (state?.tiers || []).filter(r => r.items.length).slice(0, 3);
  const box = h('div', { class: `gal-prev kind-${tpl?.tile || 'card'}`, 'aria-hidden': 'true' });
  if (!rows.length) { box.append(h('div', { class: 'gal-prev-empty' }, icon('grid'))); return box; }
  for (const r of rows) {
    box.append(h('div', { class: 'gal-prev-row', style: { '--tier': r.color } },
      h('span', { class: 'gal-prev-label' }, r.label),
      h('span', { class: 'gal-prev-items' }, r.items.slice(0, 8).map(id => {
        const item = tpl.byId.get(id);
        return item?.img ? h('img', { src: item.img, alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'gal-prev-dot' });
      })),
    ));
  }
  return box;
}

function stat(ic, n, label, cls = '') {
  return h('span', { class: `gal-stat ${cls}`, title: label, 'aria-label': `${label} ${n}` }, icon(ic), String(n || 0));
}

function galleryCard(post, db, { showTemplate = true } = {}) {
  const tpl = db.template(post.template);
  return h('a', { class: 'gal-card', href: `#/g/${enc(post.id)}`, style: tpl?.group?.color ? { '--accent': tpl.group.color } : null },
    preview(post, tpl),
    h('div', { class: 'gal-card-body' },
      h('strong', { class: 'gal-card-title' }, post.title),
      showTemplate && h('span', { class: 'gal-card-tpl' }, tpl?.title || post.template),
      h('div', { class: 'gal-card-author' },
        avatar(post.author, 'sm'),
        h('span', { class: 'gal-card-name' }, post.author?.name || '?'),
        h('span', { class: 'gal-dot', 'aria-hidden': 'true' }, '·'),
        timeEl(post.created)),
      h('div', { class: 'gal-card-stats' },
        stat('up', post.likes, t('gallery.likes'), post.myReaction === 1 ? 'on' : ''),
        stat('down', post.dislikes, t('gallery.dislikes'), post.myReaction === -1 ? 'on' : ''),
        stat('chat', post.comments, t('comments.title'))),
    ),
  );
}

function skeletonCards(n) {
  return Array.from({ length: n }, () => h('div', { class: 'gal-card skeleton', 'aria-hidden': 'true' },
    h('div', { class: 'gal-prev' }), h('div', { class: 'gal-card-body' }, h('span', { class: 'sk-line' }), h('span', { class: 'sk-line short' }))));
}

// ================================================================ 갤러리 목록

function viewGallery(templateId, params, ctx) {
  const db = ctx.db;
  const template = templateId ? db.template(templateId) : null;
  if (templateId && !template) return ctx.notFound();
  const sort = params.get('sort') === 'top' ? 'top' : 'new';
  const author = params.get('author') || '';
  const me = currentUser();
  const mineView = Boolean(author && me && author === me.id);
  const token = ++viewToken;

  const heading = h('h1', {}, template ? t('gallery.titleFor', { title: template.title }) : mineView ? t('gallery.mine') : author ? t('gallery.byAuthor') : t('gallery.title'));
  const grid = h('div', { class: 'gal-grid', 'aria-busy': 'true' }, skeletonCards(6));
  const more = h('div', { class: 'gal-more' });

  const select = h('select', {
    class: 'gal-select', 'aria-label': t('gallery.filterTemplate'),
    onchange: e => { location.hash = galleryHref(e.target.value || null, { sort, author }); },
  },
    h('option', { value: '' }, t('gallery.allTemplates')),
    db.categories.map(cat => {
      const tpls = db.templates.filter(x => x.category.id === cat.id);
      if (tpls.length === 1) return h('option', { value: tpls[0].id, selected: tpls[0].id === templateId }, cat.name);
      return h('optgroup', { label: cat.name }, tpls.map(x => h('option', { value: x.id, selected: x.id === templateId }, tplLabel(x))));
    }),
  );

  const sortBtn = (key, label) => h('button', {
    type: 'button', class: sort === key ? 'on' : null, 'aria-pressed': String(sort === key),
    onclick: () => { if (sort !== key) location.replace(galleryHref(templateId, { sort: key, author })); },
  }, label);

  const authorChip = author && h('span', { class: 'gal-filter-chip' },
    h('span', { class: 'gal-author-name' }, mineView ? t('gallery.mineShort') : t('gallery.byAuthor')),
    h('a', { href: galleryHref(templateId, { sort }), 'aria-label': t('gallery.clearAuthor') }, '×'));

  const path = [];
  if (template || author) path.push([t('gallery.nav'), '#/gallery']);
  if (template) path.push([template.title]);
  else if (author) path.push([heading.textContent]);
  else path.push([t('gallery.nav')]);

  ctx.render(
    ctx.crumbs('tier', ...path),
    h('header', { class: 'page-head gal-head' },
      heading,
      h('p', {}, template ? t('gallery.leadTemplate') : t('gallery.lead')),
    ),
    h('div', { class: 'gal-controls' },
      h('div', { class: 'seg', role: 'group', 'aria-label': t('gallery.sort') },
        sortBtn('new', t('gallery.sortNew')), sortBtn('top', t('gallery.sortTop'))),
      select,
      authorChip,
      template && h('a', { class: 'btn small', href: `#/tier/${template.id}` }, t('gallery.makeOwn')),
    ),
    grid,
    more,
  );

  let cursor = null;
  let first = true;
  async function load() {
    more.replaceChildren();
    let data;
    try {
      data = await api(galleryQuery({ template: templateId, sort, author, cursor }));
    } catch (err) {
      if (token !== viewToken) return;
      grid.removeAttribute('aria-busy');
      const retry = h('button', { class: 'btn', type: 'button', onclick: () => { grid.replaceChildren(...skeletonCards(3)); load(); } }, t('acct.retry'));
      if (first) grid.replaceChildren(h('section', { class: 'empty gal-empty' }, h('h2', {}, t('gallery.loadFailed')), h('p', {}, errorText(err)), h('p', {}, retry)));
      else more.replaceChildren(h('p', { class: 'muted' }, errorText(err)), retry);
      return;
    }
    if (token !== viewToken) return;
    grid.removeAttribute('aria-busy');
    const posts = Array.isArray(data?.posts) ? data.posts : [];
    if (first) {
      grid.replaceChildren();
      if (author && !mineView && posts[0]?.author?.name) {
        heading.textContent = t('gallery.byName', { name: posts[0].author.name });
        authorChip?.querySelector('.gal-author-name')?.replaceChildren(posts[0].author.name);
      }
      if (!posts.length) {
        grid.replaceChildren(h('section', { class: 'empty gal-empty' },
          h('h2', {}, mineView ? t('gallery.emptyMine') : t('gallery.empty')),
          h('p', {}, t('gallery.emptyBody')),
          h('p', {}, h('a', { class: 'btn primary', href: template ? `#/tier/${template.id}` : '#/' }, t('gallery.makeOwn')))));
      }
    }
    first = false;
    grid.append(...posts.map(p => galleryCard(p, db, { showTemplate: !template })));
    cursor = data?.next || null;
    if (cursor) {
      more.replaceChildren(h('button', { class: 'btn', type: 'button', onclick: e => { e.currentTarget.disabled = true; load(); } }, t('gallery.more')));
    }
  }
  load();
}

// ================================================================ 갤러리 글 하나

async function viewPost(postId, ctx) {
  const db = ctx.db;
  const token = ++viewToken;
  ctx.render(ctx.crumbs('tier', [t('gallery.nav'), '#/gallery'], ['…']), h('section', { class: 'empty' }, h('p', {}, t('acct.loading'))));
  let post;
  try {
    post = (await api(`/gallery/${enc(postId)}`))?.post;
    if (!post) throw Object.assign(new Error('missing'), { status: 404 });
  } catch (err) {
    if (token !== viewToken) return;
    ctx.render(
      ctx.crumbs('tier', [t('gallery.nav'), '#/gallery']),
      h('section', { class: 'empty' },
        h('h2', {}, err.status === 404 ? t('gallery.postMissing') : t('gallery.loadFailed')),
        err.status !== 404 && h('p', {}, errorText(err)),
        h('p', {}, h('a', { class: 'btn', href: '#/gallery' }, t('gallery.back')))),
    );
    return;
  }
  if (token !== viewToken) return;
  const tpl = db.template(post.template);
  if (!tpl) {
    ctx.render(
      ctx.crumbs('tier', [t('gallery.nav'), '#/gallery'], [short(post.title)]),
      h('section', { class: 'empty' }, h('h2', {}, t('gallery.templateGone')), h('p', {}, h('a', { class: 'btn', href: '#/gallery' }, t('gallery.back')))),
    );
    return;
  }
  const state = sanitize(post.state, tpl) || { title: post.title, tiers: [], updatedAt: 0 };
  state.title = post.title || state.title;
  let busy = false;

  const likeBtn = h('button', { type: 'button', class: 'gal-react-btn like', onclick: () => react(1) });
  const dislikeBtn = h('button', { type: 'button', class: 'gal-react-btn dislike', onclick: () => react(-1) });
  function drawReactions() {
    likeBtn.replaceChildren(icon('up'), h('span', { class: 'gal-react-label' }, t('gallery.like')), h('b', {}, String(post.likes || 0)));
    dislikeBtn.replaceChildren(icon('down'), h('span', { class: 'gal-react-label' }, t('gallery.dislike')), h('b', {}, String(post.dislikes || 0)));
    likeBtn.classList.toggle('on', post.myReaction === 1);
    dislikeBtn.classList.toggle('on', post.myReaction === -1);
    likeBtn.setAttribute('aria-pressed', String(post.myReaction === 1));
    dislikeBtn.setAttribute('aria-pressed', String(post.myReaction === -1));
  }

  async function react(v) {
    if (busy) return;
    const wasIn = Boolean(currentUser());
    if (!(await requireLogin(t('acct.reason.react')))) return;
    busy = true;
    try {
      if (!wasIn) {
        // 방금 로그인했으면 내 반응을 먼저 알아 온다
        const fresh = (await api(`/gallery/${enc(post.id)}`))?.post;
        if (fresh) Object.assign(post, { likes: fresh.likes, dislikes: fresh.dislikes, myReaction: fresh.myReaction || 0 });
      }
      const prev = { likes: post.likes, dislikes: post.dislikes, myReaction: post.myReaction || 0 };
      const next = prev.myReaction === v ? 0 : v;
      // 먼저 화면에 반영
      post.likes = (post.likes || 0) - (prev.myReaction === 1 ? 1 : 0) + (next === 1 ? 1 : 0);
      post.dislikes = (post.dislikes || 0) - (prev.myReaction === -1 ? 1 : 0) + (next === -1 ? 1 : 0);
      post.myReaction = next;
      drawReactions();
      try {
        const res = await api(`/gallery/${enc(post.id)}/react`, { method: 'POST', body: { v: next } });
        if (res) Object.assign(post, { likes: res.likes ?? post.likes, dislikes: res.dislikes ?? post.dislikes, myReaction: res.myReaction ?? next });
      } catch (err) {
        Object.assign(post, prev);
        toast(errorText(err));
      }
      drawReactions();
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!confirm(t('gallery.deleteConfirm'))) return;
    try {
      await api(`/gallery/${enc(post.id)}`, { method: 'DELETE' });
      toast(t('gallery.deleted'));
      location.hash = `#/gallery/${tpl.id}`;
    } catch (err) { toast(errorText(err)); }
  }

  function importMine() {
    if (savedSummary(tpl) && !confirm(t('shared.overwrite'))) return;
    saveState(tpl, { title: state.title, tiers: state.tiers.map(r => ({ ...r, items: [...r.items] })), updatedAt: 0 });
    location.hash = `#/tier/${tpl.id}`;
  }

  async function savePng() {
    toast(t('png.making'));
    try {
      const blob = await renderPng(tpl, state);
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: `${state.title.replace(/[\\/:*?"<>|]/g, '_')}.png` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast(t('png.saved'));
    } catch (err) {
      console.error(err);
      toast(t('png.failed'));
    }
  }

  async function copyLink() {
    const url = `${location.origin}${location.pathname}${location.search}#/g/${enc(post.id)}`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: post.title, url }); return; }
      await navigator.clipboard.writeText(url);
      toast(t('share.copied'));
    } catch {
      prompt(t('share.copyPrompt'), url);
    }
  }

  function draw() {
    drawReactions();
    const author = post.author || {};
    const b = board({ template: tpl, rows: state.tiers, readonly: true, onOpen: id => openDetail(tpl.byId.get(id), tpl.category, db) });
    const comments = commentsSection({
      listPath: `/gallery/${enc(post.id)}/comments`,
      postPath: `/gallery/${enc(post.id)}/comments`,
      count: post.comments,
      formFirst: false,
      onCount: n => { post.comments = n; },
    });
    ctx.render(
      ctx.crumbs('tier', [t('gallery.nav'), '#/gallery'], [tpl.title, `#/gallery/${tpl.id}`], [short(post.title)]),
      h('header', { class: 'gal-post-head' },
        h('h1', { class: 'shared-title' }, post.title),
        h('div', { class: 'gal-post-meta' },
          avatar(author),
          h('a', { class: 'gal-post-author', href: galleryHref(null, { author: author.id }) }, author.name || '?'),
          h('span', { class: 'gal-dot', 'aria-hidden': 'true' }, '·'),
          timeEl(post.created),
          h('span', { class: 'gal-dot', 'aria-hidden': 'true' }, '·'),
          h('a', { class: 'gal-post-tpl', href: `#/tier/${tpl.id}` }, tpl.title),
          post.hidden ? h('span', { class: 'gal-hidden-badge' }, t('gallery.hiddenBadge')) : null,
        ),
      ),
      h('div', { class: 'gal-post-bar' },
        h('div', { class: 'gal-react', role: 'group', 'aria-label': t('gallery.reactions') }, likeBtn, dislikeBtn),
        h('div', { class: 'actions' },
          h('button', { class: 'btn primary', type: 'button', onclick: importMine }, t('shared.import')),
          h('button', { class: 'btn', type: 'button', onclick: savePng }, t('tier.savePng')),
          h('button', { class: 'btn', type: 'button', onclick: copyLink }, t('gallery.copyLink')),
          !isMine(author) && h('button', { class: 'btn ghost small', type: 'button', onclick: () => reportDialog('post', post.id) }, icon('flag'), t('acct.report')),
          canDelete(author) && h('button', { class: 'btn danger small', type: 'button', onclick: remove }, icon('trash'), t('acct.delete')),
        ),
      ),
      b,
      comments,
    );
  }
  draw();
}

// ================================================================ 신고

async function reportDialog(kind, id) {
  if (!(await requireLogin(t('acct.reason.report')))) return;
  const REASONS = ['spam', 'abuse', 'inappropriate', 'other'];
  const detail = h('textarea', { rows: '3', maxlength: String(LIMITS.report), placeholder: t('acct.report.detailPlaceholder') });
  const send = h('button', { class: 'btn primary', type: 'submit' }, t('acct.report.send'));
  const form = h('form', { class: 'acct-form', onsubmit: async e => {
    e.preventDefault();
    const picked = form.querySelector('input[name="reason"]:checked')?.value || 'other';
    const extra = detail.value.trim().slice(0, LIMITS.report);
    send.disabled = true;
    try {
      await api('/report', { method: 'POST', body: { kind, id, reason: extra ? `${picked}: ${extra}` : picked } });
      toast(t('acct.report.thanks'));
      m.close();
    } catch (err) {
      toast(errorText(err));
      send.disabled = false;
    }
  } },
    h('p', { class: 'acct-help' }, kind === 'post' ? t('acct.report.leadPost') : t('acct.report.leadComment')),
    h('fieldset', { class: 'acct-radios' },
      h('legend', { class: 'sr-only' }, t('acct.report.reason')),
      REASONS.map((r, i) => h('label', {}, h('input', { type: 'radio', name: 'reason', value: r, checked: i === 0 }), h('span', {}, t(`acct.report.r.${r}`))))),
    h('label', { class: 'field' }, h('span', {}, t('acct.report.detail')), detail),
    h('div', { class: 'acct-form-actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => m.close() }, t('acct.cancel')),
      send),
  );
  const m = openModal({ title: t('acct.report.title'), body: form, className: 'acct-small' });
}

// ================================================================ 댓글

// listPath: 목록 GET, postPath: 쓰기 POST. verdicts 가 있으면 작성자의 밸런스 표 배지를 단다.
function commentsSection({ listPath, postPath, verdicts = null, sortable = false, formFirst = false, count = null, onCount, lazy = false }) {
  let sort = 'new';
  let comments = [];
  let loaded = false;
  const countEl = h('span', { class: 'cmt-count' }, count != null ? String(count) : '');
  const list = h('ol', { class: 'cmt-list', 'aria-live': 'polite' });
  const formBox = h('div', { class: 'cmt-form-box' });
  const sortSeg = sortable && h('div', { class: 'seg cmt-sort', role: 'group', 'aria-label': t('comments.sort') });

  function drawSort() {
    if (!sortSeg) return;
    sortSeg.replaceChildren(...[['new', t('comments.sortNew')], ['top', t('comments.sortTop')]].map(([k, label]) =>
      h('button', { type: 'button', class: sort === k ? 'on' : null, 'aria-pressed': String(sort === k), onclick: () => { if (sort !== k) { sort = k; drawSort(); load(); } } }, label)));
  }

  function setCount() {
    const n = comments.filter(c => !isDeleted(c)).length;
    countEl.textContent = String(n);
    onCount?.(n);
  }

  async function load() {
    list.replaceChildren(h('li', { class: 'cmt-note' }, t('comments.loading')));
    try {
      const data = await api(`${listPath}${sortable ? `?sort=${sort}` : ''}`);
      comments = Array.isArray(data?.comments) ? data.comments : [];
      loaded = true;
      drawList();
      setCount();
    } catch (err) {
      list.replaceChildren(h('li', { class: 'cmt-note' }, t('comments.loadFailed'), ' ',
        h('button', { class: 'btn ghost small', type: 'button', onclick: load }, t('acct.retry'))));
    }
  }

  function drawList() {
    if (!comments.length) { list.replaceChildren(h('li', { class: 'cmt-note' }, t('comments.empty'))); return; }
    list.replaceChildren(...comments.map(c => commentItem(c)));
  }

  function commentItem(c) {
    const li = h('li', { class: `cmt${isDeleted(c) ? ' deleted' : ''}${c.mine ? ' mine' : ''}` });
    const draw = () => {
      const deleted = isDeleted(c);
      li.className = `cmt${deleted ? ' deleted' : ''}${c.mine ? ' mine' : ''}`;
      const v = verdicts && !deleted && c.vote ? verdicts.find(x => x.v === c.vote) : null;
      const mine = c.mine || isMine(c.author);
      li.replaceChildren(
        avatar(c.author),
        h('div', { class: 'cmt-main' },
          h('div', { class: 'cmt-meta' },
            h('b', { class: 'cmt-name' }, c.author?.name || '?'),
            mine && h('span', { class: 'cmt-me' }, t('comments.me')),
            c.hidden && h('span', { class: 'gal-hidden-badge' }, t('gallery.hiddenBadge')),
            v && h('span', { class: 'cmt-vote', style: { '--v': v.color }, title: t('comments.voteTitle', { v: v.label, sub: v.sub }) }, h('i', { 'aria-hidden': 'true' }), v.label),
            timeEl(c.created)),
          deleted ? h('p', { class: 'cmt-body cmt-removed' }, t('comments.deleted')) : h('p', { class: 'cmt-body' }, c.body),
          !deleted && h('div', { class: 'cmt-actions' },
            h('button', {
              type: 'button', class: `cmt-like${c.myLike ? ' on' : ''}`, 'aria-pressed': String(Boolean(c.myLike)),
              'aria-label': t('comments.likeAria', { n: c.likes || 0 }), onclick: () => like(c, draw),
            }, icon('heart'), h('span', {}, String(c.likes || 0))),
            (mine || currentUser()?.admin) && h('button', { type: 'button', class: 'cmt-act', onclick: () => remove(c) }, icon('trash'), t('acct.delete')),
            !mine && h('button', { type: 'button', class: 'cmt-act', onclick: () => reportDialog('comment', c.id) }, icon('flag'), t('acct.report')),
          ),
        ),
      );
    };
    draw();
    return li;
  }

  let likeBusy = false;
  async function like(c, redraw) {
    if (likeBusy) return;
    const wasIn = Boolean(currentUser());
    if (!(await requireLogin(t('acct.reason.like')))) return;
    if (!wasIn) { load(); return; } // 방금 로그인: 내 좋아요 여부부터 다시 받는다
    likeBusy = true;
    const prev = { likes: c.likes || 0, myLike: Boolean(c.myLike) };
    const on = !prev.myLike;
    c.myLike = on;
    c.likes = prev.likes + (on ? 1 : -1);
    redraw();
    try {
      const res = await api(`/comments/${enc(c.id)}/like`, { method: 'POST', body: { on } });
      if (res) { c.likes = res.likes ?? c.likes; c.myLike = res.myLike ?? on; }
    } catch (err) {
      Object.assign(c, prev);
      toast(errorText(err));
    }
    likeBusy = false;
    redraw();
  }

  async function remove(c) {
    if (!confirm(t('comments.deleteConfirm'))) return;
    try {
      await api(`/comments/${enc(c.id)}`, { method: 'DELETE' });
      // 지운 댓글은 목록에서 빠진다
      comments = comments.filter(x => x !== c);
      drawList();
      setCount();
    } catch (err) { toast(errorText(err)); }
  }

  function drawForm() {
    if (!currentUser()) {
      formBox.replaceChildren(h('button', {
        type: 'button', class: 'cmt-login',
        onpointerenter: preloadLogin,
        onclick: async () => {
          if (await requireLogin(t('acct.reason.comment'))) {
            drawForm();
            formBox.querySelector('textarea')?.focus();
            if (loaded) load();
          }
        },
      }, icon('chat'), t('comments.loginToWrite')));
      return;
    }
    const ta = h('textarea', {
      class: 'cmt-input', rows: '2', maxlength: String(LIMITS.comment), placeholder: t('comments.placeholder'),
      'aria-label': t('comments.write'),
    });
    const counter = h('span', { class: 'cmt-counter' }, `0/${LIMITS.comment}`);
    const send = h('button', { class: 'btn primary small', type: 'submit', disabled: true }, t('comments.send'));
    const update = () => {
      const n = strLen(ta.value.trim());
      counter.textContent = `${strLen(ta.value)}/${LIMITS.comment}`;
      counter.classList.toggle('over', strLen(ta.value) > LIMITS.comment);
      send.disabled = n < 1 || strLen(ta.value) > LIMITS.comment;
    };
    ta.addEventListener('input', update);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
    const form = h('form', { class: 'cmt-form', onsubmit: async e => {
      e.preventDefault();
      const body = ta.value.trim();
      if (!body || strLen(body) > LIMITS.comment) return;
      send.disabled = true;
      ta.disabled = true;
      try {
        const res = await api(postPath, { method: 'POST', body: { body } });
        const c = res?.comment;
        if (c) {
          c.mine = true;
          if (formFirst) comments.unshift(c); else comments.push(c);
          drawList();
          setCount();
          list.querySelector(formFirst ? '.cmt' : '.cmt:last-child')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          load();
        }
        ta.value = '';
      } catch (err) {
        toast(errorText(err));
      }
      ta.disabled = false;
      update();
    } }, ta, h('div', { class: 'cmt-form-foot' }, h('span', { class: 'cmt-hint' }, t('comments.hint')), counter, send));
    formBox.replaceChildren(form);
  }

  drawSort();
  drawForm();
  const section = h('section', { class: 'cmt-sec' },
    h('div', { class: 'cmt-head' },
      h('h3', { class: 'cmt-title' }, icon('chat'), t('comments.title'), ' ', countEl),
      sortSeg),
    formFirst && formBox,
    list,
    !formFirst && formBox,
  );

  if (lazy && 'IntersectionObserver' in window) {
    list.replaceChildren(h('li', { class: 'cmt-note' }, t('comments.loading')));
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: '200px' });
    // 상세 창이 그려진 다음에 관찰을 시작한다.
    requestAnimationFrame(() => io.observe(section));
  } else {
    setTimeout(load, 0);
  }
  return section;
}

const isDeleted = c => Boolean(c.deleted) || !c.body;

// ================================================================ 다른 화면에 끼우는 조각

// 티어 메이커 화면의 버튼들: 갤러리에 공개 / 이 묶음 갤러리
export function tierActions(template, state, ctx) {
  if (!loginEnabled()) return null;
  ctxRef = ctxRef || ctx;
  return [
    h('button', { class: 'btn', type: 'button', onclick: () => publish(template, state) }, t('gallery.publish')),
    h('a', { class: 'btn ghost', href: `#/gallery/${template.id}` }, t('gallery.browse')),
  ];
}

async function publish(template, state) {
  const placed = placedCount(state);
  if (!placed) { toast(t('gallery.publishEmpty')); return; }
  if (!(await requireLogin(t('acct.reason.publish')))) return;
  // 로그인하면서 동기화로 바뀌었을 수 있으니 저장된 최신 상태를 쓴다
  const current = loadState(template);
  const src = placedCount(current) ? current : state;
  const input = h('input', { type: 'text', value: src.title, maxlength: String(LIMITS.title), required: true });
  const help = h('p', { class: 'acct-help' }, t('gallery.publishNote'));
  const go = h('button', { class: 'btn primary', type: 'submit' }, t('gallery.publishGo'));
  const rows = src.tiers.filter(r => r.items.length).length;
  const form = h('form', { class: 'acct-form', onsubmit: async e => {
    e.preventDefault();
    const title = input.value.trim();
    if (!title || strLen(title) > LIMITS.title) { input.focus(); return; }
    go.disabled = true;
    try {
      const res = await api('/gallery', { method: 'POST', body: { template: template.id, title, state: compactState({ ...src, title }) } });
      const id = res?.post?.id;
      m.close();
      toast(t('gallery.published'));
      homeCache.clear();
      location.hash = id ? `#/g/${enc(id)}` : `#/gallery/${template.id}`;
    } catch (err) {
      toast(errorText(err));
      go.disabled = false;
    }
  } },
    h('div', { class: 'gal-publish-prev' }, preview({ state: src }, template),
      h('p', { class: 'muted' }, template.title, h('br'), t('gallery.publishStats', { n: placed, rows }))),
    h('label', { class: 'field' }, h('span', {}, t('gallery.postTitle')), input),
    help,
    h('div', { class: 'acct-form-actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => m.close() }, t('acct.cancel')),
      go),
  );
  const m = openModal({ title: t('gallery.publishTitle'), body: form, className: 'acct-small' });
  input.select();
}

// 홈 화면: 갤러리 인기·최신 글
const homeCache = new Map();
export function homeBlocks(mode, ctx) {
  if (mode !== 'tier' || !loginEnabled()) return [];
  ctxRef = ctxRef || ctx;
  let sort = 'top';
  const grid = h('div', { class: 'gal-strip', 'aria-busy': 'true' }, skeletonCards(4));
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': t('gallery.sort') });
  const sec = h('section', { class: 'block gal-home' },
    h('div', { class: 'gal-home-head' },
      h('h2', { class: 'block-title' }, t('gallery.homeTitle')),
      seg,
      h('a', { class: 'gal-home-all', href: '#/gallery' }, t('gallery.seeAll'), ' ›')),
    grid,
  );
  function drawSeg() {
    seg.replaceChildren(...[['top', t('gallery.sortTop')], ['new', t('gallery.sortNew')]].map(([k, label]) =>
      h('button', { type: 'button', class: sort === k ? 'on' : null, 'aria-pressed': String(sort === k), onclick: () => { if (sort !== k) { sort = k; drawSeg(); load(); } } }, label)));
  }
  async function load() {
    let posts;
    const hit = homeCache.get(sort);
    if (hit && Date.now() - hit.at < 60_000) posts = hit.posts;
    else {
      try {
        const data = await api(galleryQuery({ sort }));
        posts = Array.isArray(data?.posts) ? data.posts : [];
        homeCache.set(sort, { at: Date.now(), posts });
      } catch {
        sec.remove(); // 서버에 닿지 못하면 조용히 숨긴다
        return;
      }
    }
    if (!posts.length) { sec.remove(); return; }
    grid.removeAttribute('aria-busy');
    grid.replaceChildren(...posts.slice(0, 8).map(p => galleryCard(p, ctx.db)));
  }
  drawSeg();
  load();
  return [sec];
}

// 상세 창 아래쪽: 항목별 댓글 (창이 바로 열리도록 보일 때 불러온다)
let detailCache = null;
export function detailExtras(item, category, db) { // eslint-disable-line no-unused-vars
  if (!loginEnabled() || !item?.key) return null;
  // 강화 전/후 전환으로 다시 그릴 때는 같은 구역을 다시 쓴다.
  if (detailCache && detailCache.key === item.key && Date.now() - detailCache.at < 120_000) return detailCache.el;
  const [cat, ...rest] = item.key.split('/');
  const path = `/items/${enc(cat)}/${enc(rest.join('/'))}/comments`;
  const el = commentsSection({
    listPath: path, postPath: path,
    verdicts: verdictsFor(category.id), sortable: true, formFirst: true, lazy: true,
  });
  el.classList.add('cmt-item-sec');
  detailCache = { key: item.key, el, at: Date.now() };
  return el;
}
