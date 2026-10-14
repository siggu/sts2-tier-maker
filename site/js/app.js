import { loadData, facetLabel, groupLabel } from './data.js';
import { t, lang, LANGS, setLang, translateStatic, collator } from './i18n.js';
import { h, toast, tile, hideTip, attachTooltips } from './ui.js';
import { board } from './ui.js';
import { poolControls, applyFilter } from './filters.js';
import {
  loadState, saveState, clearState, freshState, savedSummary, unranked, moveItem,
  encodeShare, decodeShare, PALETTE,
} from './tierlist.js';
import { renderPng } from './export.js';
import { openDetail, closeDetail } from './detail.js';
import { verdictsFor, loadMine, saveMine, loadSubmitted, unsubmittedChanges, submitChanges, onSyncStatus, fetchResults, flush } from './balance.js';
import * as community from './community.js';
import * as play from './play.js';

const app = document.getElementById('app');
let db = null;
let cleanup = [];

let lastPath = null;

// 기능 모듈(community.js, play.js)에 넘기는 화면 도구
const ctx = {
  get db() { return db; },
  render, crumbs, notFound, popover, progressBar, templateCard, thumbs,
  modes: () => MODES,
  addCleanup: fn => cleanup.push(fn),
  rerender: () => route(),
};

function route() {
  closeDetail();
  cleanup.forEach(fn => fn());
  cleanup = [];
  hideTip();
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  // 다른 화면으로 옮길 때는 맨 위에서 시작한다.
  if (path !== lastPath) { window.scrollTo(0, 0); lastPath = path; }

  setNav(parts[0] === 'balance' ? 'balance' : 'tier', parts);

  // 기능 모듈이 먼저 자기 주소(#/gallery, #/versus 등)를 처리한다.
  if (community.route(parts, params, ctx) || play.route(parts, params, ctx)) return;

  if (parts[0] === 'tier' && parts[1]) return viewTier(parts[1], params.get('s'));
  if (parts[0] === 'c' && parts[1]) return viewCategory('tier', parts[1]);
  if (parts[0] === 'balance' && parts[1] === 'c' && parts[2]) return viewCategory('balance', parts[2]);
  if (parts[0] === 'balance' && parts[1] === 'mine') return viewMyVotes();
  if (parts[0] === 'balance' && parts[1] && parts[2] === 'results') return viewResults(parts[1]);
  if (parts[0] === 'balance' && parts[1]) return viewBalance(parts[1]);
  return viewHome(parts[0] === 'balance' ? 'balance' : 'tier');
}

function setNav(active, parts = []) {
  const nav = document.getElementById('topnav');
  // 기능 모듈이 주소를 맡으면 그 모듈의 메뉴가 활성
  const extra = [...community.navLinks(parts), ...play.navLinks(parts)];
  const moduleActive = extra.some(a => a.classList.contains('active'));
  nav.replaceChildren(
    h('a', { href: '#/', class: active === 'tier' && !moduleActive ? 'active' : null }, t('mode.tier')),
    h('a', { href: '#/balance', class: active === 'balance' && !moduleActive ? 'active' : null }, t('mode.balance')),
    ...extra,
  );
}

function render(...nodes) {
  // 조건부 조각(cond && h(...))이 false·undefined·0 이 되면 글자로 찍히지 않게 거른다.
  app.replaceChildren(...nodes.flat(Infinity).filter(n => n instanceof Node || (typeof n === 'string' && n)));
  app.focus({ preventScroll: true });
}

function notFound() {
  render(h('section', { class: 'empty' },
    h('h2', {}, t('notFound.title')),
    h('p', {}, h('a', { href: '#/' }, t('notFound.home'))),
  ));
}

// ---------------------------------------------------------------- 홈

const blurb = cat => t(`blurb.${cat.id}`);

const MODES = {
  tier: {
    base: '#/',
    title: t('mode.tier'),
    icon: '🏆',
    lead: t('mode.tier.lead'),
    href: tpl => `#/tier/${tpl.id}`,
    cat: c => `#/c/${c.id}`,
  },
  balance: {
    base: '#/balance',
    title: t('mode.balance'),
    icon: '⚖️',
    lead: t('mode.balance.lead'),
    href: tpl => `#/balance/${tpl.id}`,
    cat: c => `#/balance/c/${c.id}`,
  },
};

const summaryFor = (mode, t) => (mode === 'tier' ? savedSummary(t) : balanceSummary(t));

// 카테고리나 템플릿을 대표하는 이미지 몇 장 (겹치지 않는 고정 크기 틀 안에 배치)
function thumbs(items, tileKind, n = 4) {
  const pics = items.filter(i => i.img).slice(0, n);
  return h('div', { class: `thumbs kind-${tileKind} n${pics.length}`, 'aria-hidden': 'true' },
    pics.map(i => h('img', { src: i.img, alt: '', loading: 'lazy', decoding: 'async' })));
}

function progressBar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return h('div', { class: 'pbar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': t('progress.aria', { done, total }) },
    h('span', { style: { width: `${pct}%` } }));
}

