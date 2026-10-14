import { loadData } from './data.js';
import { h, toast, tile, hideTip, attachTooltips } from './ui.js';
import { board } from './ui.js';
import { poolControls, applyFilter } from './filters.js';
import {
  loadState, saveState, clearState, freshState, savedSummary, unranked, moveItem,
  encodeShare, decodeShare, PALETTE,
} from './tierlist.js';
import { renderPng } from './export.js';
import { openDetail, closeDetail } from './detail.js';
import { verdictsFor, loadMine, saveMine, unsubmittedChanges, submitChanges, onSyncStatus, fetchResults, flush } from './balance.js';

const app = document.getElementById('app');
let db = null;
let cleanup = [];

let lastPath = null;

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

  setNav(parts[0] === 'balance' ? 'balance' : 'tier');

  if (parts[0] === 'tier' && parts[1]) return viewTier(parts[1], params.get('s'));
  if (parts[0] === 'c' && parts[1]) return viewCategory('tier', parts[1]);
  if (parts[0] === 'balance' && parts[1] === 'c' && parts[2]) return viewCategory('balance', parts[2]);
  if (parts[0] === 'balance' && parts[1] && parts[2] === 'results') return viewResults(parts[1]);
  if (parts[0] === 'balance' && parts[1]) return viewBalance(parts[1]);
  return viewHome(parts[0] === 'balance' ? 'balance' : 'tier');
}

function setNav(active) {
  const nav = document.getElementById('topnav');
  nav.replaceChildren(
    h('a', { href: '#/', class: active === 'tier' ? 'active' : null }, '티어 메이커'),
    h('a', { href: '#/balance', class: active === 'balance' ? 'active' : null }, '밸런스 투표'),
  );
}

function render(...nodes) {
  // 조건부 조각(cond && h(...))이 false·undefined·0 이 되면 글자로 찍히지 않게 거른다.
  app.replaceChildren(...nodes.flat(Infinity).filter(n => n instanceof Node || (typeof n === 'string' && n)));
  app.focus({ preventScroll: true });
}

function notFound() {
  render(h('section', { class: 'empty' },
    h('h2', {}, '찾을 수 없는 템플릿입니다'),
    h('p', {}, h('a', { href: '#/' }, '처음으로 돌아가기')),
  ));
}

// ---------------------------------------------------------------- 홈

const CATEGORY_BLURB = {
  characters: '다섯 캐릭터 중 누가 가장 강할까요?',
  cards: '캐릭터별 공격 · 스킬 · 파워 카드',
  curses: '덱에 들어오면 가장 괴로운 저주는?',
  relics: '희귀도별 · 고대의 존재별 · 캐릭터 전용 유물',
  potions: '희귀도별 · 캐릭터 전용 포션',
  enchantments: '카드에 붙는 인챈트 효과',
  ancients: '막 시작마다 만나 축복을 주는 존재',
  monsters: '막별 일반 전투 상대',
  elites: '막별 엘리트 전투 상대',
  bosses: '막별 보스',
};

