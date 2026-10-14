// 모두의 티어표(공개·동기화된 티어표 합산)와 A vs B 대결.
// app.js 가 route / navLinks / homeBlocks / tierActions 를 부른다.

import { h, toast, tile, board, attachTooltips, itemDetails, hideTip } from './ui.js';
import { t } from './i18n.js';
import { openDetail } from './detail.js';
import { API_BASE, voterId } from './balance.js';
import { authHeaders, currentUser } from './auth.js';
import { loadState, DEFAULT_TIERS } from './tierlist.js';
import { renderPng } from './export.js';

// ---------------------------------------------------------------- 공용

function store(kind) {
  try { return kind === 'session' ? sessionStorage : localStorage; } catch { return null; }
}
function read(key, fallback, kind) {
  try { return JSON.parse(store(kind)?.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value, kind) {
  try { store(kind)?.setItem(key, JSON.stringify(value)); } catch { /* 저장소 없음 */ }
}

async function getJson(path, signal) {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// 한 아이템이 여러 그룹에 속할 수 있다 (예: 2막과 3막에 모두 나오는 고대의 존재).
const inGroup = (item, gid) => item.group === gid || (item.groups || []).includes(gid);
const firstChar = s => Array.from(String(s || '?'))[0] || '?';

export function route(parts, params, ctx) {
  if (parts[0] === 'tier' && parts[1] && parts[2] === 'all') { viewAggregate(parts[1], ctx); return true; }
  if (parts[0] === 'versus') {
    if (parts[1]) viewVersus(parts[1], params, ctx);
    else viewVersusHome(ctx);
    return true;
  }
  return false;
}

export function navLinks(parts) {
  return [h('a', { href: '#/versus', class: parts[0] === 'versus' ? 'active' : null }, t('vs.nav'))];
}

export function homeBlocks(mode) {
  if (mode !== 'tier') return [];
  return [h('section', { class: 'block vs-promo-wrap' },
    h('a', { class: 'vs-promo', href: '#/versus' },
      h('span', { class: 'vs-promo-icon', 'aria-hidden': 'true' }, '⚔️'),
      h('span', { class: 'vs-promo-text' },
        h('strong', {}, t('vs.promo.title')),
        h('span', {}, t('vs.promo.body'))),
      h('span', { class: 'btn small vs-promo-go' }, t('vs.promo.go'), h('span', { 'aria-hidden': 'true' }, '›')),
    ),
  )];
}

export function tierActions(template) {
  return h('a', { class: 'btn', href: `#/tier/${template.id}/all`, title: t('agg.buttonTitle') }, t('agg.button'));
}

// ---------------------------------------------------------------- 모두의 티어표

// 점수 → 줄. 서버는 한 티어표에서 i번째 줄(k줄 중)을 1 − i/(k−1) 점으로 바꿔 평균 낸다.
// 기본 S–F 6줄 티어표라면 S=1, A=.8, B=.6, C=.4, D=.2, F=0 이므로, 평균이 가장 가까운 줄에 놓는다
// (= 0–1 을 폭 0.2 의 같은 칸으로 나눔: S ≥ .9, A ≥ .7, B ≥ .5, C ≥ .3, D ≥ .1, 나머지 F).
// 분위수로 자르면 아무도 S 로 안 본 항목도 억지로 S 가 되므로, '모두 A 에 둔 항목은 A' 가 되는 고정 칸을 쓴다.
// 평균은 가운데로 몰리는 편이라 S·F 는 드물다 — 의견이 갈린다는 뜻이기도 하다.
const AGG_TIERS = DEFAULT_TIERS;
const tierOf = score => Math.min(AGG_TIERS.length - 1, Math.max(0, Math.round((1 - score) * (AGG_TIERS.length - 1) - 1e-9)));
const FEW = 3; // 이보다 적은 티어표에만 오른 항목은 흐리게
const BADGE_KEY = 'sts2agg.badge';

async function viewAggregate(templateId, ctx) {
  const db = ctx.db;
  const template = db.template(templateId);
  if (!template) return ctx.notFound();
  const cat = template.category;
  const ac = new AbortController();
  ctx.addCleanup(() => ac.abort());

  const multi = db.templates.filter(x => x.category.id === cat.id).length > 1;
  const crumbs = () => ctx.crumbs('tier',
    ...(multi
      ? [[cat.name, `#/c/${cat.id}`], [template.parts.map(p => p.label).join(' · ') || t('tpl.all'), `#/tier/${template.id}`]]
      : [[cat.name, `#/tier/${template.id}`]]),
    [t('agg.title')]);

  ctx.render(crumbs(), h('section', { class: 'empty' }, h('p', {}, t('agg.loading'))));

  let data;
  try {
    data = await getJson(`/tiers/aggregate?template=${encodeURIComponent(template.id)}`, ac.signal);
  } catch {
    if (ac.signal.aborted) return;
    ctx.render(crumbs(), h('section', { class: 'empty' },
      h('h2', {}, t('agg.offline')),
      h('p', {}, t('agg.offlineBody')),
      h('p', { class: 'actions agg-empty-actions' },
        h('button', { class: 'btn primary', onclick: () => ctx.rerender() }, t('agg.retry')),
        h('a', { class: 'btn ghost', href: `#/tier/${template.id}` }, t('agg.myList'))),
    ));
    return;
  }
  if (ac.signal.aborted) return;

  const count = Number(data?.count) || 0;
  const agg = new Map();
  for (const [id, v] of Object.entries(data?.items || {})) {
    if (!template.byId.has(id) || !v || !(Number(v.n) > 0)) continue;
    agg.set(id, { score: Math.min(1, Math.max(0, Number(v.score) || 0)), n: Number(v.n) });
  }

  if (!count || !agg.size) {
    ctx.render(crumbs(), h('section', { class: 'empty' },
      h('h2', {}, t('agg.empty')),
      h('p', {}, t('agg.emptyBody')),
      h('p', {}, h('a', { class: 'btn primary', href: `#/tier/${template.id}` }, t('agg.make'))),
    ));
    return;
  }

  // 줄마다 점수 높은 순, 같으면 티어표 수가 많은 순
  const rows = AGG_TIERS.map(x => ({ label: x.label, color: x.color, items: [] }));
  const ranked = [...agg.entries()].sort((a, b) => b[1].score - a[1].score || b[1].n - a[1].n);
  for (const [id, v] of ranked) rows[tierOf(v.score)].items.push(id);
  const unplaced = template.items.filter(i => !agg.has(i.id)).map(i => i.id);

  // 내 티어표에서의 자리
  const mine = new Map();
  for (const tier of loadState(template).tiers) for (const id of tier.items) mine.set(id, tier);
  let badge = read(BADGE_KEY, 'score') === 'n' ? 'n' : 'score';

  function draw() {
    const b = board({
      template, rows, readonly: true,
      pool: unplaced.length ? { items: unplaced } : null,
      poolTitle: t('agg.unplaced'),
      onOpen: id => openDetail(template.byId.get(id), cat, db),
      decorate: (el, item) => {
        const v = agg.get(item.id);
        if (v) {
          const score = Math.round(v.score * 100);
          el.setAttribute('aria-label', t('agg.tileAria', { name: item.name, score, n: v.n }));
          el.append(h('span', { class: `badge agg-badge${badge === 'n' ? ' is-n' : ''}` }, badge === 'n' ? `×${v.n}` : String(score)));
          if (v.n < FEW) el.classList.add('agg-few');
        }
        const my = mine.get(item.id);
        if (my) el.append(h('span', { class: 'mine-dot', style: { background: my.color }, title: t('agg.mine', { label: my.label }) }, firstChar(my.label)));
      },
    });

    const scrollY = window.scrollY;
    ctx.render(
      crumbs(),
      h('div', { class: 'board-head' },
        h('div', { class: 'board-title' },
          h('h1', { class: 'board-h1' }, `${template.title} · ${t('agg.title')}`),
          h('div', { class: 'board-progress' },
            h('span', { class: 'agg-count' }, t('agg.count', { n: count })),
            h('span', {}, t('agg.placed', { n: agg.size, total: template.items.length }))),
        ),
        h('div', { class: 'actions' },
          h('a', { class: 'btn primary', href: `#/tier/${template.id}` }, t('agg.myList')),
          h('button', { class: 'btn', onclick: () => savePng(template, rows) }, t('tier.savePng')),
          h('div', { class: 'seg', role: 'group', 'aria-label': t('agg.badge') },
            ['score', 'n'].map(k => h('button', {
              class: badge === k ? 'on' : null, 'aria-pressed': String(badge === k),
              onclick: () => { badge = k; write(BADGE_KEY, k); draw(); },
            }, t(`agg.badge.${k}`)))),
        ),
      ),
      h('p', { class: 'help agg-help' },
        t('agg.help'), ' ',
        h('span', { class: 'agg-few-sample' }, t('agg.helpFew', { n: FEW })),
        mine.size > 0 && ` ${t('agg.helpMine')}`),
      b,
    );
    window.scrollTo(0, scrollY);
  }

  draw();
}

async function savePng(template, rows) {
  toast(t('png.making'));
  try {
    const title = t('agg.pngTitle', { title: template.title });
    const blob = await renderPng(template, { title, tiers: rows });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `${title.replace(/[\\/:*?"<>|]/g, '_')}.png` });
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

// ---------------------------------------------------------------- A vs B 대결

// 무엇을 묻는가: 적은 '더 어려운', 저주는 '더 괴로운', 캐릭터는 '더 강한', 나머지는 '더 좋은'
function question(cat) {
  if (cat.enemy) return t('vs.q.harder');
  if (cat.id === 'curses') return t('vs.q.worse');
  if (cat.id === 'characters') return t('vs.q.stronger');
  return t('vs.q.better');
}

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// 이번 방문(탭)에서 본 쌍과 고른 횟수: sessionStorage
const SESSION_KEY = 'sts2vs.session';
const session = (() => {
  const raw = read(SESSION_KEY, null, 'session');
  return {
    picks: Number(raw?.picks) || 0,
    seen: raw?.seen && typeof raw.seen === 'object' ? raw.seen : {},
  };
})();
const saveSession = () => write(SESSION_KEY, session, 'session');
function seenSet(scope) {
  return new Set(session.seen[scope] || []);
}

// 지금까지 판정한 쌍(방문을 넘어서): localStorage. 아직 판정하지 않은 쌍을 먼저 보여 주는 데 쓴다.
const JUDGED_KEY = cat => `sts2vs.judged.${cat}`;
const JUDGED_MAX = 4000;
const loadJudged = catId => new Set(read(JUDGED_KEY(catId), []));
function addJudged(catId, key) {
  const list = read(JUDGED_KEY(catId), []).filter(k => k !== key);
  list.push(key);
  write(JUDGED_KEY(catId), list.slice(-JUDGED_MAX));
}

// ---- 표 보내기 (실패하면 대기열에 두고 다시 보낸다) ----

const PENDING_KEY = 'sts2vs.pending';
let flushTimer = null;
let flushing = false;
let warned = false;
const rankingCache = new Map();

function queueVote(vote) {
  const pending = read(PENDING_KEY, []);
  pending.push(vote);
  write(PENDING_KEY, pending.slice(-500));
  flushVotes();
}

async function flushVotes() {
  if (flushing) return;
  clearTimeout(flushTimer);
  flushing = true;
  try {
    for (;;) {
      const pending = read(PENDING_KEY, []);
      if (!pending.length) { warned = false; return; }
      const vote = pending[0];
      const body = { category: vote.category, winner: vote.winner, loser: vote.loser };
      // 로그인 상태면 서버가 계정으로 센다. 아니면 밸런스 투표와 같은 익명 id.
      if (!currentUser()) body.voter = voterId();
      let status = 0, result = null;
      try {
        const res = await fetch(`${API_BASE}/versus`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(body),
          keepalive: true,
        });
        status = res.status;
        if (res.ok) result = await res.json().catch(() => null);
      } catch { status = 0; }
      if (status === 0 || status >= 500 || status === 429) {
        // 연결 실패·서버 오류·너무 빠름: 잠시 뒤 다시
        if (status !== 429 && !warned) { warned = true; toast(t('vs.sendFailed')); }
        flushTimer = setTimeout(flushVotes, status === 429 ? 20_000 : 15_000);
        return;
      }
      // 성공했거나(2xx) 서버가 받지 않는 표(4xx)는 대기열에서 뺀다
      const now = read(PENDING_KEY, []);
      now.shift();
      write(PENDING_KEY, now);
      if (result?.ratings) applyResult(vote, result.ratings);
    }
  } finally {
    flushing = false;
  }
}

if (read(PENDING_KEY, []).length) setTimeout(flushVotes, 2500);

// 서버 순위는 30초 캐시라 다시 받지 않고, 응답의 새 점수로 받아 둔 순위를 고친다.
// (같은 쌍을 다시 고른 경우 서버는 승패를 다시 세므로 여기서는 승패를 더하지 않는다.)
function applyResult(vote, ratings) {
  const hit = rankingCache.get(vote.category);
  if (!hit) return;
  const items = hit.items;
  for (const [id, delta] of [[vote.winner, 'wins'], [vote.loser, 'losses']]) {
    const r = items[id] || (items[id] = { rating: 1500, wins: 0, losses: 0 });
    if (Number.isFinite(Number(ratings[id]))) r.rating = Number(ratings[id]);
    if (!vote.again) r[delta] = (Number(r[delta]) || 0) + 1;
  }
}

async function fetchRanking(catId, signal) {
  const hit = rankingCache.get(catId);
  if (hit && Date.now() - hit.at < 30_000) return hit.items;
  const data = await getJson(`/versus/ranking?category=${encodeURIComponent(catId)}`, signal);
  const items = data?.items && typeof data.items === 'object' ? data.items : {};
  rankingCache.set(catId, { at: Date.now(), items });
  return items;
}

// ---- 쌍 고르기 ----
// buckets: 서로 붙일 수 있는 아이템 묶음들 (카드는 캐릭터별, 나머지는 하나)
// 이번 방문에서 본 쌍은 다시 내지 않고, 예전에 판정한 쌍보다 처음 보는 쌍을 먼저,
// 그중에서도 이번 방문에 덜 나온 아이템이 든 쌍을 고른다.
function makePairs(buckets, scope, catId) {
  const seen = seenSet(scope);
  const judged = loadJudged(catId);
  const shown = new Map();
  const shownOf = id => shown.get(id) || 0;
  const usable = buckets.filter(b => b.length >= 2);
  const totalPairs = usable.reduce((n, b) => n + (b.length * (b.length - 1)) / 2, 0);
  const rand = n => Math.floor(Math.random() * n);
  const best = cands => {
    // 몇 개를 뽑아 덜 나온 아이템이 든 쌍을 고른다
    let pick = null, score = Infinity;
    for (let i = 0; i < Math.min(8, cands.length); i++) {
      const c = cands[rand(cands.length)];
      const s = shownOf(c[0].id) + shownOf(c[1].id) + Math.random() * 0.5;
      if (s < score) { score = s; pick = c; }
    }
    return pick;
  };

  function next(avoid) {
    if (!usable.length) return null;
    let pair = null;
    if (totalPairs <= 1500) {
      const fresh = [], old = [];
      for (const b of usable) {
        for (let i = 0; i < b.length; i++) {
          for (let j = i + 1; j < b.length; j++) {
            const k = pairKey(b[i].id, b[j].id);
            if (seen.has(k) || k === avoid) continue;
            (judged.has(k) ? old : fresh).push([b[i], b[j]]);
          }
        }
      }
      pair = best(fresh.length ? fresh : old);
    } else {
      // 쌍이 너무 많으면 무작위로 뽑아 본다 (묶음은 쌍의 수에 비례해 고른다)
      let fallback = null;
      const cands = [];
      for (let tries = 0; tries < 400 && cands.length < 8; tries++) {
        let r = Math.random() * totalPairs;
        let b = usable[0];
        for (const x of usable) { const n = (x.length * (x.length - 1)) / 2; if (r < n) { b = x; break; } r -= n; }
        // 덜 나온 아이템을 한쪽에 두기: 셋 중 가장 덜 나온 것
        let a = b[rand(b.length)];
        for (let s = 0; s < 2; s++) { const c = b[rand(b.length)]; if (shownOf(c.id) < shownOf(a.id)) a = c; }
        const o = b[rand(b.length)];
        if (o === a) continue;
        const k = pairKey(a.id, o.id);
        if (seen.has(k) || k === avoid) continue;
        if (judged.has(k)) { fallback ??= [a, o]; continue; }
        cands.push([a, o]);
      }
      pair = cands.length ? best(cands) : fallback;
    }
    if (!pair) return null;
    return Math.random() < 0.5 ? pair : [pair[1], pair[0]];
  }

  return {
    next,
    show(pair) {
      const k = pairKey(pair[0].id, pair[1].id);
      seen.add(k);
      for (const it of pair) shown.set(it.id, shownOf(it.id) + 1);
      session.seen[scope] = [...seen].slice(-5000);
      saveSession();
    },
    judged(pair) { return judged.has(pairKey(pair[0].id, pair[1].id)); },
    judge(pair) { const k = pairKey(pair[0].id, pair[1].id); judged.add(k); addJudged(catId, k); },
    reset() { seen.clear(); shown.clear(); delete session.seen[scope]; saveSession(); },
    get size() { return totalPairs; },
  };
}

function preload(pair) {
  for (const it of pair || []) {
    if (!it.img) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = it.img;
  }
}

function vsCrumbs(cat) {
  return h('nav', { class: 'crumbs', 'aria-label': t('crumbs.aria') },
    cat ? h('a', { href: '#/versus' }, t('vs.title')) : h('span', { 'aria-current': 'page' }, t('vs.title')),
    cat && [h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'), h('span', { 'aria-current': 'page' }, cat.name)],
  );
}

const sessionBadge = () => h('span', { class: 'vs-counter', 'aria-live': 'polite' }, t('vs.session', { n: session.picks }));

function viewVersusHome(ctx) {
  const cats = ctx.db.categories.filter(c => c.items.length >= 2);
  ctx.render(
    vsCrumbs(null),
    h('header', { class: 'page-head vs-head' },
      h('div', {},
        h('h1', {}, t('vs.title')),
        h('p', {}, t('vs.lead'))),
      session.picks > 0 && sessionBadge(),
    ),
    h('section', { class: 'block' },
      h('h2', { class: 'block-title' }, t('vs.pickCat')),
      h('div', { class: 'cat-grid' }, cats.map(cat => {
        const judged = read(JUDGED_KEY(cat.id), []).length;
        return h('a', { class: 'cat-card', href: `#/versus/${cat.id}` },
          ctx.thumbs(cat.items, cat.tile, 4),
          h('div', { class: 'cat-card-body' },
            h('h3', {}, cat.name),
            h('p', {}, question(cat)),
            h('div', { class: 'cat-card-meta' },
              h('span', {}, t('n.items', { n: cat.items.length })),
              judged > 0 && h('span', { class: 'badge-on' }, t('vs.myPicks', { n: judged }))),
          ),
        );
      })),
    ),
  );
}

let lastTab = 'play';

function viewVersus(catId, params, ctx) {
  const db = ctx.db;
  const cat = db.categories.find(c => c.id === catId);
  if (!cat || cat.items.length < 2) return ctx.notFound();
  const groups = (cat.groups || []).filter(g => cat.items.filter(i => inGroup(i, g.id)).length >= 2);
  const gid = groups.some(g => g.id === params.get('g')) ? params.get('g') : '';
  const items = gid ? cat.items.filter(i => inGroup(i, gid)) : cat.items;
  // 카드는 캐릭터가 다르면 비교가 무의미하므로 '전체'에서도 같은 캐릭터끼리만 붙인다.
  const sameGroup = Boolean(cat.split?.groupFirst) && !gid && groups.length > 1;
  const buckets = sameGroup ? groups.map(g => items.filter(i => inGroup(i, g.id))) : [items];
  const scope = `${cat.id}:${gid}`;
  const pairs = makePairs(buckets, scope, cat.id);
  const pseudo = { tile: cat.tile, byId: cat.byId };
  const ac = new AbortController();
  ctx.addCleanup(() => ac.abort());

  let tab = lastTab;
  let current = null;
  let upcoming = null;
  let last = null;
  let rankShown = 50;

  const counter = sessionBadge();
  const body = h('div', { class: 'vs-body' });
  const tabs = h('div', { class: 'seg vs-tabs', role: 'tablist', 'aria-label': t('vs.tabAria') });

  function drawTabs() {
    tabs.replaceChildren(...['play', 'rank'].map(k => h('button', {
      role: 'tab', class: tab === k ? 'on' : null, 'aria-selected': String(tab === k),
      onclick: () => { if (tab !== k) { tab = lastTab = k; drawTabs(); drawBody(); } },
    }, t(`vs.tab.${k}`))));
  }

  const groupLink = (id, label, color) => h('a', {
    class: `vs-chip${gid === id ? ' on' : ''}`, href: `#/versus/${cat.id}${id ? `?g=${encodeURIComponent(id)}` : ''}`,
    'aria-current': gid === id ? 'true' : null, style: color ? { '--chip': color } : null,
  }, label);

  ctx.render(
    vsCrumbs(cat),
    h('header', { class: 'vs-head' },
      h('h1', { class: 'board-h1' }, t('vs.catTitle', { cat: cat.name })),
      counter,
    ),
    h('div', { class: 'vs-controls' },
      tabs,
      groups.length > 1 && h('nav', { class: 'vs-groups', 'aria-label': t('vs.groupAria') },
        groupLink('', t('vs.all')),
        groups.map(g => groupLink(g.id, g.name, g.color))),
    ),
    sameGroup && h('p', { class: 'help vs-note' }, t('vs.sameGroup')),
    body,
  );
  drawTabs();

  // ---- 대결 ----

  function advance() {
    if (upcoming && !seenSet(scope).has(pairKey(upcoming[0].id, upcoming[1].id))) current = upcoming;
    else current = pairs.next();
    if (current) pairs.show(current);
    upcoming = current ? pairs.next(pairKey(current[0].id, current[1].id)) : null;
    preload(upcoming);
  }

  function choose(side) {
    if (!current) return;
    const winner = current[side], loser = current[1 - side];
    queueVote({ category: cat.id, winner: winner.id, loser: loser.id, again: pairs.judged(current) || undefined });
    pairs.judge(current);
    session.picks++;
    saveSession();
    counter.textContent = t('vs.session', { n: session.picks });
    last = { winner, loser };
    advance();
    drawBody();
  }

  function skip() {
    if (!current) return;
    last = null;
    advance();
    drawBody();
  }

  function side(item, i) {
    const text = cat.tile === 'icon' ? itemDetails(item)[2] : null;
    const meta = [item.groupName && item.groupName !== cat.name ? item.groupName : null, item.area].filter(Boolean)[0];
    return h('div', { class: `vs-side vs-${i ? 'right' : 'left'}` },
      h('button', {
        class: 'vs-pick', 'aria-label': t('vs.pickAria', { name: item.name }),
        onclick: () => choose(i),
      },
        h('span', { class: `vs-media kind-${cat.tile}` },
          item.img ? h('img', { src: item.img, alt: '', decoding: 'async', draggable: 'false' }) : h('span', { class: 'vs-noimg', 'aria-hidden': 'true' }, '?')),
        h('span', { class: 'vs-name' }, item.name),
        meta && h('span', { class: 'vs-meta' }, meta),
        text,
        h('span', { class: 'vs-key kbd-only', 'aria-hidden': 'true' }, i ? '→' : '←'),
      ),
      h('button', { class: 'btn ghost small vs-info', onclick: () => openDetail(item, cat, db) }, t('vs.detail')),
    );
  }

  function drawPlay() {
    if (!current) {
      return h('section', { class: 'empty vs-done' },
        h('h2', {}, t('vs.done')),
        h('p', {}, t('vs.doneBody')),
        h('p', { class: 'actions agg-empty-actions' },
          h('button', { class: 'btn primary', onclick: () => { pairs.reset(); upcoming = null; advance(); drawBody(); } }, t('vs.restart')),
          h('button', { class: 'btn', onclick: () => { tab = lastTab = 'rank'; drawTabs(); drawBody(); } }, t('vs.tab.rank'))),
      );
    }
    return h('section', { class: 'vs-arena' },
      h('h2', { class: 'vs-question' }, question(cat)),
      h('div', { class: `vs-pair kind-${cat.tile}` },
        side(current[0], 0),
        h('div', { class: 'vs-mid', 'aria-hidden': 'true' }, 'VS'),
        side(current[1], 1),
      ),
      h('div', { class: 'vs-actions' },
        h('button', { class: 'btn ghost vs-skip', onclick: skip }, t('vs.skip'), h('span', { class: 'kbd-only vs-kbd', 'aria-hidden': 'true' }, '↓')),
      ),
      h('p', { class: 'vs-last', 'aria-live': 'polite' },
        last ? [h('span', { class: 'vs-last-label' }, t('vs.lastLabel')), ' ', h('strong', {}, last.winner.name), ' > ', last.loser.name] : ''),
      h('p', { class: 'vs-keys kbd-only' }, t('vs.keys')),
    );
  }

  // ---- 순위 ----

  async function drawRank(target) {
    target.replaceChildren(h('p', { class: 'vs-rank-status' }, t('vs.rank.loading')));
    let data;
    try {
      data = await fetchRanking(cat.id, ac.signal);
    } catch {
      if (ac.signal.aborted) return;
      target.replaceChildren(h('div', { class: 'empty' },
        h('p', {}, t('vs.rank.offline')),
        h('p', {}, h('button', { class: 'btn', onclick: () => drawBody() }, t('agg.retry')))));
      return;
    }
    if (ac.signal.aborted || tab !== 'rank' || !target.isConnected) return;
    const rows = items
      .map(item => ({ item, r: data[item.id] }))
      .filter(x => x.r && (Number(x.r.wins) + Number(x.r.losses)) > 0)
      .map(x => ({ item: x.item, rating: Number(x.r.rating) || 1500, w: Number(x.r.wins) || 0, l: Number(x.r.losses) || 0 }))
      .sort((a, b) => b.rating - a.rating || b.w - a.w);
    if (!rows.length) {
      target.replaceChildren(h('div', { class: 'empty' },
        h('p', {}, t('vs.rank.empty')),
        h('p', {}, h('button', { class: 'btn primary', onclick: () => { tab = lastTab = 'play'; drawTabs(); drawBody(); } }, t('vs.tab.play')))));
      return;
    }
    const games = rows.reduce((n, r) => n + r.w, 0);
    const list = h('ol', { class: 'vs-rank' }, rows.slice(0, rankShown).map((r, i) => {
      const n = r.w + r.l;
      const pctW = Math.round((r.w / n) * 100);
      return h('li', {
        class: `vs-rank-row${n < FEW ? ' few' : ''}`, tabindex: '0', role: 'button',
        'aria-label': `${i + 1}. ${r.item.name} · ${t('vs.rank.wl', { w: r.w, l: r.l })}`,
        onclick: () => openDetail(r.item, cat, db),
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.item, cat, db); } },
      },
        h('span', { class: `vs-rank-no${i < 3 ? ` top top${i + 1}` : ''}` }, String(i + 1)),
        tile(r.item, pseudo),
        h('span', { class: 'vs-rank-main' },
          h('span', { class: 'vs-rank-name' }, r.item.name,
            !gid && r.item.groupName && r.item.groupName !== cat.name && h('span', { class: 'result-group' }, r.item.groupName)),
          h('span', { class: 'vs-rank-bar', 'aria-hidden': 'true' }, h('span', { style: { width: `${pctW}%` } })),
          h('span', { class: 'vs-rank-sub' }, t('vs.rank.wl', { w: r.w, l: r.l }), ' · ', t('vs.rank.rate', { p: pctW }))),
        h('span', { class: 'vs-rank-rating', title: t('vs.rank.rating') }, String(Math.round(r.rating))),
      );
    }));
    attachTooltips(list, id => cat.byId.get(id));
    const unrated = items.length - rows.length;
    // 조건부 조각(cond && h(...))이 false 면 글자 'false' 로 찍히므로 걸러 낸다
    target.replaceChildren(...[
      h('p', { class: 'vs-rank-status' }, t('vs.rank.summary', { n: rows.length, games })),
      list,
      rows.length > rankShown && h('p', { class: 'vs-more' },
        h('button', { class: 'btn', onclick: () => { rankShown += 50; drawRank(target); } }, t('vs.rank.more', { n: rows.length - rankShown }))),
      h('p', { class: 'help vs-rank-help' }, t('vs.rank.help', { n: FEW }), unrated > 0 ? ` ${t('vs.rank.unrated', { n: unrated })}` : ''),
    ].filter(Boolean));
  }

  function drawBody() {
    hideTip();
    if (tab === 'rank') {
      const target = h('section', { class: 'vs-rank-wrap' });
      body.replaceChildren(target);
      drawRank(target);
    } else {
      body.replaceChildren(drawPlay());
    }
  }

  function onKey(e) {
    if (tab !== 'play' || !current || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (document.body.classList.contains('modal-open')) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName))) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); choose(0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); choose(1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); skip(); }
  }
  document.addEventListener('keydown', onKey);
  ctx.addCleanup(() => document.removeEventListener('keydown', onKey));

  advance();
  drawBody();
}