function crumbs(mode, ...items) {
  const m = MODES[mode];
  return h('nav', { class: 'crumbs', 'aria-label': t('crumbs.aria') },
    h('a', { href: m.base }, m.title),
    items.map(([label, href]) => [h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'), href ? h('a', { href }, label) : h('span', { 'aria-current': 'page' }, label)]),
  );
}

function modeSwitch(mode) {
  return h('div', { class: 'modes' }, Object.entries(MODES).map(([key, m]) => h('a', {
    class: `mode-card${key === mode ? ' on' : ''}`, href: m.base, 'aria-current': key === mode ? 'page' : null,
  },
    h('span', { class: 'mode-icon', 'aria-hidden': 'true' }, m.icon),
    h('span', { class: 'mode-text' },
      h('strong', {}, m.title),
      h('span', {}, m.lead)),
  )));
}

function viewHome(mode) {
  const m = MODES[mode];

  // 이어서 하기: 진행 중인 묶음 (최근 것 먼저)
  // 이어서 하기: 아직 덜 끝났거나 제출하지 않은 변경이 있는 묶음만.
  // 밸런스 투표는 같은 종류의 묶음끼리 표를 공유하므로 종류마다 마지막으로 작업한 묶음 하나만 보인다.
  const started = db.templates
    .map(t => ({ t, s: summaryFor(mode, t) }))
    .filter(x => x.s && templateStatus(x.t, x.s) !== 'done')
    .filter((x, i, all) => {
      if (mode !== 'balance') return true;
      const last = lastBalanceTemplate(x.t.category.id);
      const same = all.filter(y => y.t.category.id === x.t.category.id);
      return same.some(y => y.t.id === last) ? x.t.id === last : same[0] === x;
    })
    .sort((a, b) => (b.s.updatedAt || 0) - (a.s.updatedAt || 0) || b.s.placed - a.s.placed)
    .slice(0, 6);

  const catCards = db.categories.map(cat => {
    const templates = db.templates.filter(t => t.category.id === cat.id);
    const href = templates.length === 1 ? m.href(templates[0]) : m.cat(cat);
    const counts = { progress: 0, submit: 0, done: 0 };
    for (const t of templates) {
      const st = templateStatus(t, summaryFor(mode, t));
      if (st) counts[st]++;
    }
    const touched = counts.progress + counts.submit + counts.done;
    return h('a', { class: 'cat-card', href },
      thumbs(cat.items, cat.tile, 4),
      h('div', { class: 'cat-card-body' },
        h('h3', {}, cat.name),
        h('p', {}, blurb(cat)),
        h('div', { class: 'cat-card-meta' },
          // 완료한 묶음 / 전체 묶음: 다 끝냄 초록, 일부 주황, 시작 안 함 빨강
          h('span', { class: `st ${stateClass(counts.done, templates.length, touched)}`, title: t('home.doneSets') },
            `${counts.done === templates.length ? '✓ ' : ''}${counts.done}/${templates.length}`),
          h('span', {}, t('n.items', { n: cat.items.length })),
          counts.submit > 0 && h('span', { class: 'badge-submit' }, `${t('status.submit')} ${counts.submit}`),
        ),
      ),
    );
  });

  const myCount = mode === 'balance' ? myVoteCount() : 0;
  render(
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, t('home.eyebrow')),
      h('h1', {}, t('site.name')),
      modeSwitch(mode),
      myCount > 0 && h('a', { class: 'my-votes-link', href: '#/balance/mine' },
        h('span', { class: 'mvl-icon', 'aria-hidden': 'true' }, '🗳️'),
        h('span', {}, h('strong', {}, t('home.myVotes')), ` · ${t('home.myVotesCount', { n: myCount })}`),
        h('span', { 'aria-hidden': 'true' }, '›')),
    ),
    community.homeBlocks(mode, ctx),
    play.homeBlocks(mode, ctx),
    started.length > 0 && h('section', { class: 'block' },
      h('h2', { class: 'block-title' }, t('home.continue')),
      h('div', { class: 'tpl-grid' }, started.map(({ t: tpl, s }) => templateCard(mode, tpl, s, true))),
    ),
    h('section', { class: 'block' },
      h('h2', { class: 'block-title' }, mode === 'tier' ? t('home.pick.tier') : t('home.pick.balance')),
      h('div', { class: 'cat-grid' }, catCards),
    ),
  );
}

function templateCard(mode, tpl, summary = summaryFor(mode, tpl), showCategory = false) {
  const m = MODES[mode];
  const status = templateStatus(tpl, summary);
  const placed = summary?.placed || 0;
  const meta = [
    // 배치(분류)한 항목 / 전체 항목: 다 끝냄 초록, 일부 주황, 시작 안 함 빨강
    h('span', { class: `st ${status === 'done' ? 'st-done' : stateClass(placed, tpl.items.length, status ? 1 : 0)}` },
      `${status === 'done' ? '✓ ' : ''}${placed}/${tpl.items.length}`),
    status === 'submit' && h('span', { class: 'badge-submit' }, t('status.submit')),
  ];
  return h('a', { class: `tpl-card${status ? ` is-${status}` : ''}`, href: m.href(tpl), style: tpl.group?.color ? { '--accent': tpl.group.color } : null },
    thumbs(tpl.items, tpl.tile, 4),
    h('div', { class: 'tpl-card-body' },
      h('strong', {}, showCategory ? tpl.title : (tpl.parts.length ? tpl.label : t('tpl.all'))),
      h('div', { class: 'tpl-card-meta' }, meta),
      (status === 'progress' || status === 'submit') && progressBar(summary.placed, tpl.items.length),
    ),
  );
}

