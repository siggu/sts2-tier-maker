// 관리자 화면 (#/admin): 사용자가 올린 이미지 검토.
// 기본은 상태와 관계없이 최근에 올라온 순. 상태 탭(개수)·기간·올린 사람·용도로 걸러 보고,
// 날짜별로 묶은 작은 카드를 누르면 크게 보며 승인·숨김·차단한다 (API.md 이미지 검열).
// 관리자가 아니면 '권한 없음'. 이미지는 상태와 관계없이 보여야 하므로 /admin/img/:id 를
// Authorization 을 붙여 받아 blob 주소로 그린다 (<img src> 로는 헤더를 붙일 수 없다).
// 사용자가 쓴 글(이름·월드컵 제목)은 늘 글자 노드로 넣는다.

import { t, lang } from './i18n.js';
import { h, toast } from './ui.js';
import { API_BASE } from './balance.js';
import { currentUser, authHeaders, api, errorText, requireLogin, loginEnabled, dropSession, fetchMe, openModal } from './auth.js';
import { icon, timeEl } from './community.js';

const TABS = ['all', 'pending', 'reported', 'hidden', 'blocked'];
const RANGES = ['all', 'today', '7d', '30d', 'custom'];
const PURPOSES = ['cup', 'avatar'];
// 버튼 → 바뀌는 상태
const ACTIONS = [['approve', 'ok'], ['hide', 'hidden'], ['block', 'blocked']];
const ID_RE = /^[0-9a-f]{32}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const enc = encodeURIComponent;
const dayFmt = new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric', weekday: 'short' });
const clockFmt = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' });
let viewToken = 0;

export function route(parts, params, ctx) {
  if (parts[0] !== 'admin') return false;
  if (!loginEnabled() || parts[1]) { ctx.notFound(); return true; }
  view(params, ctx);
  return true;
}

function crumbs() {
  return h('nav', { class: 'crumbs', 'aria-label': t('crumbs.aria') },
    h('a', { href: '#/' }, t('site.name')),
    h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'),
    h('span', { 'aria-current': 'page' }, t('admin.nav')));
}

function denied(ctx, loggedIn) {
  ctx.render(crumbs(), h('section', { class: 'empty admin-denied' },
    h('div', { class: 'admin-denied-ic', 'aria-hidden': 'true' }, icon('shield')),
    h('h2', {}, t('admin.denied')),
    h('p', {}, t(loggedIn ? 'admin.deniedBody' : 'admin.loginBody')),
    loggedIn ? null : h('p', { class: 'actions admin-center' },
      h('button', { class: 'btn primary', type: 'button', onclick: async () => { if (await requireLogin()) ctx.rerender(); } }, t('acct.login'))),
  ));
}

// ---------------------------------------------------------------- 주소 ↔ 조건

// #/admin?status=&range=&from=YYYY-MM-DD&to=YYYY-MM-DD&user=&purpose=
function readFilters(params) {
  const pick = (key, list, dflt) => (list.includes(params.get(key)) ? params.get(key) : dflt);
  const f = {
    status: pick('status', TABS, 'all'),
    range: pick('range', RANGES, 'all'),
    from: DATE_RE.test(params.get('from') || '') ? params.get('from') : '',
    to: DATE_RE.test(params.get('to') || '') ? params.get('to') : '',
    user: ID_RE.test(params.get('user') || '') ? params.get('user') : '',
    purpose: pick('purpose', PURPOSES, ''),
  };
  if (f.range !== 'custom') f.from = f.to = '';
  return f;
}

function hrefOf(f) {
  const q = new URLSearchParams();
  if (f.status !== 'all') q.set('status', f.status);
  if (f.range !== 'all') q.set('range', f.range);
  if (f.range === 'custom') { if (f.from) q.set('from', f.from); if (f.to) q.set('to', f.to); }
  if (f.user) q.set('user', f.user);
  if (f.purpose) q.set('purpose', f.purpose);
  const qs = q.toString();
  return `#/admin${qs ? `?${qs}` : ''}`;
}

const go = (f, patch) => { location.hash = hrefOf({ ...f, ...patch }); };

