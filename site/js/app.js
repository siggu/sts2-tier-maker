import { loadData } from './data.js';
import { h, toast, tile, hideTip, attachTooltips } from './ui.js';
import { board } from './ui.js';
import { poolControls, applyFilter } from './filters.js';
import {
  loadState, saveState, clearState, freshState, savedSummary, unranked, moveItem,
  encodeShare, decodeShare, PALETTE,
} from './tierlist.js';
import { renderPng } from './export.js';
import { VERDICTS, loadMine, saveMine, queueVote, onSyncStatus, fetchResults, flush } from './balance.js';

const app = document.getElementById('app');
let db = null;
let cleanup = [];

function route() {
  cleanup.forEach(fn => fn());
  cleanup = [];
  hideTip();
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);

  setNav(parts[0] === 'balance' ? 'balance' : 'tier');

  if (parts[0] === 'tier' && parts[1]) return viewTier(parts[1], params.get('s'));
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
  app.replaceChildren(...nodes);
  app.focus({ preventScroll: true });
}

function notFound() {
  render(h('section', { class: 'empty' },
    h('h2', {}, '찾을 수 없는 템플릿입니다'),
    h('p', {}, h('a', { href: '#/' }, '처음으로 돌아가기')),
  ));
}

// ---------------------------------------------------------------- 홈

function viewHome(mode) {
  const isTier = mode === 'tier';
  const hero = h('section', { class: 'hero' },
    h('p', { class: 'eyebrow' }, 'Slay the Spire 2 · 비공식 팬 사이트'),
    h('h1', {}, isTier ? '첨탑의 티어 메이커' : '첨탑의 밸런스 투표'),
    h('p', { class: 'lead' }, isTier
      ? '캐릭터, 보스, 카드, 유물, 포션을 끌어다 놓아 나만의 티어 리스트를 만드세요. 이미지로 저장하거나 링크로 공유할 수 있습니다.'
      : '각 요소를 너프 필요 · 적당함 · 버프 필요 중 하나로 분류하세요. 모두의 표가 모여 무엇이 사기이고 무엇이 약한지 비율로 보여 줍니다.'),
  );

  const sections = db.categories.map(cat => {
    const templates = db.templates.filter(t => t.category.id === cat.id);
    const preview = cat.items.filter(i => i.img).slice(0, 6);

    const chip = t => {
      const summary = isTier ? savedSummary(t) : balanceSummary(t);
      const color = t.group?.color;
      return h('a', {
        class: `tpl${summary ? ' started' : ''}`,
        href: isTier ? `#/tier/${t.id}` : `#/balance/${t.id}`,
        style: color ? { '--accent': color } : null,
        title: t.title,
      },
        h('span', { class: 'tpl-name' }, t.parts.length && t.section === t.group?.value && t.parts.length === 1 ? '전체' : t.label),
        h('span', { class: 'tpl-meta' }, summary ? `${summary.placed}/${t.items.length}` : t.items.length),
      );
    };

    // section 별로 줄을 나눈다: 'all', 그룹 id(카드), 'rarity', 'type', 'group'
    const sectionOrder = [];
    const bySection = new Map();
    for (const t of templates) {
      if (!bySection.has(t.section)) { bySection.set(t.section, []); sectionOrder.push(t.section); }
      bySection.get(t.section).push(t);
    }
    const sectionLabel = sec => {
      if (sec === 'all') return null;
      if (sec === 'rarity') return '희귀도별';
      if (sec === 'type') return '종류별';
      if (sec === 'group') return `${cat.groupLabel || '캐릭터'}별`;
      return cat.groups.find(g => g.id === sec)?.name || sec;
    };
    const sectionColor = sec => cat.groups.find(g => g.id === sec)?.color;

    const rows = sectionOrder.map(sec => {
      const label = sectionLabel(sec);
      return h('div', { class: 'tpl-row' },
        label && h('span', { class: 'tpl-row-label', style: sectionColor(sec) ? { '--accent': sectionColor(sec) } : null }, label),
        h('div', { class: 'tpl-list' }, bySection.get(sec).map(chip)),
      );
    });

    return h('section', { class: `cat${templates.length > 8 ? ' wide' : ''}` },
      h('div', { class: 'cat-head' },
        h('div', { class: `cat-preview tile-${cat.tile}` }, preview.map(i => h('img', { src: i.img, alt: '', loading: 'lazy' }))),
        h('div', {},
          h('h2', {}, cat.name),
          h('p', { class: 'muted' }, `${cat.items.length}개`, templates.length > 1 ? ` · 묶음 ${templates.length}개` : ''),
        ),
      ),
      h('div', { class: 'tpl-rows' }, rows),
    );
  });

  render(hero, h('div', { class: 'cats' }, sections));
}