// 카테고리 안의 묶음 고르기
function viewCategory(mode, catId) {
  const cat = db.categories.find(c => c.id === catId);
  if (!cat) return notFound();
  const templates = db.templates.filter(t => t.category.id === cat.id);
  if (templates.length === 1) { location.replace(MODES[mode].href(templates[0])); return; }

  const order = [];
  const bySection = new Map();
  const customLabel = new Map();
  for (const t of templates) {
    if (!bySection.has(t.section)) { bySection.set(t.section, []); order.push(t.section); }
    bySection.get(t.section).push(t);
    if (t.sectionLabel) customLabel.set(t.section, t.sectionLabel);
  }
  const label = sec => {
    if (customLabel.has(sec)) return customLabel.get(sec);
    if (sec === 'all') return t('section.all');
    if (sec === 'rarity') return t('section.rarity');
    if (sec === 'type') return t('section.type');
    if (sec === 'group') return cat.groupKind === 'act' ? t('section.act') : t('section.character');
    return cat.groups.find(g => g.id === sec)?.name || sec;
  };
  const color = sec => cat.groups.find(g => g.id === sec)?.color;

  render(
    crumbs(mode, [cat.name]),
    h('header', { class: 'page-head' },
      h('h1', {}, cat.name),
      h('p', {}, blurb(cat), ` · ${t('category.split', { n: cat.items.length, sets: templates.length })}`),
    ),
    order.map(sec => h('section', { class: 'block' },
      h('h2', { class: 'block-title', style: color(sec) ? { '--accent': color(sec) } : null }, label(sec)),
      h('div', { class: 'tpl-grid' }, bySection.get(sec).map(t => templateCard(mode, t))),
    )),
  );
}

// 보드 화면 위쪽: 경로 + 사용법 안내(한 번 닫으면 다시 안 보임)
function boardHeader(mode, template) {
  const cat = template.category;
  const multi = db.templates.filter(t => t.category.id === cat.id).length > 1;
  const path = multi
    ? [[cat.name, MODES[mode].cat(cat)], [template.parts.map(p => p.label).join(' · ') || t('tpl.all')]]
    : [[cat.name]];
  return crumbs(mode, ...path);
}

// 밸런스 투표는 제출 방식이 바뀌어 안내를 따로(새로) 보여 준다.
const HINT_KEYS = { tier: 'sts2.hint.v1', balance: 'sts2.hint.balance.v2' };
function usageHint(mode) {
  const HINT_KEY = HINT_KEYS[mode];
  try { if (localStorage.getItem(HINT_KEY)) return null; } catch { /* 저장소 없음 */ }
  const el = h('div', { class: 'hint' },
    h('div', {},
      h('strong', {}, `${t('hint.title')} `),
      t('hint.body'),
      mode === 'balance' ? ` ${t('hint.balance')}` : ''),
    h('button', { class: 'btn ghost small', onclick: () => { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* 무시 */ } el.remove(); } }, t('hint.ok')),
  );
  return el;
}

const LAST_KEY = cat => `sts2bal.last.${cat}`;
function lastBalanceTemplate(catId) {
  try { return localStorage.getItem(LAST_KEY(catId)); } catch { return null; }
}
function rememberBalanceTemplate(template) {
  try { localStorage.setItem(LAST_KEY(template.category.id), template.id); } catch { /* 저장소 없음 */ }
}

function balanceSummary(template) {
  const mine = loadMine(template.category.id);
  const placed = Object.values(mine).flat().filter(id => template.byId.has(id)).length;
  const unsubmitted = unsubmittedChanges(template.category.id, mine, template.items.map(i => i.id)).length;
  return placed || unsubmitted ? { placed, unsubmitted } : null;
}

// 진행 색: 다 끝냄 → done(초록), 일부 → partial(주황), 아무것도 안 함 → none(빨강)
function stateClass(done, total, touched = done) {
  if (total > 0 && done >= total) return 'st-done';
  return touched > 0 || done > 0 ? 'st-partial' : 'st-none';
}

// 묶음 상태: null(시작 안 함) | 'progress'(진행 중) | 'submit'(제출 필요) | 'done'(완료)
function templateStatus(t, summary) {
  if (!summary) return null;
  if (summary.unsubmitted) return 'submit';
  return summary.placed >= t.items.length ? 'done' : 'progress';
}

// ---------------------------------------------------------------- 티어 메이커