const midnight = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const dayInput = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// 조건 → API 쿼리 (기간은 이 기기의 날짜 기준)
function apiQuery(f) {
  const q = new URLSearchParams({ status: f.status });
  const today = midnight();
  let from = null, to = null;
  if (f.range === 'today') from = today;
  else if (f.range === '7d') from = today - 6 * DAY_MS;
  else if (f.range === '30d') from = today - 29 * DAY_MS;
  else if (f.range === 'custom') {
    if (f.from) from = parseDay(f.from);
    if (f.to) to = parseDay(f.to) + DAY_MS;
  }
  if (from !== null) q.set('from', String(from));
  if (to !== null) q.set('to', String(to));
  if (f.user) q.set('user', f.user);
  if (f.purpose) q.set('purpose', f.purpose);
  return q;
}

function dayLabel(ms) {
  const day = midnight(new Date(ms));
  const today = midnight();
  const name = day === today ? t('admin.today') : day === today - DAY_MS ? t('admin.yesterday') : null;
  return name ? `${name} · ${dayFmt.format(ms)}` : dayFmt.format(ms);
}

// ---------------------------------------------------------------- 화면

function view(params, ctx) {
  const token = ++viewToken;
  const user = currentUser();
  if (!user) { denied(ctx, false); return; }
  if (!user.admin) {
    // 저장된 로그인 정보가 예전 것일 수 있어(ADMIN_USERS 에 막 넣은 경우 등) 서버에 한 번 물어본다
    ctx.render(crumbs(), h('section', { class: 'empty' }, h('p', {}, t('acct.loading'))));
    fetchMe().then(() => {
      if (token !== viewToken) return;
      if (currentUser()?.admin) ctx.rerender();
      else denied(ctx, Boolean(currentUser()));
    });
    return;
  }
  const f = readFilters(params);
  const live = () => token === viewToken;

  // 이 화면에서 만든 blob 주소는 화면을 떠날 때 푼다
  const urls = new Map(); // id → blob 주소 (작은 카드와 크게 보기가 같이 쓴다)
  const loading = new Map(); // id → Promise<주소 | null>
  const seen = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      seen.unobserve(e.target);
      e.target.dispatchEvent(new Event('admin-visible'));
    }
  }, { rootMargin: '300px' });
  ctx.addCleanup(() => { seen.disconnect(); for (const u of urls.values()) URL.revokeObjectURL(u); urls.clear(); });

  function picUrl(id) {
    if (urls.has(id)) return Promise.resolve(urls.get(id));
    if (!loading.has(id)) {
      loading.set(id, (async () => {
        try {
          const res = await fetch(`${API_BASE}/admin/img/${enc(id)}`, { headers: authHeaders() });
          if (res.status === 401) dropSession();
          if (!res.ok) throw new Error(`http_${res.status}`);
          const url = URL.createObjectURL(await res.blob());
          if (!live()) { URL.revokeObjectURL(url); return null; }
          urls.set(id, url);
          return url;
        } catch {
          return null;
        } finally {
          loading.delete(id);
        }
      })());
    }
    return loading.get(id);
  }

  async function fillPic(box, id, { lazy = true } = {}) {
    const draw = async () => {
      const url = await picUrl(id);
      if (!box.isConnected && lazy) return;
      box.replaceChildren(url ? h('img', { src: url, alt: '', decoding: 'async' }) : h('span', { class: 'admin-pic-msg' }, t('admin.imgFailed')));
    };
    if (!lazy || urls.has(id)) { draw(); return; }
    box.addEventListener('admin-visible', draw, { once: true });
    seen.observe(box);
  }

  // ---- 위: 상태 탭(개수), 기간, 올린 사람, 용도
  const counts = {};
  const tabs = h('div', { class: 'seg admin-tabs', role: 'tablist', 'aria-label': t('admin.tabAria') });
  function drawTabs() {
    tabs.replaceChildren(...TABS.map(k => h('button', {
      type: 'button', role: 'tab', class: k === f.status ? 'on' : null, 'aria-selected': String(k === f.status),
      onclick: () => { if (k !== f.status) go(f, { status: k }); },
    }, t(`admin.tab.${k}`), counts[k] != null ? h('span', { class: `admin-count${k !== 'all' && counts[k] > 0 ? ' has' : ''}` }, String(counts[k])) : null)));
  }
  drawTabs();

  const rangeSeg = h('div', { class: 'seg admin-range', role: 'group', 'aria-label': t('admin.range') },
    RANGES.map(k => h('button', {
      type: 'button', class: k === f.range ? 'on' : null, 'aria-pressed': String(k === f.range),
      onclick: () => {
        if (k === 'custom') {
          // 처음 고르면 지난 7일로 채워 둔다
          if (f.range !== 'custom') go(f, { range: 'custom', from: dayInput(midnight() - 6 * DAY_MS), to: dayInput(Date.now()) });
          return;
        }
        if (k !== f.range) go(f, { range: k });
      },
    }, t(`admin.range.${k}`))));
  let custom = null;
  if (f.range === 'custom') {
    const fromIn = h('input', { type: 'date', value: f.from, max: dayInput(Date.now()), 'aria-label': t('admin.range.from') });
    const toIn = h('input', { type: 'date', value: f.to, max: dayInput(Date.now()), 'aria-label': t('admin.range.to') });
    custom = h('form', {
      class: 'admin-custom',
      onsubmit: e => {
        e.preventDefault();
        let [a, b] = [fromIn.value, toIn.value];
        if (a && b && a > b) [a, b] = [b, a];
        go(f, { from: a, to: b });
      },
    }, fromIn, h('span', { 'aria-hidden': 'true' }, '–'), toIn, h('button', { class: 'btn small', type: 'submit' }, t('admin.range.apply')));
  }

  // 올린 사람: 고른 사람은 칩, 아니면 이름 검색
  const userBox = h('div', { class: 'admin-user' });
  function drawUserChip(u) {
    userBox.replaceChildren(h('span', { class: 'admin-chip' },
      icon('user'), h('span', { class: 'admin-chip-name' }, u?.name || f.user.slice(0, 10)),
      h('button', { type: 'button', class: 'admin-chip-x', 'aria-label': t('admin.userClear'), title: t('admin.userClear'), onclick: () => go(f, { user: '' }) }, '×')));
  }
  if (f.user) drawUserChip(null);
  else {
    const input = h('input', { type: 'search', class: 'admin-user-input', placeholder: t('admin.userSearch'), 'aria-label': t('admin.user'), autocomplete: 'off' });
    const list = h('div', { class: 'admin-user-list', role: 'listbox', hidden: true });
    let timer = 0, asked = 0;
    const search = async () => {
      const q = input.value.trim();
      const mine = ++asked;
      if (!q) { list.hidden = true; return; }
      try {
        const data = await api(`/admin/uploaders?q=${enc(q)}`);
        if (mine !== asked || !live()) return;
        const users = Array.isArray(data?.users) ? data.users.filter(u => u && ID_RE.test(u.id)) : [];
        list.replaceChildren(...(users.length ? users.map(u => h('button', {
          type: 'button', role: 'option', class: 'admin-user-opt',
          onclick: () => go(f, { user: u.id }),
        }, h('span', { class: 'admin-user-name' }, u.name || u.id.slice(0, 10)), h('span', { class: 'admin-user-n' }, t('admin.userImages', { n: u.images })))) : [h('p', { class: 'admin-user-none' }, t('admin.userNone'))]));
        list.hidden = false;
      } catch (err) {
        if (mine === asked) { list.replaceChildren(h('p', { class: 'admin-user-none' }, errorText(err))); list.hidden = false; }
      }
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') list.hidden = true; if (e.key === 'ArrowDown') list.querySelector('button')?.focus(); });
    userBox.addEventListener('focusout', () => setTimeout(() => { if (!userBox.contains(document.activeElement)) list.hidden = true; }, 0));
    userBox.replaceChildren(icon('user'), input, list);
  }

  const purposeSel = h('select', {
    class: 'admin-select', 'aria-label': t('admin.purpose'),
    onchange: () => go(f, { purpose: purposeSel.value }),
  }, ['', ...PURPOSES].map(k => h('option', { value: k, selected: k === f.purpose }, t(`admin.purpose.${k || 'all'}`))));

  const filtered = f.range !== 'all' || f.user || f.purpose;
  const filters = h('div', { class: 'admin-filters' },
    h('div', { class: 'admin-filter' }, h('span', { class: 'admin-filter-label' }, t('admin.range')), rangeSeg, custom),
    h('div', { class: 'admin-filter' }, h('span', { class: 'admin-filter-label' }, t('admin.user')), userBox),
    h('div', { class: 'admin-filter' }, h('span', { class: 'admin-filter-label' }, t('admin.purpose')), purposeSel),
    filtered ? h('a', { class: 'admin-reset', href: hrefOf({ ...f, range: 'all', user: '', purpose: '' }) }, t('admin.reset')) : null,
  );

  const summary = h('p', { class: 'admin-summary', 'aria-live': 'polite' });
  const groups = h('div', { class: 'admin-groups', 'aria-busy': 'true' });
  const more = h('div', { class: 'admin-more' });

  ctx.render(
    crumbs(),
    h('header', { class: 'admin-head' },
      h('h1', { class: 'admin-title' }, icon('shield'), t('admin.title')),
      h('p', { class: 'admin-lead' }, t('admin.lead'))),
    h('div', { class: 'admin-controls' }, tabs, filters),
    summary,
    groups,
    more,
  );

  // ---- 목록: 날짜별 묶음 + 작은 카드
  const shown = []; // 지금 보이는 순서 (크게 보기의 이전/다음)
  let lastDay = null, lastGrid = null;

  function tile(img) {
    const pic = h('span', { class: 'admin-tile-pic' }, h('span', { class: 'admin-pic-msg' }, '…'));
    const el = h('button', { type: 'button', class: 'admin-tile', onclick: () => openDetail(img) });
    img.redraw = () => {
      el.className = `admin-tile s-${img.status}`;
      el.setAttribute('aria-label', `${t(`admin.status.${img.status}`)} · ${img.user?.name || ''} · ${clockFmt.format(img.created)}`);
      el.replaceChildren(...[
        pic,
        h('span', { class: `admin-badge s-${img.status}` }, t(`admin.status.${img.status}`)),
        img.reports > 0 ? h('span', { class: 'admin-flag', title: t('admin.reports') }, icon('flag'), String(img.reports)) : null,
        img.purpose === 'avatar' ? h('span', { class: 'admin-kind' }, t('admin.purpose.avatar')) : null,
        h('span', { class: 'admin-tile-meta' },
          h('span', { class: 'admin-tile-user' }, img.user?.name || '?'),
          h('span', { class: 'admin-tile-time' }, clockFmt.format(img.created))),
      ].filter(Boolean));
    };
    img.redraw();
    fillPic(pic, img.id);
    return el;
  }

  function addImages(images) {
    for (const img of images) {
      const day = midnight(new Date(img.created));
      if (day !== lastDay) {
        lastDay = day;
        lastGrid = h('div', { class: 'admin-grid' });
        const count = h('span', { class: 'admin-day-n' });
        groups.append(h('section', { class: 'admin-day' },
          h('h2', { class: 'admin-day-title' }, dayLabel(img.created), count),
          lastGrid));
        lastGrid.countEl = count;
        lastGrid.n = 0;
      }
      shown.push(img);
      lastGrid.append(tile(img));
      lastGrid.n++;
      lastGrid.countEl.textContent = t('admin.total', { n: lastGrid.n });
    }
  }

  // ---- 크게 보기: 큰 그림 + 자세한 정보 + 승인·숨김·차단, ←/→ 로 이전·다음
  function openDetail(start) {
    let img = start;
    let busy = false;
    const big = h('div', { class: 'admin-big' });
    const info = h('div', { class: 'admin-info' });
    const nav = h('div', { class: 'admin-nav' });
    const body = h('div', { class: 'admin-detail' }, big, info);
    const onKey = e => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    const m = openModal({
      title: t('admin.detail'), body: h('div', {}, body, nav), className: 'admin-detail-modal',
      onClose: () => window.removeEventListener('keydown', onKey),
    });

    function step(d) {
      const i = shown.indexOf(img) + d;
      if (i < 0 || i >= shown.length) return;
      img = shown[i];
      draw();
    }

    async function act(action) {
      if (busy) return;
      if (action === 'block' && !confirm(t('admin.blockConfirm'))) return;
      busy = true;
      body.classList.add('busy');
      const target = img;
      try {
        const res = await api(`/admin/images/${enc(target.id)}`, { method: 'POST', body: { action } });
        if (res?.image) Object.assign(target, res.image);
        target.redraw?.();
        toast(t(`admin.done.${action}`));
        if (target === img) draw();
      } catch (err) {
        toast(errorText(err));
      } finally {
        busy = false;
        body.classList.remove('busy');
      }
    }

    const row = (label, ...value) => [h('dt', {}, label), h('dd', {}, ...value)];
    function draw() {
      const cups = Array.isArray(img.cups) ? img.cups : [];
      big.replaceChildren(h('span', { class: 'admin-pic-msg' }, '…'));
      const id = img.id;
      picUrl(id).then(url => {
        if (img.id !== id) return;
        big.replaceChildren(url
          ? h('a', { href: url, target: '_blank', rel: 'noopener', title: t('admin.openFull') }, h('img', { src: url, alt: '' }))
          : h('span', { class: 'admin-pic-msg' }, t('admin.imgFailed')));
      });
      info.replaceChildren(
        h('div', { class: 'admin-info-top' },
          h('span', { class: `admin-status s-${img.status}` }, t(`admin.status.${img.status}`)),
          h('code', { class: 'admin-id', title: img.id }, img.id.slice(0, 12))),
        h('dl', { class: 'admin-meta' },
          row(t('admin.uploader'), h('span', {}, img.user?.name || img.user?.id || '?'),
            img.user?.id && img.user.id !== f.user
              ? h('button', { type: 'button', class: 'admin-link', onclick: () => { m.close(); go(f, { user: img.user.id }); } }, t('admin.onlyUser'))
              : null),
          row(t('admin.uploaded'), h('span', { title: fullFmt.format(img.created) }, fullFmt.format(img.created)), ' · ', timeEl(img.created)),
          row(t('admin.ai'), h('span', { class: 'admin-ai', title: img.ai || '' }, img.ai || '—')),
          row(t('admin.reports'), h('b', { class: img.reports > 0 ? 'admin-reports has' : 'admin-reports' }, String(img.reports || 0))),
          row(t('admin.purpose'), t(`admin.purpose.${PURPOSES.includes(img.purpose) ? img.purpose : 'all'}`)),
          row(t('admin.size'), `${Math.max(1, Math.round((img.size || 0) / 1024))}KB · ${String(img.type || '').replace('image/', '')}`),
          cups.length ? row(t('admin.usedIn'), cups.map((c, i) => [i ? ', ' : null, h('a', { href: `#/cup/${enc(c.id)}`, onclick: () => m.close() }, c.title)])) : null,
          img.reviewedAt ? row(t('admin.reviewed'), timeEl(img.reviewedAt)) : null),
        h('div', { class: 'admin-actions' },
          ACTIONS.map(([action, to]) => h('button', {
            type: 'button',
            class: `btn small${action === 'approve' ? ' primary' : action === 'block' ? ' danger' : ''}`,
            disabled: img.status === to,
            onclick: () => act(action),
          }, t(`admin.action.${action}`)))),
      );
      const i = shown.indexOf(img);
      nav.replaceChildren(
        h('button', { type: 'button', class: 'btn ghost small', disabled: i <= 0, onclick: () => step(-1) }, '‹ ', t('admin.prev')),
        h('span', { class: 'admin-nav-pos' }, `${i + 1} / ${shown.length}`),
        h('button', { type: 'button', class: 'btn ghost small', disabled: i < 0 || i >= shown.length - 1, onclick: () => step(1) }, t('admin.next'), ' ›'));
      // 다음 그림을 미리 받아 둔다
      if (shown[i + 1]) picUrl(shown[i + 1].id);
    }
    draw();
  }

  // ---- 불러오기
  const base = apiQuery(f);
  async function load(cursor = null) {
    more.replaceChildren(...[cursor ? h('span', { class: 'muted' }, t('acct.loading')) : null].filter(Boolean));
    let data;
    try {
      const q = new URLSearchParams(base);
      if (cursor) q.set('cursor', cursor);
      data = await api(`/admin/images?${q}`);
    } catch (err) {
      if (!live()) return;
      if (err?.status === 401) { denied(ctx, false); return; }
      if (err?.status === 403) { denied(ctx, true); return; }
      const retry = h('button', { class: 'btn small', type: 'button', onclick: () => load(cursor) }, t('acct.retry'));
      groups.removeAttribute('aria-busy');
      if (!cursor) groups.replaceChildren(h('section', { class: 'empty' }, h('h2', {}, t('admin.loadFailed')), h('p', {}, errorText(err)), h('p', {}, retry)));
      else more.replaceChildren(h('p', { class: 'muted' }, errorText(err)), retry);
      return;
    }
    if (!live()) return;
    const images = (Array.isArray(data?.images) ? data.images : []).filter(i => i && ID_RE.test(i.id) && Number.isFinite(i.created));
    groups.removeAttribute('aria-busy');
    if (!cursor) {
      if (data?.counts) { Object.assign(counts, data.counts); drawTabs(); }
      if (f.user && data?.user) drawUserChip(data.user);
      summary.textContent = counts[f.status] != null ? t('admin.matching', { n: counts[f.status] }) : '';
      if (!images.length) groups.replaceChildren(h('section', { class: 'empty admin-empty' }, h('p', {}, t(filtered ? 'admin.emptyFiltered' : 'admin.empty'))));
    }
    addImages(images);
    more.replaceChildren(...[data?.next
      ? h('button', { class: 'btn', type: 'button', onclick: () => load(data.next) }, t('admin.more'))
      : null].filter(Boolean));
  }
  load();
}