function balanceSummary(template) {
  const mine = loadMine(template.category.id);
  const placed = Object.values(mine).flat().filter(id => template.byId.has(id)).length;
  return placed ? { placed } : null;
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
    });
    const poolEl = b.querySelector('.pool');
    applyFilter(poolEl, template, filter);

    const title = h('input', {
      class: 'title-input', value: state.title, maxlength: '80', 'aria-label': '티어 리스트 제목',
      onchange: e => { state.title = e.target.value.trim() || freshState(template).title; saveState(template, state); },
    });

    const placed = template.items.length - pool.length;
    render(
      h('div', { class: 'toolbar' },
        h('a', { class: 'back', href: '#/' }, '← 템플릿'),
        title,
        h('div', { class: 'actions' },
          h('span', { class: 'progress' }, `${placed} / ${template.items.length}`),
          h('button', { class: 'btn', onclick: () => savePng(template, state) }, '이미지 저장'),
          h('button', { class: 'btn', onclick: () => share(template, state) }, '링크 공유'),
          h('button', { class: 'btn ghost', onclick: reset }, '초기화'),
        ),
      ),
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
  const b = board({ template, rows: shared.tiers, readonly: true });
  render(
    h('div', { class: 'banner' },
      h('p', {}, '공유받은 티어 리스트를 보고 있습니다.'),
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
  pending: '저장 대기 중',
  saving: '저장 중…',
  saved: '모두 저장됨',
  offline: '서버에 연결하지 못해 이 기기에 보관 중 (자동 재시도)',
};

function viewBalance(templateId) {
  const template = db.template(templateId);
  if (!template) return notFound();
  const catId = template.category.id;
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
    const item = template.byId.get(id);
    // 카테고리 단위로 저장하므로 다른 템플릿의 아이템 순서는 건드리지 않는다
    for (const v of VERDICTS) mine[v.v] = mine[v.v].filter(x => x !== id);
    if (to >= 0) {
      const key = VERDICTS[to].v;
      const visible = mine[key].filter(x => template.byId.has(x));
      const others = mine[key].filter(x => !template.byId.has(x));
      visible.splice(index == null ? visible.length : Math.min(index, visible.length), 0, id);
      mine[key] = [...others, ...visible];
    }
    saveMine(catId, mine);
    queueVote(item.key, to >= 0 ? VERDICTS[to].v : null);
    const scrollY = window.scrollY;
    draw();
    window.scrollTo(0, scrollY);
  }

  function draw() {
    const rows = rowsForTemplate();
    const placed = new Set(rows.flatMap(r => r.items));
    const pool = template.items.filter(i => !placed.has(i.id)).map(i => i.id);
    const controls = poolControls(template, filter, () => applyFilter(poolEl, template, filter));
    const b = board({ template, rows, pool: { items: pool, controls }, onMove: move, poolTitle: '아직 투표하지 않은 항목' });
    const poolEl = b.querySelector('.pool');
    applyFilter(poolEl, template, filter);
    statusEl.textContent = syncText;

    render(
      h('div', { class: 'toolbar' },
        h('a', { class: 'back', href: '#/balance' }, '← 템플릿'),
        h('h1', { class: 'toolbar-title' }, `${template.title} 밸런스 투표`),
        h('div', { class: 'actions' },
          statusEl,
          h('span', { class: 'progress' }, `${placed.size} / ${template.items.length}`),
          h('a', { class: 'btn primary', href: `#/balance/${template.id}/results` }, '결과 보기'),
        ),
      ),
      h('p', { class: 'help' }, '아는 것만 골라 끌어다 놓으면 됩니다. 놓는 즉시 투표되고, 다른 줄로 옮기거나 아래로 빼면 표가 바뀌거나 취소됩니다.'),
      b,
    );
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
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

async function viewResults(templateId) {
  const template = db.template(templateId);
  if (!template) return notFound();
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
      h('div', { class: 'toolbar' },
        h('a', { class: 'back', href: `#/balance/${template.id}` }, '← 투표'),
        h('h1', { class: 'toolbar-title' }, `${template.title} 밸런스 결과`),
        h('div', { class: 'actions' },
          h('span', { class: 'progress' }, `${voted.length}개 항목 · ${totalVotes}표`),
          h('div', { class: 'seg', role: 'group', 'aria-label': '보기 방식' },
            h('button', { class: layout === 'list' ? 'on' : null, onclick: () => { layout = 'list'; draw(); } }, '목록'),
            h('button', { class: layout === 'board' ? 'on' : null, onclick: () => { layout = 'board'; draw(); } }, '보드'),
          ),
          layout === 'list' && h('select', { 'aria-label': '정렬', onchange: e => { sort = e.target.value; draw(); } },
            Object.entries(SORTS).map(([k, s]) => h('option', { value: k, selected: k === sort }, s.label))),
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
      return h('li', { class: `result${total < 5 ? ' few' : ''}` },
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