async function viewTier(templateId, shareCode) {
  const template = db.template(templateId);
  if (!template) return notFound();

  if (shareCode) {
    const shared = await decodeShare(shareCode, template);
    if (!shared) { toast(t('share.bad')); location.hash = `#/tier/${templateId}`; return; }
    return viewShared(template, shared);
  }

  let state = loadState(template);
  const filter = {};

  function rerender() {
    const scrollY = window.scrollY;
    draw();
    window.scrollTo(0, scrollY);
  }

  function commit() {
    saveState(template, state);
    rerender();
  }

  function draw() {
    const pool = unranked(template, state);
    const controls = poolControls(template, filter, () => applyFilter(poolEl, template, filter));
    const b = board({
      template,
      rows: state.tiers,
      pool: { items: pool, controls },
      onMove: (id, to, index) => { moveItem(state, id, to, index); commit(); },
      onRowMenu: (ri, anchor) => rowMenu(ri, anchor),
      onOpen: id => openDetail(template.byId.get(id), template.category, db),
    });
    const poolEl = b.querySelector('.pool');
    applyFilter(poolEl, template, filter);

    const title = h('input', {
      class: 'title-input', value: state.title, maxlength: '80', 'aria-label': t('tier.titleAria'),
      onchange: e => { state.title = e.target.value.trim() || freshState(template).title; saveState(template, state); },
    });

    const placed = template.items.length - pool.length;
    render(
      boardHeader('tier', template),
      h('div', { class: 'board-head' },
        h('div', { class: 'board-title' },
          title,
          h('div', { class: 'board-progress' },
            progressBar(placed, template.items.length),
            h('span', {}, t('tier.placed', { n: placed, total: template.items.length }))),
        ),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => savePng(template, state) }, t('tier.savePng')),
          h('button', { class: 'btn', onclick: () => share(template, state) }, t('tier.share')),
          community.tierActions(template, state, ctx),
          play.tierActions(template, state, ctx),
          h('button', { class: 'btn ghost', onclick: reset }, t('tier.reset')),
        ),
      ),
      usageHint('tier'),
      template.category.enemy && h('p', { class: 'help' }, t('tier.threatNote')),
      b,
    );
  }

  function reset() {
    if (!confirm(t('tier.resetConfirm'))) return;
    clearState(template);
    state = freshState(template);
    draw();
  }

  function rowMenu(ri, anchor) {
    const tier = state.tiers[ri];
    const input = h('input', { value: tier.label, maxlength: '40', 'aria-label': t('row.nameAria') });
    const close = popover(anchor, h('div', { class: 'row-menu' },
      h('label', { class: 'field' }, h('span', {}, t('row.name')), input),
      h('div', { class: 'swatches', role: 'group', 'aria-label': t('row.color') }, PALETTE.map(c => h('button', {
        class: `swatch${c === tier.color ? ' on' : ''}`, style: { background: c }, 'aria-label': c,
        onclick: () => { tier.color = c; close(); commit(); },
      }))),
      h('div', { class: 'menu-actions' },
        h('button', { class: 'btn small', onclick: () => { state.tiers.splice(ri, 0, { label: t('row.new'), color: PALETTE[9], items: [] }); close(); commit(); } }, t('row.addAbove')),
        h('button', { class: 'btn small', onclick: () => { state.tiers.splice(ri + 1, 0, { label: t('row.new'), color: PALETTE[9], items: [] }); close(); commit(); } }, t('row.addBelow')),
        ri > 0 && h('button', { class: 'btn small', onclick: () => { [state.tiers[ri - 1], state.tiers[ri]] = [state.tiers[ri], state.tiers[ri - 1]]; close(); commit(); } }, t('row.up')),
        ri < state.tiers.length - 1 && h('button', { class: 'btn small', onclick: () => { [state.tiers[ri + 1], state.tiers[ri]] = [state.tiers[ri], state.tiers[ri + 1]]; close(); commit(); } }, t('row.down')),
        h('button', { class: 'btn small', onclick: () => { tier.items = []; close(); commit(); } }, t('row.clear')),
        state.tiers.length > 1 && h('button', { class: 'btn small danger', onclick: () => { state.tiers.splice(ri, 1); close(); commit(); } }, t('row.delete')),
      ),
    ), () => {
      const v = input.value.trim();
      if (v && v !== tier.label) { tier.label = v; commit(); }
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') close(); });
    input.focus();
    input.select();
  }

  draw();
}

function viewShared(template, shared) {
  const b = board({ template, rows: shared.tiers, readonly: true, onOpen: id => openDetail(template.byId.get(id), template.category, db) });
  render(
    boardHeader('tier', template),
    h('div', { class: 'banner' },
      h('p', {}, t('shared.banner')),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => savePng(template, shared) }, t('tier.savePng')),
        h('button', { class: 'btn primary', onclick: () => {
          if (savedSummary(template) && !confirm(t('shared.overwrite'))) return;
          saveState(template, shared);
          location.hash = `#/tier/${template.id}`;
        } }, t('shared.import')),
        h('a', { class: 'btn ghost', href: `#/tier/${template.id}` }, t('shared.mine')),
      ),
    ),
    h('h1', { class: 'shared-title' }, shared.title),
    b,
  );
}

