// 모두의 티어표(공개·동기화된 티어표 합산)와 월드컵(토너먼트, 경로는 예전 그대로 #/versus).
// app.js 가 route / navLinks / homeBlocks / tierActions 를 부른다.

import { h, toast, tile, board, attachTooltips, itemDetails, hideTip } from './ui.js';
import { t } from './i18n.js';
import { openDetail } from './detail.js';
import { API_BASE, voterId } from './balance.js';
import { authHeaders, currentUser } from './auth.js';
import { loadState, DEFAULT_TIERS } from './tierlist.js';
import { renderPng } from './export.js';
import {
  mountWorldCup, hasRunningCup, upToLabel, MIN_SIZE, cupMetrics, runStats,
  RANK_FEW, fmtIndex, fmtProgress, enoughCupData, rankOrder,
} from './worldcup.js';
import { worldcupSwitch, cupsStrip } from './cups.js';

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
  // 사용자 월드컵(#/cups, #/cup/…)도 같은 '월드컵' 메뉴
  const on = parts[0] === 'versus' || parts[0] === 'cups' || parts[0] === 'cup';
  return [h('a', { href: '#/versus', class: on ? 'active' : null }, t('vs.nav'))];
}

export function homeBlocks(mode) {
  if (mode !== 'tier') return [];
  return [h('section', { class: 'block vs-promo-wrap' },
    h('a', { class: 'vs-promo', href: '#/versus' },
      h('span', { class: 'vs-promo-icon', 'aria-hidden': 'true' }, '🏆'),
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

// ---------------------------------------------------------------- 월드컵 (토너먼트)
// 대진·라운드·되돌리기·이어 하기·우승 화면은 worldcup.js 엔진이 맡고, 여기서는 게임 데이터를 넘기고
// 경기마다 POST /versus (Elo), 판이 끝나면 POST /versus/tournament (우승·출전 횟수) 를 보낸다.

// 무엇을 묻는가: 적은 '더 어려운', 저주는 '더 괴로운', 캐릭터는 '더 강한', 나머지는 '더 좋은'
function question(cat) {
  if (cat.enemy) return t('vs.q.harder');
  if (cat.id === 'curses') return t('vs.q.worse');
  if (cat.id === 'characters') return t('vs.q.stronger');
  return t('vs.q.better');
}

const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const CUP_KEY = (catId, gid) => `sts2vs.cup.${catId}:${gid}`;

// 이번 방문(탭)에서 고른 횟수: sessionStorage
const SESSION_KEY = 'sts2vs.session';
const session = { picks: Number(read(SESSION_KEY, null, 'session')?.picks) || 0 };
const saveSession = () => write(SESSION_KEY, session, 'session');

// 지금까지 판정한 쌍(방문을 넘어서): localStorage. 같은 쌍을 다시 고른 표인지(again) 알고, 카테고리별 선택 수를 보여 준다.
const JUDGED_KEY = cat => `sts2vs.judged.${cat}`;
const JUDGED_MAX = 4000;
const loadJudged = catId => new Set(read(JUDGED_KEY(catId), []));
function addJudged(catId, key) {
  const list = read(JUDGED_KEY(catId), []).filter(k => k !== key);
  list.push(key);
  write(JUDGED_KEY(catId), list.slice(-JUDGED_MAX));
}

// ---- 표 보내기 (실패하면 대기열에 두고 다시 보낸다) ----
// 대기열 항목: { category, winner, loser, again? } (경기 표) 또는 { kind: 'cup', category, champion, entrants, matches } (월드컵 결과)

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
      const cup = vote.kind === 'cup';
      const body = cup
        ? { category: vote.category, champion: vote.champion, entrants: vote.entrants, matches: vote.matches }
        : { category: vote.category, winner: vote.winner, loser: vote.loser };
      // 로그인 상태면 서버가 계정으로 센다. 아니면 밸런스 투표와 같은 익명 id.
      if (!currentUser()) body.voter = voterId();
      let status = 0, result = null;
      try {
        const res = await fetch(`${API_BASE}${cup ? '/versus/tournament' : '/versus'}`, {
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
      if (!cup && result?.ratings) applyResult(vote, result.ratings);
    }
  } finally {
    flushing = false;
  }
}

if (read(PENDING_KEY, []).length) setTimeout(flushVotes, 2500);

const blankRow = () => ({ rating: 1500, wins: 0, losses: 0, champ: 0, entries: 0, expected: 0, progress: 0, tracked: 0, trackedChamp: 0 });

// 서버 순위는 30초 캐시라 다시 받지 않고, 응답의 새 점수로 받아 둔 순위를 고친다.
// (같은 쌍을 다시 고른 경우 서버는 승패를 다시 세므로 여기서는 승패를 더하지 않는다.)
function applyResult(vote, ratings) {
  const hit = rankingCache.get(vote.category);
  if (!hit) return;
  const items = hit.items;
  for (const [id, delta] of [[vote.winner, 'wins'], [vote.loser, 'losses']]) {
    const r = items[id] || (items[id] = blankRow());
    if (Number.isFinite(Number(ratings[id]))) r.rating = Number(ratings[id]);
    if (!vote.again) r[delta] = (Number(r[delta]) || 0) + 1;
  }
}

// 월드컵 결과는 보내자마자 받아 둔 순위에도 더한다 (서버와 같은 계산: bracket.js 의 runStats).
function applyCup(category, champion, entrants, matches) {
  const hit = rankingCache.get(category);
  if (!hit) return;
  const { expected, items } = runStats(entrants, matches);
  const add = (r, k, v) => { r[k] = (Number(r[k]) || 0) + v; };
  for (const id of entrants) {
    const r = hit.items[id] || (hit.items[id] = blankRow());
    const won = id === champion ? 1 : 0;
    add(r, 'entries', 1); add(r, 'champ', won);
    add(r, 'tracked', 1); add(r, 'trackedChamp', won);
    add(r, 'expected', expected); add(r, 'progress', items[id].p);
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

function vsCrumbs(cat) {
  return h('nav', { class: 'crumbs', 'aria-label': t('crumbs.aria') },
    cat ? h('a', { href: '#/versus' }, t('vs.title')) : h('span', { 'aria-current': 'page' }, t('vs.title')),
    cat && [h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'), h('span', { 'aria-current': 'page' }, cat.name)],
  );
}

const sessionBadge = () => h('span', { class: 'vs-counter', 'aria-live': 'polite' }, t('vs.session', { n: session.picks }));

function viewVersusHome(ctx) {
  const cats = ctx.db.categories.filter(c => c.items.length >= MIN_SIZE);
  ctx.render(
    vsCrumbs(null),
    h('header', { class: 'page-head vs-head' },
      h('div', {},
        h('h1', {}, t('vs.title')),
        h('p', {}, t('vs.lead'))),
      session.picks > 0 ? sessionBadge() : null,
    ),
    worldcupSwitch('game'),
    h('section', { class: 'block' },
      h('h2', { class: 'block-title' }, t('vs.pickCat')),
      h('div', { class: 'cat-grid' }, cats.map(cat => {
        const judged = read(JUDGED_KEY(cat.id), []).length;
        return h('a', { class: 'cat-card', href: `#/versus/${cat.id}` },
          ctx.thumbs(cat.items, cat.tile, 4),
          h('div', { class: 'cat-card-body' },
            h('h3', {}, t('vs.catTitle', { cat: cat.name })),
            h('p', {}, question(cat)),
            h('div', { class: 'cat-card-meta' },
              h('span', {}, t('n.items', { n: cat.items.length })),
              h('span', {}, upToLabel(cat.items.length)),
              hasRunningCup(`sts2vs.cup.${cat.id}:`) ? h('span', { class: 'badge-on' }, t('vs.running')) : null,
              judged > 0 ? h('span', { class: 'badge-on' }, t('vs.myPicks', { n: judged })) : null),
          ),
        );
      })),
    ),
    cupsStrip(ctx),
  );
}

let lastTab = 'play';
// 순위 정렬: 'index'(우승 지수) | 'progress'(평균 진출도) | 'elo' | 'titles'(우승 횟수).
// 고른 적이 없으면 대진 크기를 반영한 판이 충분할 때 우승 지수, 아니면 Elo. (예전 열쇠 sts2vs.rankSort 의 'cup' 은 없어진 정렬이라 새 열쇠를 쓴다)
const RANK_SORT_KEY = 'sts2vs.rankSort2';
const RANK_SORTS = ['index', 'progress', 'elo', 'titles'];

function viewVersus(catId, params, ctx) {
  const db = ctx.db;
  const cat = db.categories.find(c => c.id === catId);
  if (!cat || cat.items.length < 2) return ctx.notFound();
  const groups = (cat.groups || []).filter(g => cat.items.filter(i => inGroup(i, g.id)).length >= 2);
  const gid = groups.some(g => g.id === params.get('g')) ? params.get('g') : '';
  const group = groups.find(g => g.id === gid);
  const items = gid ? cat.items.filter(i => inGroup(i, gid)) : cat.items;
  // 카드도 '전체'(모든 캐릭터)로 할 수 있다. 캐릭터 칩은 범위를 좁히는 거르개.
  const pseudo = { tile: cat.tile, byId: cat.byId };
  const ac = new AbortController();
  ctx.addCleanup(() => ac.abort());

  let tab = lastTab;
  let rankShown = 50;
  const savedSort = read(RANK_SORT_KEY, null);
  let rankSort = RANK_SORTS.includes(savedSort) ? savedSort : null; // null = 데이터를 보고 정한다
  let cup = null;
  ctx.addCleanup(() => cup?.destroy());

  const counter = sessionBadge();
  const body = h('div', { class: 'vs-body' });
  const tabs = h('div', { class: 'seg vs-tabs', role: 'tablist', 'aria-label': t('vs.tabAria') });

  function setTab(k) {
    if (tab === k) return;
    tab = lastTab = k;
    drawTabs();
    drawBody();
  }

  function drawTabs() {
    tabs.replaceChildren(...['play', 'rank'].map(k => h('button', {
      role: 'tab', class: tab === k ? 'on' : null, 'aria-selected': String(tab === k),
      onclick: () => setTab(k),
    }, t(`vs.tab.${k}`))));
  }

  const groupHref = id => `#/versus/${cat.id}${id ? `?g=${encodeURIComponent(id)}` : ''}`;
  const groupLink = (id, label, color) => h('a', {
    class: `vs-chip${gid === id ? ' on' : ''}`, href: groupHref(id),
    'aria-current': gid === id ? 'true' : null, style: color ? { '--chip': color } : null,
  }, label);

  ctx.render(
    vsCrumbs(cat),
    h('header', { class: 'vs-head' },
      h('h1', { class: 'board-h1' }, t('vs.catTitle', { cat: cat.name }), group ? h('span', { class: 'vs-head-group' }, ` · ${group.name}`) : null),
      counter,
    ),
    h('div', { class: 'vs-controls' },
      tabs,
      groups.length > 1 ? h('nav', { class: 'vs-groups', 'aria-label': t('vs.groupAria') },
        groupLink('', t('vs.all')),
        groups.map(g => groupLink(g.id, g.name, g.color))) : null,
    ),
    body,
  );
  drawTabs();

  // ---- 월드컵 ----

  function extra(item) {
    const text = cat.tile === 'icon' ? itemDetails(item, { links: true })[2] : null;
    const meta = [item.groupName && item.groupName !== cat.name ? item.groupName : null, item.area].filter(Boolean)[0];
    return [meta ? h('span', { class: 'vs-meta' }, meta) : null, text || null].filter(Boolean);
  }

  function onMatch({ winner, loser }) {
    const k = pairKey(winner.id, loser.id);
    const judged = loadJudged(cat.id);
    queueVote({ category: cat.id, winner: winner.id, loser: loser.id, again: judged.has(k) || undefined });
    addJudged(cat.id, k);
    session.picks++;
    saveSession();
    counter.textContent = t('vs.session', { n: session.picks });
  }

  function onFinish({ champion, entrants, matches }) {
    queueVote({ kind: 'cup', category: cat.id, champion: champion.id, entrants, matches });
    applyCup(cat.id, champion.id, entrants, matches);
  }

  function drawPlay() {
    cup = mountWorldCup({
      storeKey: CUP_KEY(cat.id, gid),
      title: [t('vs.catTitle', { cat: cat.name }), group?.name].filter(Boolean).join(' · '),
      question: question(cat),
      items,
      kind: cat.tile,
      extra,
      mini: item => tile(item, pseudo, { tabindex: null, role: null, 'aria-hidden': 'true' }),
      onDetail: item => openDetail(item, cat, db),
      onMatch,
      onFinish,
      onRank: () => setTab('rank'),
    });
    return cup.el;
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
    const num = v => Number(v) || 0;
    const all = items
      .map(item => ({ item, r: data[item.id] }))
      .filter(x => x.r && (num(x.r.wins) + num(x.r.losses) + num(x.r.entries)) > 0)
      .map(x => ({
        item: x.item, rating: Number(x.r.rating) || 1500, w: num(x.r.wins), l: num(x.r.losses),
        champ: num(x.r.champ), entries: num(x.r.entries), expected: num(x.r.expected), m: cupMetrics(x.r),
      }));
    if (!all.length) {
      target.replaceChildren(h('div', { class: 'empty' },
        h('p', {}, t('vs.rank.empty')),
        h('p', {}, h('button', { class: 'btn primary', onclick: () => setTab('play') }, t('vs.tab.play')))));
      return;
    }
    // 고른 정렬이 없거나, 지수·진출도인데 그런 판이 하나도 없으면 데이터를 보고 정한다
    const anyTracked = all.some(r => r.m.tracked > 0);
    let sort = rankSort;
    if (!sort || ((sort === 'index' || sort === 'progress') && !anyTracked)) sort = enoughCupData(all) ? 'index' : 'elo';

    const cupSort = sort === 'index' || sort === 'progress';
    for (const r of all) r.few = sort === 'elo' ? r.w + r.l < RANK_FEW : cupSort ? r.m.tracked < RANK_FEW : r.entries < RANK_FEW;
    const value = { index: r => r.m.index, progress: r => r.m.progress, elo: r => r.rating, titles: r => r.champ }[sort];
    const tie = (a, b) => b.champ - a.champ || b.rating - a.rating || b.w - a.w || b.entries - a.entries;
    const { top, few } = rankOrder(all, value, tie, cupSort);
    const rows = [...top, ...few];
    const maxIndex = Math.max(1, ...top.map(r => r.m.index ?? 0));
    const maxChamp = Math.max(1, ...rows.map(r => r.champ));

    const games = all.reduce((n, r) => n + r.w, 0);
    const cups = all.reduce((n, r) => n + r.champ, 0); // 판마다 우승은 하나
    const rowEl = (r, i) => {
      const n = r.w + r.l;
      const pctW = n ? Math.round((r.w / n) * 100) : 0;
      const pctC = r.entries ? Math.round((r.champ / r.entries) * 100) : 0;
      const cupText = r.entries ? t('vs.rank.cup', { c: r.champ, e: r.entries, p: pctC }) : t('vs.rank.noCup');
      const bar = sort === 'index' ? (r.m.index ?? 0) / maxIndex * 100
        : sort === 'progress' ? (r.m.progress ?? 0) * 100
          : sort === 'titles' ? r.champ / maxChamp * 100 : pctW;
      const shown = sort === 'index' ? fmtIndex(r.m.index) : sort === 'progress' ? fmtProgress(r.m.progress)
        : sort === 'titles' ? String(r.champ) : String(Math.round(r.rating));
      const stats = r.m.tracked > 0 ? t('wc.rank.stats', { i: fmtIndex(r.m.index), p: fmtProgress(r.m.progress) }) : null;
      return h('li', {
        class: `vs-rank-row${r.few ? ' few' : ''}`, tabindex: '0', role: 'button',
        'aria-label': [`${i + 1}. ${r.item.name}`, t('vs.rank.wl', { w: r.w, l: r.l }), cupText, stats].filter(Boolean).join(' · '),
        onclick: () => openDetail(r.item, cat, db),
        onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.item, cat, db); } },
      },
        h('span', { class: `vs-rank-no${i < 3 && !r.few ? ` top top${i + 1}` : ''}` }, String(i + 1)),
        tile(r.item, pseudo),
        h('span', { class: 'vs-rank-main' },
          h('span', { class: 'vs-rank-name' }, r.item.name,
            !gid && r.item.groupName && r.item.groupName !== cat.name ? h('span', { class: 'result-group' }, r.item.groupName) : null),
          h('span', { class: `vs-rank-bar${sort !== 'elo' ? ' is-cup' : ''}`, 'aria-hidden': 'true' },
            h('span', { style: { width: `${Math.max(0, Math.min(100, Math.round(bar)))}%` } })),
          h('span', { class: 'vs-rank-sub' },
            n ? [t('vs.rank.wl', { w: r.w, l: r.l }), ' · ', t('vs.rank.rate', { p: pctW })] : t('vs.rank.noGames'),
            h('br'),
            h('span', { class: `vs-rank-cup${r.champ ? ' has' : ''}` }, r.champ ? '🏆 ' : null, cupText),
            stats ? [h('br'), stats] : null)),
        h('span', {
          class: `vs-rank-rating${shown === '—' ? ' is-none' : ''}`,
          title: sort === 'elo' ? t('vs.rank.rating') : t(`wc.rank.${sort}`),
        }, shown),
      );
    };
    const visible = rows.slice(0, rankShown);
    const list = h('ol', { class: 'vs-rank' }, visible.map((r, i) => [
      cupSort && few.length && r === few[0] ? h('li', { class: 'vs-rank-few-sep', 'aria-hidden': 'true' }, t('wc.rank.fewSep', { n: RANK_FEW })) : null,
      rowEl(r, i),
    ]));
    attachTooltips(list, id => cat.byId.get(id));
    const unrated = items.length - all.length;
    const label = k => (k === 'elo' ? t('vs.rank.sort.elo') : t(`wc.rank.${k}`));
    const sortSeg = h('div', { class: 'seg vs-rank-sort', role: 'group', 'aria-label': t('vs.rank.sort') },
      RANK_SORTS.map(k => h('button', {
        type: 'button', class: sort === k ? 'on' : null, 'aria-pressed': String(sort === k),
        onclick: () => { if (sort !== k) { rankSort = k; write(RANK_SORT_KEY, k); drawRank(target); } },
      }, label(k))));
    const help = sort === 'elo' ? t('vs.rank.help', { n: RANK_FEW }) : t(`wc.rank.help.${sort}`);
    // 조건부 조각(cond && h(...))이 false 면 글자 'false' 로 찍히므로 걸러 낸다
    target.replaceChildren(...[
      h('div', { class: 'vs-rank-head' },
        h('p', { class: 'vs-rank-status' },
          t('vs.rank.summary', { n: all.length, games }), cups > 0 ? ` · ${t('vs.rank.cups', { n: cups })}` : ''),
        sortSeg),
      list,
      rows.length > rankShown ? h('p', { class: 'vs-more' },
        h('button', { class: 'btn', onclick: () => { rankShown += 50; drawRank(target); } }, t('vs.rank.more', { n: rows.length - rankShown }))) : null,
      h('p', { class: 'help vs-rank-help' },
        help,
        cupSort ? ` ${t('wc.rank.few', { n: RANK_FEW })} ${t('wc.rank.since')}` : '',
        unrated > 0 ? ` ${t('vs.rank.unrated', { n: unrated })}` : ''),
    ].filter(Boolean));
  }

  function drawBody() {
    hideTip();
    cup?.destroy();
    cup = null;
    if (tab === 'rank') {
      const target = h('section', { class: 'vs-rank-wrap' });
      body.replaceChildren(target);
      drawRank(target);
    } else {
      body.replaceChildren(drawPlay());
    }
  }

  drawBody();
}
