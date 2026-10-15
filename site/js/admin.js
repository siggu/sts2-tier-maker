// 관리자 화면 (#/admin): 사용자가 올린 이미지 검토.
// 검토 대기(AI 판정 없음)·신고됨·숨김·차단 목록에서 승인·숨김·차단 (API.md 이미지 검열).
// 관리자가 아니면 '권한 없음'. 이미지는 상태와 관계없이 보여야 하므로 /admin/img/:id 를
// Authorization 을 붙여 받아 blob 주소로 그린다 (<img src> 로는 헤더를 붙일 수 없다).
// 사용자가 쓴 글(이름·월드컵 제목)은 늘 글자 노드로 넣는다.

import { t } from './i18n.js';
import { h, toast } from './ui.js';
import { API_BASE } from './balance.js';
import { currentUser, authHeaders, api, errorText, requireLogin, loginEnabled, dropSession, fetchMe } from './auth.js';
import { icon, timeEl } from './community.js';

const TABS = ['pending', 'reported', 'hidden', 'blocked'];
// 버튼 → 바뀌는 상태
const ACTIONS = [['approve', 'ok'], ['hide', 'hidden'], ['block', 'blocked']];
const ID_RE = /^[0-9a-f]{32}$/;
const enc = encodeURIComponent;
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
  const status = TABS.includes(params.get('status')) ? params.get('status') : 'pending';

  // 이 화면에서 만든 blob 주소는 화면을 떠날 때 푼다
  const urls = new Set();
  ctx.addCleanup(() => { for (const u of urls) URL.revokeObjectURL(u); urls.clear(); });

  const grid = h('div', { class: 'admin-grid', 'aria-busy': 'true' });
  const more = h('div', { class: 'admin-more' });
  const tabs = h('div', { class: 'seg admin-tabs', role: 'tablist', 'aria-label': t('admin.tabAria') },
    TABS.map(k => h('button', {
      type: 'button', role: 'tab', class: k === status ? 'on' : null, 'aria-selected': String(k === status),
      onclick: () => { if (k !== status) location.hash = `#/admin?status=${k}`; },
    }, t(`admin.tab.${k}`))));

  ctx.render(
    crumbs(),
    h('header', { class: 'admin-head' },
      h('h1', { class: 'admin-title' }, icon('shield'), t('admin.title')),
      h('p', { class: 'admin-lead' }, t('admin.lead'))),
    h('div', { class: 'admin-controls' }, tabs),
    grid,
    more,
  );

  // 관리자용 이미지 받기 → <img src="blob:…">
  async function loadPic(id, box) {
    try {
      const res = await fetch(`${API_BASE}/admin/img/${enc(id)}`, { headers: authHeaders() });
      if (res.status === 401) dropSession();
      if (!res.ok) throw new Error(`http_${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      if (token !== viewToken) { URL.revokeObjectURL(url); return; }
      urls.add(url);
      box.replaceChildren(h('a', { href: url, target: '_blank', rel: 'noopener', title: t('admin.openFull') },
        h('img', { src: url, alt: '', decoding: 'async' })));
    } catch {
      box.replaceChildren(h('span', { class: 'admin-pic-msg' }, t('admin.imgFailed')));
    }
  }

  function card(img) {
    const el = h('article', { class: `admin-card s-${img.status}` });
    const pic = h('div', { class: 'admin-pic' }, h('span', { class: 'admin-pic-msg' }, '…'));
    loadPic(img.id, pic);
    let busy = false;

    async function act(action) {
      if (busy) return;
      if (action === 'block' && !confirm(t('admin.blockConfirm'))) return;
      busy = true;
      el.classList.add('busy');
      try {
        const res = await api(`/admin/images/${enc(img.id)}`, { method: 'POST', body: { action } });
        if (res?.image) Object.assign(img, res.image);
        toast(t(`admin.done.${action}`));
        draw();
      } catch (err) {
        toast(errorText(err));
      } finally {
        busy = false;
        el.classList.remove('busy');
      }
    }

    const row = (label, ...value) => [h('dt', {}, label), h('dd', {}, ...value)];
    function draw() {
      el.className = `admin-card s-${img.status}`;
      const cups = Array.isArray(img.cups) ? img.cups : [];
      el.replaceChildren(
        pic,
        h('div', { class: 'admin-card-body' },
          h('div', { class: 'admin-card-top' },
            h('span', { class: `admin-status s-${img.status}` }, t(`admin.status.${img.status}`)),
            h('code', { class: 'admin-id', title: img.id }, img.id.slice(0, 10)),
            h('span', { class: 'admin-size' }, `${Math.max(1, Math.round((img.size || 0) / 1024))}KB · ${String(img.type || '').replace('image/', '')}`)),
          h('dl', { class: 'admin-meta' },
            row(t('admin.reports'), h('b', { class: img.reports > 0 ? 'admin-reports has' : 'admin-reports' }, String(img.reports || 0))),
            row(t('admin.ai'), h('span', { class: 'admin-ai', title: img.ai || '' }, img.ai || '—')),
            row(t('admin.uploader'), img.user?.name || img.user?.id || '?'),
            row(t('admin.uploaded'), timeEl(img.created)),
            cups.length ? row(t('admin.usedIn'), cups.map((c, i) => [i ? ', ' : null, h('a', { href: `#/cup/${enc(c.id)}` }, c.title)])) : null,
            img.reviewedAt ? row(t('admin.reviewed'), timeEl(img.reviewedAt)) : null),
          h('div', { class: 'admin-actions' },
            ACTIONS.map(([action, to]) => h('button', {
              type: 'button',
              class: `btn small${action === 'approve' ? ' primary' : action === 'block' ? ' danger' : ''}`,
              disabled: img.status === to,
              onclick: () => act(action),
            }, t(`admin.action.${action}`)))),
        ),
      );
    }
    draw();
    return el;
  }

  async function load(cursor = null) {
    more.replaceChildren(...[cursor ? h('span', { class: 'muted' }, t('acct.loading')) : null].filter(Boolean));
    let data;
    try {
      data = await api(`/admin/images?status=${status}${cursor ? `&cursor=${enc(cursor)}` : ''}`);
    } catch (err) {
      if (token !== viewToken) return;
      if (err?.status === 401) { denied(ctx, false); return; }
      if (err?.status === 403) { denied(ctx, true); return; }
      const retry = h('button', { class: 'btn small', type: 'button', onclick: () => load(cursor) }, t('acct.retry'));
      grid.removeAttribute('aria-busy');
      if (!cursor) grid.replaceChildren(h('section', { class: 'empty' }, h('h2', {}, t('admin.loadFailed')), h('p', {}, errorText(err)), h('p', {}, retry)));
      else more.replaceChildren(h('p', { class: 'muted' }, errorText(err)), retry);
      return;
    }
    if (token !== viewToken) return;
    const images = (Array.isArray(data?.images) ? data.images : []).filter(i => i && ID_RE.test(i.id));
    grid.removeAttribute('aria-busy');
    if (!cursor) grid.replaceChildren();
    grid.append(...images.map(card));
    if (!cursor && !images.length) grid.replaceChildren(h('section', { class: 'empty admin-empty' }, h('p', {}, t('admin.empty'))));
    more.replaceChildren(...[data?.next
      ? h('button', { class: 'btn', type: 'button', onclick: () => load(data.next) }, t('admin.more'))
      : null].filter(Boolean));
  }
  load();
}