async function savePng(template, state) {
  toast(t('png.making'));
  try {
    const blob = await renderPng(template, state);
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

async function share(template, state) {
  const code = await encodeShare(state);
  const url = `${location.origin}${location.pathname}#/tier/${template.id}?s=${code}`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: state.title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast(t('share.copied'));
  } catch {
    prompt(t('share.copyPrompt'), url);
  }
}

function popover(anchor, content, onClose) {
  const el = h('div', { class: 'popover', role: 'dialog' }, content);
  document.body.append(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + scrollX))}px`;
  el.style.top = `${r.bottom + scrollY + 6}px`;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    onClose?.();
    el.remove();
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', esc);
  };
  const outside = e => { if (!el.contains(e.target)) close(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
  document.addEventListener('keydown', esc);
  cleanup.push(close);
  return close;
}

// ---------------------------------------------------------------- 밸런스 투표

const SYNC_TEXT = {
  pending: t('sync.pending'),
  saving: t('sync.saving'),
  saved: '',
  offline: t('sync.offline'),
};

function viewBalance(templateId) {
  const template = db.template(templateId);
  if (!template) return notFound();
  const catId = template.category.id;
  const VERDICTS = verdictsFor(catId);
  rememberBalanceTemplate(template);
  let mine = loadMine(catId);
  const filter = {};
  let syncText = '';

  const statusEl = h('span', { class: 'sync' });
  cleanup.push(onSyncStatus(s => { syncText = SYNC_TEXT[s] || ''; statusEl.textContent = syncText; statusEl.dataset.state = s; }));

  function rowsForTemplate() {
    return VERDICTS.map(v => ({
      label: v.label, sub: v.sub, color: v.color,
      items: mine[v.v].filter(id => template.byId.has(id)),
    }));
  }

  function move(id, to, index) {
    // 카테고리 단위로 저장하므로 다른 템플릿의 아이템 순서는 건드리지 않는다
    for (const v of VERDICTS) mine[v.v] = mine[v.v].filter(x => x !== id);
    if (to >= 0) {
      const key = VERDICTS[to].v;
      const visible = mine[key].filter(x => template.byId.has(x));
      const others = mine[key].filter(x => !template.byId.has(x));
      visible.splice(index == null ? visible.length : Math.min(index, visible.length), 0, id);
      mine[key] = [...others, ...visible];
    }
    // 옮기기만 해서는 투표되지 않는다. 이 기기에 임시 저장하고, '투표 완료'를 눌러야 제출된다.
    saveMine(catId, mine);
    const scrollY = window.scrollY;
    draw();
    window.scrollTo(0, scrollY);
  }

  function draw() {
    const rows = rowsForTemplate();
    const placed = new Set(rows.flatMap(r => r.items));
    const pool = template.items.filter(i => !placed.has(i.id)).map(i => i.id);
    const controls = poolControls(template, filter, () => applyFilter(poolEl, template, filter));
    const b = board({
      template, rows, pool: { items: pool, controls }, onMove: move, poolTitle: t('balance.pool'),
      onOpen: id => openDetail(template.byId.get(id), template.category, db),
    });
    const poolEl = b.querySelector('.pool');
    applyFilter(poolEl, template, filter);
    statusEl.textContent = syncText;

    const changes = unsubmittedChanges(catId, mine, template.items.map(i => i.id));
    const submitting = statusEl.dataset.state === 'saving';
    let submitBtn;
    if (changes.length) {
      submitBtn = h('button', { class: 'btn primary submit', disabled: submitting, onclick: submit }, t('balance.submitN', { n: changes.length }));
    } else if (placed.size) {
      submitBtn = h('button', { class: 'btn submit done', disabled: true }, t('balance.submitted'));
    } else {
      submitBtn = h('button', { class: 'btn submit', disabled: true }, t('balance.submit'));
    }
    const draftNote = changes.length
      ? h('span', { class: 'draft-note' }, t('balance.draftN', { n: changes.length }))
      : placed.size ? h('span', { class: 'draft-note ok' }, t('balance.same')) : null;

    render(
      boardHeader('balance', template),
      h('div', { class: 'board-head' },
        h('div', { class: 'board-title' },
          h('h1', { class: 'board-h1' }, `${template.title}`),
          h('div', { class: 'board-progress' },
            progressBar(placed.size, template.items.length),
            h('span', {}, t('balance.sorted', { n: placed.size, total: template.items.length })),
            draftNote,
            statusEl),
        ),
        h('div', { class: 'actions' },
          submitBtn,
          h('a', { class: 'btn', href: `#/balance/${template.id}/results` }, t('balance.results')),
          h('a', { class: 'btn ghost', href: '#/balance/mine' }, t('balance.mine')),
        ),
      ),
      usageHint('balance'),
      b,
    );
  }

  async function submit() {
    const changes = unsubmittedChanges(catId, mine, template.items.map(i => i.id));
    if (!changes.length) return;
    const ok = await submitChanges(catId, changes, id => template.byId.get(id).key);
    toast(ok ? t('balance.submittedN', { n: changes.length }) : t('sync.offline'));
    const scrollY = window.scrollY;
    draw();
    window.scrollTo(0, scrollY);
  }

  draw();
}

const SORTS = {
  nerf: { score: c => (c[0] + 1) / (sum(c) + 3) },
  buff: { score: c => (c[2] + 1) / (sum(c) + 3) },
  fair: { score: c => (c[1] + 1) / (sum(c) + 3) },
  split: { label: 'sort.split', score: c => Math.min(c[0], c[2]) / (sum(c) + 3) },
  votes: { label: 'sort.votes', score: c => sum(c) },
};
const sum = c => c[0] + c[1] + c[2];
const sortLabel = (k, verdicts) => {
  const i = { nerf: 0, fair: 1, buff: 2 }[k];
  return i == null ? t(SORTS[k].label) : t('sort.share', { v: verdicts[i].sub });
};
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// 결과를 나눠 보는 기준. 묶음 안에서 값이 두 가지 이상인 분류만 고를 수 있다.
const RESULT_FACETS = ['rarity', 'type', 'group', 'source'];
const RARITY_ORDER = ['basic', 'starter', 'common', 'uncommon', 'rare', 'shop', 'event', 'ancient', 'special', 'boss', 'curse', 'status'];
const TYPE_ORDER = ['attack', 'skill', 'power', 'status', 'curse', 'quest'];
const FACET_COLOR = {
  rarity: { basic: '#8d8a80', starter: '#8d8a80', common: '#a9a69c', uncommon: '#4f93cf', rare: '#e2b33f', shop: '#5fae6a', event: '#4fb3a4', ancient: '#a06ad0' },
  type: { attack: '#c8463c', skill: '#4a86c8', power: '#d0a040' },
};
const itemGroups = item => [...new Set([item.group, ...(item.groups || [])].filter(Boolean))];