const MODES = {
  tier: {
    base: '#/',
    title: '티어 메이커',
    icon: '🏆',
    lead: '끌어다 놓아 나만의 티어 리스트를 만들고, 이미지로 저장하거나 링크로 공유하세요.',
    href: t => `#/tier/${t.id}`,
    cat: c => `#/c/${c.id}`,
  },
  balance: {
    base: '#/balance',
    title: '밸런스 투표',
    icon: '⚖️',
    lead: '사기인지, 적당한지, 약한지 골라 주세요. 모두의 표가 모여 비율로 보입니다.',
    href: t => `#/balance/${t.id}`,
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
  return h('div', { class: 'pbar', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-label': `${done}/${total} 완료` },
    h('span', { style: { width: `${pct}%` } }));
}

function crumbs(mode, ...items) {
  const m = MODES[mode];
  return h('nav', { class: 'crumbs', 'aria-label': '경로' },
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
    return h('a', { class: 'cat-card', href },
      thumbs(cat.items, cat.tile, 4),
      h('div', { class: 'cat-card-body' },
        h('h3', {}, cat.name),
        h('p', {}, CATEGORY_BLURB[cat.id] || ''),
        h('div', { class: 'cat-card-meta' },
          h('span', {}, `${cat.items.length}개`),
          templates.length > 1 && h('span', {}, `묶음 ${templates.length}개`),
          counts.submit > 0 && h('span', { class: 'badge-submit' }, `제출 필요 ${counts.submit}`),
          counts.progress > 0 && h('span', { class: 'badge-on' }, `진행 중 ${counts.progress}`),
          counts.done > 0 && h('span', { class: 'badge-done' }, `✓ 완료 ${counts.done}`),
        ),
      ),
    );
  });

  render(
    h('section', { class: 'hero' },
      h('p', { class: 'eyebrow' }, 'Slay the Spire 2 · 비공식 팬 사이트'),
      h('h1', {}, '첨탑의 티어 메이커'),
      modeSwitch(mode),
    ),
    started.length > 0 && h('section', { class: 'block' },
      h('h2', { class: 'block-title' }, '이어서 하기'),
      h('div', { class: 'tpl-grid' }, started.map(({ t, s }) => templateCard(mode, t, s, true))),
    ),
    h('section', { class: 'block' },
      h('h2', { class: 'block-title' }, mode === 'tier' ? '무엇의 티어를 매길까요?' : '무엇에 투표할까요?'),
      h('div', { class: 'cat-grid' }, catCards),
    ),
  );
}

function templateCard(mode, t, summary = summaryFor(mode, t), showCategory = false) {
  const m = MODES[mode];
  const status = templateStatus(t, summary);
  const meta = {
    null: `${t.items.length}개`,
    progress: `${summary?.placed} / ${t.items.length}`,
    submit: `${summary?.placed} / ${t.items.length} · 제출 필요`,
    done: mode === 'tier' ? `✓ 완료 · ${t.items.length}개` : `✓ 제출 완료 · ${t.items.length}개`,
  }[status];
  return h('a', { class: `tpl-card${status ? ` is-${status}` : ''}`, href: m.href(t), style: t.group?.color ? { '--accent': t.group.color } : null },
    thumbs(t.items, t.tile, 4),
    h('div', { class: 'tpl-card-body' },
      h('strong', {}, showCategory ? t.title : (t.parts.length ? t.label : '전체')),
      h('span', { class: 'tpl-card-meta' }, meta),
      (status === 'progress' || status === 'submit') && progressBar(summary.placed, t.items.length),
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
    if (sec === 'all') return '한 번에 전부';
    if (sec === 'rarity') return '희귀도별';
    if (sec === 'type') return '종류별';
    if (sec === 'group') return `${cat.groupLabel || '캐릭터'} 전용`;
    return cat.groups.find(g => g.id === sec)?.name || sec;
  };
  const color = sec => cat.groups.find(g => g.id === sec)?.color;

  render(
    crumbs(mode, [cat.name]),
    h('header', { class: 'page-head' },
      h('h1', {}, cat.name),
      h('p', {}, CATEGORY_BLURB[cat.id] || '', ` · 모두 ${cat.items.length}개를 묶음 ${templates.length}개로 나눴습니다. 하나를 골라 시작하세요.`),
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
    ? [[cat.name, MODES[mode].cat(cat)], [template.parts.map(p => p.label).join(' · ') || '전체']]
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
      h('strong', {}, '사용법 '),
      '항목을 원하는 줄로 끌어다 놓으세요. 모바일에서는 항목을 탭한 뒤 놓을 줄을 탭하면 됩니다. ',
      '항목을 더블클릭(모바일은 탭 후 "자세히")하면 효과와 강화 정보를 볼 수 있습니다.',
      mode === 'balance' ? ' 옮긴 내용은 이 기기에 임시 저장되고, "투표 완료"를 눌러야 모두의 결과에 반영됩니다.' : ''),
    h('button', { class: 'btn ghost small', onclick: () => { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* 무시 */ } el.remove(); } }, '알겠어요'),
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
    if (!shared) { toast('공유 링크를 읽지 못했습니다'); location.hash = `#/tier/${templateId}`; return; }
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
      class: 'title-input', value: state.title, maxlength: '80', 'aria-label': '티어 리스트 제목',
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
            h('span', {}, `${placed} / ${template.items.length} 배치`)),
        ),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => savePng(template, state) }, '이미지 저장'),
          h('button', { class: 'btn', onclick: () => share(template, state) }, '링크 공유'),
          h('button', { class: 'btn ghost', onclick: reset }, '초기화'),
        ),
      ),
      usageHint('tier'),
      template.category.enemy && h('p', { class: 'help' }, '위협도 기준입니다. S가 가장 위협적인(어려운) 상대입니다.'),
      b,
    );
  }

  function reset() {
    if (!confirm('이 템플릿의 배치와 티어 설정을 모두 지울까요?')) return;
    clearState(template);
    state = freshState(template);
    draw();
  }

  function rowMenu(ri, anchor) {
    const tier = state.tiers[ri];
    const input = h('input', { value: tier.label, maxlength: '40', 'aria-label': '줄 이름' });
    const close = popover(anchor, h('div', { class: 'row-menu' },
      h('label', { class: 'field' }, h('span', {}, '이름'), input),
      h('div', { class: 'swatches', role: 'group', 'aria-label': '색상' }, PALETTE.map(c => h('button', {
        class: `swatch${c === tier.color ? ' on' : ''}`, style: { background: c }, 'aria-label': c,
        onclick: () => { tier.color = c; close(); commit(); },
      }))),
      h('div', { class: 'menu-actions' },
        h('button', { class: 'btn small', onclick: () => { state.tiers.splice(ri, 0, { label: '새 줄', color: PALETTE[9], items: [] }); close(); commit(); } }, '위에 줄 추가'),
        h('button', { class: 'btn small', onclick: () => { state.tiers.splice(ri + 1, 0, { label: '새 줄', color: PALETTE[9], items: [] }); close(); commit(); } }, '아래에 줄 추가'),
        ri > 0 && h('button', { class: 'btn small', onclick: () => { [state.tiers[ri - 1], state.tiers[ri]] = [state.tiers[ri], state.tiers[ri - 1]]; close(); commit(); } }, '위로'),
        ri < state.tiers.length - 1 && h('button', { class: 'btn small', onclick: () => { [state.tiers[ri + 1], state.tiers[ri]] = [state.tiers[ri], state.tiers[ri + 1]]; close(); commit(); } }, '아래로'),
        h('button', { class: 'btn small', onclick: () => { tier.items = []; close(); commit(); } }, '비우기'),
        state.tiers.length > 1 && h('button', { class: 'btn small danger', onclick: () => { state.tiers.splice(ri, 1); close(); commit(); } }, '줄 삭제'),
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
      h('p', {}, '공유받은 티어 리스트를 보고 있습니다. 항목을 누르면 자세히 볼 수 있습니다.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => savePng(template, shared) }, '이미지 저장'),
        h('button', { class: 'btn primary', onclick: () => {
          if (savedSummary(template) && !confirm('내 티어 리스트를 이 내용으로 덮어쓸까요?')) return;
          saveState(template, shared);
          location.hash = `#/tier/${template.id}`;
        } }, '내 티어 리스트로 가져오기'),
        h('a', { class: 'btn ghost', href: `#/tier/${template.id}` }, '내 것 보기'),
      ),
    ),
    h('h1', { class: 'shared-title' }, shared.title),
    b,
  );
}

async function savePng(template, state) {
  toast('이미지를 만드는 중…');
  try {
    const blob = await renderPng(template, state);
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `${state.title.replace(/[\\/:*?"<>|]/g, '_')}.png` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast('이미지를 저장했습니다');
  } catch (err) {
    console.error(err);
    toast('이미지를 만들지 못했습니다');
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
    toast('공유 링크를 복사했습니다');
  } catch {
    prompt('아래 링크를 복사하세요', url);
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
  pending: '제출 대기 중',
  saving: '제출 중…',
  saved: '',
  offline: '서버에 연결하지 못했습니다. 이 기기에 보관해 두고 자동으로 다시 보냅니다.',
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
      template, rows, pool: { items: pool, controls }, onMove: move, poolTitle: '아직 분류하지 않은 항목',
      onOpen: id => openDetail(template.byId.get(id), template.category, db),
    });
    const poolEl = b.querySelector('.pool');
    applyFilter(poolEl, template, filter);
    statusEl.textContent = syncText;

    const changes = unsubmittedChanges(catId, mine, template.items.map(i => i.id));
    const submitting = statusEl.dataset.state === 'saving';
    let submitBtn;
    if (changes.length) {
      submitBtn = h('button', { class: 'btn primary submit', disabled: submitting, onclick: submit }, `투표 완료 · 변경 ${changes.length}개 제출`);
    } else if (placed.size) {
      submitBtn = h('button', { class: 'btn submit done', disabled: true }, '✓ 투표 완료됨');
    } else {
      submitBtn = h('button', { class: 'btn submit', disabled: true }, '투표 완료');
    }
    const draftNote = changes.length
      ? h('span', { class: 'draft-note' }, `임시 저장됨 · 아직 제출하지 않은 변경 ${changes.length}개`)
      : placed.size ? h('span', { class: 'draft-note ok' }, '제출한 표와 같습니다') : null;

    render(
      boardHeader('balance', template),
      h('div', { class: 'board-head' },
        h('div', { class: 'board-title' },
          h('h1', { class: 'board-h1' }, `${template.title}`),
          h('div', { class: 'board-progress' },
            progressBar(placed.size, template.items.length),
            h('span', {}, `${placed.size} / ${template.items.length} 분류`),
            draftNote,
            statusEl),
        ),
        h('div', { class: 'actions' },
          submitBtn,
          h('a', { class: 'btn', href: `#/balance/${template.id}/results` }, '모두의 결과'),
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
    toast(ok ? `투표 ${changes.length}개를 제출했습니다` : '서버에 연결하지 못했습니다. 이 기기에 보관해 두고 자동으로 다시 보냅니다.');
    const scrollY = window.scrollY;
    draw();
    window.scrollTo(0, scrollY);
  }

  draw();
}

const SORTS = {
  nerf: { label: '사기 비율 높은 순', score: c => (c[0] + 1) / (sum(c) + 3) },
  buff: { label: '약함 비율 높은 순', score: c => (c[2] + 1) / (sum(c) + 3) },
  fair: { label: '적당함 비율 높은 순', score: c => (c[1] + 1) / (sum(c) + 3) },
  split: { label: '의견이 갈리는 순', score: c => Math.min(c[0], c[2]) / (sum(c) + 3) },
  votes: { label: '표가 많은 순', score: c => sum(c) },
};
const sum = c => c[0] + c[1] + c[2];
const sortLabel = (k, verdicts) => {
  const i = { nerf: 0, fair: 1, buff: 2 }[k];
  return i == null ? SORTS[k].label : `${verdicts[i].sub} 비율 높은 순`;
};
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

async function viewResults(templateId) {
  const template = db.template(templateId);
  if (!template) return notFound();
  const VERDICTS = verdictsFor(template.category.id);
  let sort = 'nerf';
  let layout = 'list';
  flush();

  render(h('section', { class: 'empty' }, h('p', {}, '결과를 불러오는 중…')));
  let results;
  try {
    results = await fetchResults(template.category.id);
  } catch {
    render(h('section', { class: 'empty' },
      h('h2', {}, '결과 서버에 연결하지 못했습니다'),
      h('p', {}, '잠시 후 다시 시도해 주세요. 투표는 이 기기에 보관되어 있다가 연결되면 전송됩니다.'),
      h('p', {}, h('a', { class: 'btn', href: `#/balance/${template.id}` }, '투표로 돌아가기')),
    ));
    return;
  }

  const rows = template.items.map(item => ({ item, c: results[item.key] || [0, 0, 0] }));
  const voted = rows.filter(r => sum(r.c) > 0);
  const totalVotes = voted.reduce((s, r) => s + sum(r.c), 0);

  function draw() {
    const sorted = voted.slice().sort((a, b) => SORTS[sort].score(b.c) - SORTS[sort].score(a.c) || sum(b.c) - sum(a.c));
    const body = layout === 'list' ? listView(sorted) : boardView(sorted);
    render(
      boardHeader('balance', template),
      h('div', { class: 'board-head' },
        h('div', { class: 'board-title' },
          h('h1', { class: 'board-h1' }, `${template.title} · 모두의 결과`),
          h('div', { class: 'board-progress' }, h('span', {}, `${voted.length}개 항목 · 총 ${totalVotes}표`)),
        ),
        h('div', { class: 'actions' },
          h('a', { class: 'btn', href: `#/balance/${template.id}` }, '내 투표로'),
          h('div', { class: 'seg', role: 'group', 'aria-label': '보기 방식' },
            h('button', { class: layout === 'list' ? 'on' : null, onclick: () => { layout = 'list'; draw(); } }, '목록'),
            h('button', { class: layout === 'board' ? 'on' : null, onclick: () => { layout = 'board'; draw(); } }, '보드'),
          ),
          layout === 'list' && h('select', { 'aria-label': '정렬', onchange: e => { sort = e.target.value; draw(); } },
            Object.entries(SORTS).map(([k, s]) => h('option', { value: k, selected: k === sort }, sortLabel(k, VERDICTS)))),
        ),
      ),
      voted.length ? body : h('section', { class: 'empty' },
        h('h2', {}, '아직 표가 없습니다'),
        h('p', {}, '첫 투표를 남겨 주세요.'),
        h('p', {}, h('a', { class: 'btn primary', href: `#/balance/${template.id}` }, '투표하러 가기')),
      ),
      voted.length && rows.length > voted.length && h('p', { class: 'help' }, `아직 표가 없는 항목 ${rows.length - voted.length}개는 표시하지 않았습니다.`),
    );
  }

  function listView(sorted) {
    const list = h('ol', { class: 'result-list' }, sorted.map(({ item, c }) => {
      const total = sum(c);
      return h('li', {
        class: `result${total < 5 ? ' few' : ''}`, tabindex: '0', role: 'button', 'aria-label': `${item.name} 자세히`,
        onclick: () => openDetail(item, template.category, db),
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item, template.category, db); } },
      },
        tile(item, template),
        h('div', { class: 'result-main' },
          h('div', { class: 'result-name' }, item.name,
            item.groupName && !template.group && h('span', { class: 'result-group' }, item.groupName)),
          h('div', { class: 'bar', role: 'img', 'aria-label': VERDICTS.map((v, i) => `${v.sub} ${pct(c[i], total)}%`).join(', ') },
            VERDICTS.map((v, i) => c[i] > 0 && h('span', { class: `seg-${v.v}`, style: { flexGrow: c[i], background: v.color } },
              pct(c[i], total) >= 12 ? `${pct(c[i], total)}%` : '')),
          ),
          h('div', { class: 'result-legend' },
            VERDICTS.map((v, i) => h('span', {}, h('i', { style: { background: v.color } }), `${v.sub} ${pct(c[i], total)}%`)),
            h('span', { class: 'n' }, `${total}표`),
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
      decorate: (el, item) => el.append(h('span', { class: 'badge' }, `${share.get(item.id)}%`)),
    });
  }

  draw();
}

// ---------------------------------------------------------------- 시작

async function start() {
  try {
    db = await loadData();
  } catch (err) {
    console.error(err);
    render(h('section', { class: 'empty' },
      h('h2', {}, '게임 데이터를 불러오지 못했습니다'),
      h('p', {}, '잠시 후 새로고침해 주세요.'),
    ));
    return;
  }
  const v = document.getElementById('data-version');
  if (v && db.fetchedAt) v.textContent = `데이터 수집 ${db.fetchedAt.slice(0, 10)}`;
  window.addEventListener('hashchange', route);
  route();
}

start();