function resultFacetName(cat, f) {
  if (f === 'group') return groupLabel(cat);
  return t(`facet.${f}`);
}

function resultFacets(template) {
  const cat = template.category;
  return RESULT_FACETS.filter(f => {
    const values = new Set(template.items.flatMap(i => (f === 'group' ? itemGroups(i) : i[f] ? [i[f]] : [])));
    return values.size > 1;
  });
}

// rows([{ item, c }])를 분류 값별 묶음으로. 순서는 게임 안 순서(희귀도·캐릭터·막 등)를 따른다.
function bucketRows(template, f, rows) {
  const cat = template.category;
  let keys;
  if (f === 'group') keys = cat.groups.map(g => ({ value: g.id, label: g.name, color: g.color }));
  else {
    const order = f === 'rarity' ? RARITY_ORDER : f === 'type' ? TYPE_ORDER : [];
    const values = [...new Set(template.items.map(i => i[f]).filter(Boolean))];
    const rank = v => (order.includes(v) ? order.indexOf(v) : order.length);
    if (f === 'source') values.sort((a, b) => template.items.findIndex(i => i[f] === a) - template.items.findIndex(i => i[f] === b));
    else values.sort((a, b) => rank(a) - rank(b));
    keys = values.map(v => ({ value: v, label: cat.labels?.[f]?.[v] || facetLabel(f, v), color: FACET_COLOR[f]?.[v] }));
  }
  const has = (item, v) => (f === 'group' ? itemGroups(item).includes(v) : item[f] === v);
  const buckets = keys.map(k => ({ ...k, rows: rows.filter(r => has(r.item, k.value)) }));
  const rest = rows.filter(r => !keys.some(k => has(r.item, k.value)));
  if (rest.length) buckets.push({ value: '', label: t('facet.other'), rows: rest });
  return buckets.filter(b => b.rows.length);
}

async function viewResults(templateId) {
  const template = db.template(templateId);
  if (!template) return notFound();
  const VERDICTS = verdictsFor(template.category.id);
  let sort = 'nerf';
  let layout = 'list';
  const facets = resultFacets(template);
  let facet = facets[0] || '';
  flush();

  render(h('section', { class: 'empty' }, h('p', {}, t('results.loading'))));
  let results;
  try {
    results = await fetchResults(template.category.id);
  } catch {
    render(h('section', { class: 'empty' },
      h('h2', {}, t('results.offline')),
      h('p', {}, t('results.offlineBody')),
      h('p', {}, h('a', { class: 'btn', href: `#/balance/${template.id}` }, t('results.back'))),
    ));
    return;
  }

  const rows = template.items.map(item => ({ item, c: results[item.key] || [0, 0, 0] }));
  const voted = rows.filter(r => sum(r.c) > 0);
  const totalVotes = voted.reduce((s, r) => s + sum(r.c), 0);
  const mine = loadSubmitted(template.category.id);
  const myInTemplate = template.items.filter(i => mine[i.id]).length;
  let onlyMine = false;

  function draw() {
    const shown = onlyMine ? voted.filter(r => mine[r.item.id]) : voted;
    const sorted = shown.slice().sort((a, b) => SORTS[sort].score(b.c) - SORTS[sort].score(a.c) || sum(b.c) - sum(a.c));
    const view = layout === 'list' ? listView : boardView;
    const buckets = facet ? bucketRows(template, facet, sorted) : null;
    const body = buckets
      ? buckets.map(b => h('section', { class: 'result-sec' },
        h('h2', { class: 'block-title', style: { '--accent': b.color || 'var(--gold)' } }, b.label,
          h('span', { class: 'my-sec-count' }, t('n.items', { n: b.rows.length }))),
        view(b.rows)))
      : view(sorted);
    render(
      boardHeader('balance', template),
      h('div', { class: 'board-head' },
        h('div', { class: 'board-title' },
          h('h1', { class: 'board-h1' }, `${template.title} · ${t('balance.results')}`),
          h('div', { class: 'board-progress' },
            h('span', {}, t('results.summary', { n: voted.length, votes: totalVotes })),
            myInTemplate > 0 && h('span', { class: 'my-count' }, t('results.mineN', { n: myInTemplate }))),
        ),
        h('div', { class: 'actions' },
          h('a', { class: 'btn', href: `#/balance/${template.id}` }, t('results.toMine')),
          myInTemplate > 0 && h('div', { class: 'seg', role: 'group', 'aria-label': t('results.scope') },
            h('button', { class: onlyMine ? null : 'on', onclick: () => { onlyMine = false; draw(); } }, t('filter.all')),
            h('button', { class: onlyMine ? 'on' : null, onclick: () => { onlyMine = true; draw(); } }, t('results.onlyMine')),
          ),
          facets.length > 0 && h('div', { class: 'seg', role: 'group', 'aria-label': t('results.splitBy') },
            facets.map(f => h('button', { class: facet === f ? 'on' : null, onclick: () => { facet = f; draw(); } }, t('results.byFacet', { facet: resultFacetName(template.category, f) }))),
            h('button', { class: facet ? null : 'on', onclick: () => { facet = ''; draw(); } }, t('results.noSplit')),
          ),
          h('div', { class: 'seg', role: 'group', 'aria-label': t('results.layout') },
            h('button', { class: layout === 'list' ? 'on' : null, onclick: () => { layout = 'list'; draw(); } }, t('results.list')),
            h('button', { class: layout === 'board' ? 'on' : null, onclick: () => { layout = 'board'; draw(); } }, t('results.board')),
          ),
          layout === 'list' && h('select', { 'aria-label': t('results.sort'), onchange: e => { sort = e.target.value; draw(); } },
            Object.entries(SORTS).map(([k, s]) => h('option', { value: k, selected: k === sort }, sortLabel(k, VERDICTS)))),
        ),
      ),
      voted.length ? body : h('section', { class: 'empty' },
        h('h2', {}, t('results.empty')),
        h('p', {}, t('results.emptyBody')),
        h('p', {}, h('a', { class: 'btn primary', href: `#/balance/${template.id}` }, t('results.goVote'))),
      ),
      voted.length && rows.length > voted.length && h('p', { class: 'help' }, t('results.hidden', { n: rows.length - voted.length })),
    );
  }

  function listView(sorted) {
    const list = h('ol', { class: 'result-list' }, sorted.map(({ item, c }) => {
      const total = sum(c);
      return h('li', {
        class: `result${total < 5 ? ' few' : ''}`, tabindex: '0', role: 'button', 'aria-label': t('detail.open', { name: item.name }),
        onclick: () => openDetail(item, template.category, db),
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item, template.category, db); } },
      },
        tile(item, template),
        h('div', { class: 'result-main' },
          h('div', { class: 'result-name' }, item.name,
            item.groupName && !template.group && facet !== 'group' && h('span', { class: 'result-group' }, item.groupName),
            myChip(VERDICTS, mine[item.id], c)),
          h('div', { class: 'bar', role: 'img', 'aria-label': VERDICTS.map((v, i) => `${v.sub} ${pct(c[i], total)}%`).join(', ') },
            VERDICTS.map((v, i) => c[i] > 0 && h('span', { class: `seg-${v.v}`, style: { flexGrow: c[i], background: v.color } },
              pct(c[i], total) >= 12 ? `${pct(c[i], total)}%` : '')),
          ),
          h('div', { class: 'result-legend' },
            VERDICTS.map((v, i) => h('span', {}, h('i', { style: { background: v.color } }), `${v.sub} ${pct(c[i], total)}%`)),
            h('span', { class: 'n' }, t('n.votes', { n: total })),
          ),
        ),
      );
    }));
    attachTooltips(list, id => template.byId.get(id));
    return list;
  }

  function boardView(sorted) {
    const groups = VERDICTS.map(() => []);
    const share = new Map();
    for (const { item, c } of sorted) {
      const total = sum(c);
      let best = 1;
      if (c[0] > c[best]) best = 0;
      if (c[2] > c[best] && c[2] > c[0]) best = 2;
      groups[best].push(item.id);
      share.set(item.id, pct(c[best], total));
    }
    // 줄 안에서는 그 판정 비율이 높은 순
    groups.forEach(g => g.sort((a, b) => share.get(b) - share.get(a)));
    return board({
      template, readonly: true,
      onOpen: id => openDetail(template.byId.get(id), template.category, db),
      rows: VERDICTS.map((v, i) => ({ label: v.label, sub: v.sub, color: v.color, items: groups[i] })),
      decorate: (el, item) => {
        el.append(h('span', { class: 'badge' }, `${share.get(item.id)}%`));
        const v = VERDICTS.find(x => x.v === mine[item.id]);
        if (v) el.append(h('span', { class: 'mine-dot', style: { background: v.color }, title: t('my.vote', { v: v.label }) }, t('my.dot')));
      },
    });
  }

  draw();
}

// ---------------------------------------------------------------- 내 투표

// 내 판정 표시. 결과(c)가 있으면 다수 의견과 같은지도 보여 준다.
function myChip(verdicts, v, c) {
  const mine = verdicts.find(x => x.v === v);
  if (!mine) return null;
  const idx = verdicts.indexOf(mine);
  let agree = null;
  if (c && sum(c) > 0) {
    const top = Math.max(...c);
    agree = c[idx] === top;
  }
  return h('span', { class: 'my-chip', style: { '--v': mine.color } },
    h('i', { 'aria-hidden': 'true' }),
    t('my.vote', { v: mine.label }),
    agree === true && h('em', { class: 'agree' }, `· ${t('my.agree')}`),
    agree === false && h('em', { class: 'differ' }, `· ${t('my.differ')}`),
  );
}

function myVoteCount() {
  return db.categories.reduce((n, cat) => n + Object.keys(loadSubmitted(cat.id)).filter(id => cat.byId.has(id)).length, 0);
}

async function viewMyVotes() {
  const cats = db.categories
    .map(cat => ({ cat, mine: loadSubmitted(cat.id) }))
    .map(x => ({ ...x, ids: Object.keys(x.mine).filter(id => x.cat.byId.has(id)) }))
    .filter(x => x.ids.length);
  const pending = db.categories.reduce((n, cat) =>
    n + unsubmittedChanges(cat.id, loadMine(cat.id), cat.items.map(i => i.id)).length, 0);

  if (!cats.length) {
    render(
      crumbs('balance', [t('balance.mine')]),
      h('section', { class: 'empty' },
        h('h2', {}, t('my.empty')),
        h('p', {}, t('my.emptyBody')),
        pending > 0 && h('p', { class: 'draft-note' }, t('my.pendingN', { n: pending })),
        h('p', {}, h('a', { class: 'btn primary', href: '#/balance' }, t('results.goVote'))),
      ),
    );
    return;
  }

  let filter = 'all';
  const results = new Map();
  await Promise.all(cats.map(async x => {
    try { results.set(x.cat.id, await fetchResults(x.cat.id)); } catch { /* 결과 없이 내 표만 보여 준다 */ }
  }));

  function draw() {
    let total = 0, agree = 0, compared = 0;
    const sections = cats.map(({ cat, mine, ids }) => {
      const VERDICTS = verdictsFor(cat.id);
      const res = results.get(cat.id);
      const order = { nerf: 0, fair: 1, buff: 2 };
      const list = ids
        .filter(id => filter === 'all' || mine[id] === filter)
        .map(id => cat.byId.get(id))
        .sort((a, b) => order[mine[a.id]] - order[mine[b.id]] || collator.compare(a.name, b.name));
      for (const item of list) {
        total++;
        const c = res?.[item.key];
        if (c && sum(c) > 0) {
          compared++;
          if (c[VERDICTS.findIndex(v => v.v === mine[item.id])] === Math.max(...c)) agree++;
        }
      }
      if (!list.length) return null;
      const templates = db.templates.filter(t => t.category.id === cat.id);
      const editHref = templates.length === 1 ? `#/balance/${templates[0].id}` : `#/balance/c/${cat.id}`;
      const pseudo = { tile: cat.tile, byId: cat.byId };
      return h('section', { class: 'block' },
        h('div', { class: 'my-sec-head' },
          h('h2', { class: 'block-title' }, cat.name, h('span', { class: 'my-sec-count' }, t('n.items', { n: list.length }))),
          h('a', { class: 'btn small', href: editHref }, t('my.edit')),
        ),
        h('ol', { class: 'result-list my-list' }, list.map(item => {
          const c = res?.[item.key];
          const n = c ? sum(c) : 0;
          return h('li', {
            class: 'result', tabindex: '0', role: 'button', 'aria-label': t('detail.open', { name: item.name }),
            onclick: () => openDetail(item, cat, db),
            onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item, cat, db); } },
          },
            tile(item, pseudo),
            h('div', { class: 'result-main' },
              h('div', { class: 'result-name' }, item.name,
                item.groupName && h('span', { class: 'result-group' }, item.groupName)),
              myChip(VERDICTS, mine[item.id], c),
              n > 0 ? h('div', { class: 'bar small', role: 'img', 'aria-label': VERDICTS.map((v, i) => `${v.sub} ${pct(c[i], n)}%`).join(', ') },
                VERDICTS.map((v, i) => c[i] > 0 && h('span', { style: { flexGrow: c[i], background: v.color } }, pct(c[i], n) >= 14 ? `${pct(c[i], n)}%` : '')))
                : h('div', { class: 'result-legend' }, res ? t('my.noOthers') : t('my.resultsFailed')),
              n > 0 && h('div', { class: 'result-legend' }, h('span', { class: 'n' }, t('my.allVotes', { n }))),
            ),
          );
        })),
      );
    });

    const VERDICTS = verdictsFor('');
    render(
      crumbs('balance', [t('balance.mine')]),
      h('header', { class: 'page-head' },
        h('h1', {}, t('balance.mine')),
        h('p', {}, t('my.lead')),
      ),
      h('div', { class: 'my-summary' },
        h('div', { class: 'my-stat' }, h('strong', {}, String(total)), h('span', {}, t('my.submitted'))),
        compared > 0 && h('div', { class: 'my-stat' }, h('strong', {}, `${pct(agree, compared)}%`), h('span', {}, t('my.agreeRate', { agree, compared }))),
        pending > 0 && h('div', { class: 'my-stat warn' }, h('strong', {}, String(pending)), h('span', {}, t('my.pending'))),
      ),
      h('div', { class: 'seg my-filter', role: 'group', 'aria-label': t('my.filterAria') },
        h('button', { class: filter === 'all' ? 'on' : null, onclick: () => { filter = 'all'; draw(); } }, t('filter.all')),
        VERDICTS.map(v => h('button', { class: filter === v.v ? 'on' : null, onclick: () => { filter = v.v; draw(); } }, v.label)),
      ),
      sections,
      h('p', { class: 'help' }, t('my.localOnly')),
    );
  }

  draw();
}

// ---------------------------------------------------------------- 시작

// 상단 오른쪽: 언어 선택 (로그인 버튼도 여기에 붙는다)
function langPicker() {
  return h('label', { class: 'lang-pick', title: 'Language' },
    h('span', { class: 'sr-only' }, 'Language'),
    h('span', { class: 'lang-icon', 'aria-hidden': 'true' }, '🌐'),
    h('select', { onchange: e => setLang(e.target.value) },
      LANGS.map(l => h('option', { value: l.code, selected: l.code === lang }, l.name))),
  );
}

async function start() {
  translateStatic();
  document.getElementById('topbar-right').append(...[community.topbar(ctx), langPicker()].flat().filter(Boolean));
  try {
    db = await loadData();
    await community.init(ctx);
  } catch (err) {
    console.error(err);
    render(h('section', { class: 'empty' },
      h('h2', {}, t('data.failed')),
      h('p', {}, t('data.failedBody')),
    ));
    return;
  }
  const v = document.getElementById('data-version');
  if (v && db.fetchedAt) v.textContent = t('data.version', { date: db.fetchedAt.slice(0, 10) });
  window.addEventListener('hashchange', route);
  route();
}

start();
