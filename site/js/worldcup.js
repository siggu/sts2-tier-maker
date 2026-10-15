// 이상형 월드컵 엔진: 대진(무작위 추첨) → 라운드별 1:1 선택 → 우승.
// 게임 데이터와 무관하다. 항목은 { id, name, img? } 이면 되고, 보여 줄 덧붙임·자세히 보기·결과 보내기는
// 부르는 쪽이 콜백으로 넘긴다 (play.js 의 카드·유물 월드컵, cups.js 의 사용자 월드컵).
//
//   const cup = mountWorldCup({
//     storeKey: 'sts2vs.cup.cards:ironclad',     // 진행 중인 판을 localStorage 에 두는 열쇠
//     title: '카드 월드컵 · 아이언클래드',          // 우승 이미지 제목
//     question: '어느 쪽이 더 좋을까요?',
//     items: [{ id, name, img? }, ...],
//     kind: 'card' | 'icon' | 'portrait' | 'creature' | 'custom',   // 그림 칸 크기 (play.css .vs-pair.kind-*)
//     extra: item => Node | null,                // 고르기 버튼 안, 이름 아래 덧붙임
//     mini: item => Node,                        // 우승까지의 길·준우승에 쓰는 작은 그림
//     onDetail: item => {},                      // 있으면 '자세히' 단추
//     onMatch: ({ winner, loser, size }) => {},  // 한 경기 끝날 때마다
//     onFinish: ({ champion, runnerUp, entrants, size, matches }) => {},  // 판이 끝날 때 한 번
//                                                // matches = [[이긴 id, 진 id], …] (경기 순서, size − 1 개)
//     onRank: () => {},                          // 있으면 우승 화면에 '순위 보기'
//     imgFallback: item => url | null,           // 그림을 못 불러올 때 대신 쓸 그림 (사용자 월드컵의 기본 이미지)
//   });
//   target.replaceChildren(cup.el);  …  cup.destroy();
//
// 대진 크기: 4·8·16…(2의 거듭제곱, 항목 수 이하) 중 무작위 추첨, 또는 '전체'(모든 항목 — 2의 거듭제곱이 아니면
// 예선·부전승, bracket.js). 판 상태는 { v: 2, size, entrants: [id...](대진 순서), sides: '0101…'(경기마다 고른 쪽),
// finished, at } 뿐이고 나머지(라운드, 지금 경기, 부전승, 우승까지의 길)는 bracket() 이 다시 계산한다.
// 그래서 되돌리기는 sides 한 글자 빼기, 이어 하기는 저장본을 읽기만 하면 된다.

import { h, hideTip, toast } from './ui.js';
import { t } from './i18n.js';
import {
  MIN_SIZE, MAX_ENTRANTS, isPow2, plan, sizeOptions, sizesFor, defaultSize, drawEntrants, bracket, sidesFromWinners, matchPairs,
} from './bracket.js';

export { MIN_SIZE, MAX_ENTRANTS, sizeOptions, sizesFor, defaultSize, drawEntrants, bracket };
const RESUME_FINISHED_MS = 60 * 60 * 1000; // 끝난 판의 우승 화면은 1시간 동안만 다시 보여 준다
const BYES_SHOWN = 8;                      // 부전승 이름을 이만큼 보여 주고 나머지는 '외 n개'

// 대진 이름: 2의 거듭제곱이면 'n강', 아니면 '전체 n개'
export const sizeLabel = n => (isPow2(n) ? t('wc.size', { n }) : t('wc.sizeAll', { n }));
// 고를 수 있는 가장 큰 대진 (목록 카드의 '최대 …')
export function topSizeLabel(total) {
  const top = sizesFor(total).pop();
  return top ? sizeLabel(top) : null;
}

// 우승 항목이 라운드마다 이긴 상대: [{ round, opponent }] (부전승이었으면 맨 앞에 { round: 'pre', bye: true })
export function roadOf(b, id) {
  const road = b.matches.filter(m => m.w === id).map(m => ({ round: m.round, opponent: m.a === id ? m.b : m.a }));
  if (b.byes.includes(id)) road.unshift({ round: 'pre', bye: true });
  return road;
}

// 라운드 이름: 예선·결승·준결승·8강·16강…
export function roundName(round) {
  if (round === 'pre') return t('wc.round.prelim');
  if (round === 2) return t('wc.round.final');
  if (round === 4) return t('wc.round.semi');
  if (round === 8) return t('wc.round.quarter');
  return t('wc.round.n', { n: round });
}
const matchLabel = m => (m.of > 1 ? t('wc.match', { round: roundName(m.round), i: m.idx + 1, of: m.of }) : roundName(m.round));

// 목록 카드의 '최대 …': 가장 큰 2의 거듭제곱 대진, 또는 '전체 n개까지'
export function upToLabel(total) {
  const opts = sizeOptions(total);
  const top = opts[opts.length - 1];
  if (!top) return null;
  return isPow2(top.n) ? t('wc.upTo', { size: t('wc.size', { n: top.n }) }) : t('wc.upToAll', { n: top.n });
}

// ---- 순위 화면 공용 (play.js 게임 월드컵, cups.js 사용자 월드컵) ----
// 수치 정의는 bracket.js 의 cupMetrics. 기록된 판이 RANK_FEW 번 미만인 항목은 흐리게 하고, 지수·진출도 정렬에서는 아래로 모은다.
export { cupMetrics, runStats } from './bracket.js';
export const RANK_FEW = 3;
const ENOUGH_RUNS = 5; // 대진 크기를 반영한 판이 이만큼 모이면 '우승 지수'가 기본 정렬

export function fmtIndex(v) {
  if (v == null) return '—';
  return v >= 100 ? String(Math.round(v)) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
}
export const fmtProgress = v => (v == null ? '—' : `${Math.round(v * 100)}%`);

// 지수를 셀 만큼 판이 모였는가: 판마다 출전 항목의 expected 합은 1 이므로 Σ expected = 판 수
export const enoughCupData = rows => rows.reduce((s, r) => s + (Number(r.expected) || 0), 0) >= ENOUGH_RUNS - 1e-9;

// 정렬: value(row) 큰 순, null 은 뒤, 같으면 tie. demote 면 few 인 줄을 뒤로 모은다. → { top, few }
export function rankOrder(rows, value, tie, demote) {
  const cmp = (a, b) => {
    const x = value(a), y = value(b);
    if (x == null || y == null) return x == null && y == null ? tie(a, b) : x == null ? 1 : -1;
    return y - x || tie(a, b);
  };
  if (!demote) return { top: [...rows].sort(cmp), few: [] };
  return { top: rows.filter(r => !r.few).sort(cmp), few: rows.filter(r => r.few).sort(cmp) };
}

function readRun(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeRun(key, run) {
  try {
    if (run) localStorage.setItem(key, JSON.stringify(run));
    else localStorage.removeItem(key);
  } catch { /* 저장소 없음: 새로 고치면 처음부터 */ }
}

// storeKey 로 시작하는 진행 중인 판이 있는가 (예: 카테고리 고르기 화면의 '진행 중' 표시).
export function hasRunningCup(prefix) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const run = JSON.parse(localStorage.getItem(k));
      if (run && !run.finished && (typeof run.sides === 'string' || Array.isArray(run.picks))) return true;
    }
  } catch { /* 없음 */ }
  return false;
}

function preload(items) {
  for (const it of items) {
    if (!it?.img) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = it.img;
  }
}

// 저장본 → 지금 형식 { v: 2, size, entrants, sides, finished, at }. 예전 형식(v1: picks = 이긴 id 목록)은 바꿔 읽는다.
function upgradeRun(run) {
  if (!run || typeof run !== 'object' || !Array.isArray(run.entrants)) return null;
  if (run.v === 2) return typeof run.sides === 'string' ? run : null;
  const sides = sidesFromWinners(run.entrants, run.picks);
  if (sides === null) return null;
  return { v: 2, size: run.entrants.length, entrants: run.entrants, sides, finished: Boolean(run.finished), at: run.at };
}

export function mountWorldCup(opts) {
  const { storeKey, items, kind = 'custom' } = opts;
  const byId = new Map(items.map(i => [i.id, i]));
  const options = sizeOptions(items.length);
  const el = h('div', { class: 'cup' });
  const prefKey = 'sts2wc.size';
  const readPref = () => { const v = readRun(prefKey); return v === 'all' ? 'all' : Number(v) || null; };

  // 저장된 판: 모든 출전 항목이 지금 목록에 있고 대진이 맞아야 이어 한다
  let run = upgradeRun(readRun(storeKey));
  let state = run && run.entrants.every(id => byId.has(id)) ? bracket(run.entrants, run.sides) : null;
  if (!state || (run.finished && !(Date.now() - Number(run.at) < RESUME_FINISHED_MS))) {
    if (readRun(storeKey)) writeRun(storeKey, null);
    run = null;
    state = null;
  }
  let chosen = defaultSize(items.length, run ? (run.size === items.length ? 'all' : run.size) : readPref());
  let last = null; // 방금 경기 { winner, loser }
  let abandonArmed = 0;
  let byesOpen = false;

  const save = () => { run.at = Date.now(); writeRun(storeKey, run); };

  function start(size) {
    // 고를 수 있었던 크기만 다음 기본값으로 기억한다 (캐릭터처럼 하나뿐인 곳이 기본값을 바꾸지 않게).
    // 2의 거듭제곱이 아닌 '전체'는 'all' 로 기억해 다른 월드컵에서도 전체가 기본이 되게 한다.
    if (options.length > 1) writeRun(prefKey, size === items.length && !isPow2(size) ? 'all' : size);
    run = { v: 2, size, entrants: drawEntrants(items.map(i => i.id), size), sides: '', finished: false, at: Date.now() };
    state = bracket(run.entrants, run.sides);
    last = null;
    byesOpen = false;
    save();
    preload(run.entrants.slice(0, 4).map(id => byId.get(id)));
    draw(true);
  }

  function abandon() {
    writeRun(storeKey, null);
    run = null;
    state = null;
    last = null;
    draw(true);
  }

  function pick(side) {
    if (!run || !state?.current) return;
    const m = state.current;
    const winner = byId.get(side ? m.b : m.a), loser = byId.get(side ? m.a : m.b);
    run.sides += side ? '1' : '0';
    state = bracket(run.entrants, run.sides);
    last = { winner, loser };
    if (state.done) run.finished = true;
    save();
    opts.onMatch?.({ winner, loser, size: run.size, round: m.round });
    if (state.done) {
      opts.onFinish?.({
        champion: byId.get(state.champion), runnerUp: byId.get(state.runnerUp),
        entrants: [...run.entrants], size: run.size,
        matches: matchPairs(state),
      });
    }
    draw(state.done);
  }

  function undo() {
    if (!run || !run.sides.length || run.finished) return;
    run.sides = run.sides.slice(0, -1);
    state = bracket(run.entrants, run.sides);
    last = null;
    save();
    draw();
  }

  // ---- 화면 ----

  // 항목 그림. 못 불러오면 imgFallback 의 그림으로 한 번 바꾼다.
  function pic(item, attrs) {
    const el = h('img', { src: item.img, alt: '', ...attrs });
    const fb = opts.imgFallback?.(item);
    if (fb && fb !== item.img) el.addEventListener('error', () => { el.src = fb; }, { once: true });
    return el;
  }

  // 고른 크기의 설명: 무작위 추첨 / 전체(예선·부전승)
  function sizeNote(n) {
    if (n < items.length) return t('wc.drawNote', { total: items.length, n });
    const p = plan(n);
    if (!p.prelims) return t('wc.allNote', { n });
    return t('wc.allByeNote', { n, k: p.prelims, b: p.byes, p: p.P });
  }

  function drawPicker() {
    if (!options.length) {
      return h('section', { class: 'empty cup-empty' },
        h('h2', {}, t('wc.tooFew')),
        h('p', {}, t('wc.tooFewBody', { n: MIN_SIZE, have: items.length })));
    }
    const buttons = h('div', { class: 'cup-sizes', role: 'radiogroup', 'aria-label': t('wc.sizeAria') },
      options.map(o => h('button', {
        type: 'button',
        class: `cup-size${o.n === chosen ? ' on' : ''}${o.full ? ' is-full' : ''}`, role: 'radio', 'aria-checked': String(o.n === chosen),
        onclick: () => { chosen = o.n; draw(); },
        ondblclick: () => start(o.n),
      },
        h('strong', {}, o.full && !isPow2(o.n) ? t('wc.sizeAll', { n: o.n }) : t('wc.size', { n: o.n })),
        h('span', {}, o.prelims ? t('wc.sizeMatchesPrelim', { n: o.matches, k: o.prelims }) : t('wc.sizeMatches', { n: o.matches })),
        o.full && isPow2(o.n) && options.length > 1 ? h('em', {}, t('wc.allBadge')) : null)));
    return h('section', { class: 'cup-picker' },
      h('h2', { class: 'vs-question' }, opts.question),
      h('p', { class: 'cup-picker-lead' }, t('wc.pickSize')),
      buttons,
      h('p', { class: 'help cup-picker-note' }, sizeNote(chosen),
        chosen - 1 >= 100 ? [' ', t('wc.longNote', { n: chosen - 1 })] : null),
      h('p', { class: 'cup-start-wrap' },
        h('button', { type: 'button', class: 'btn primary cup-start', onclick: () => start(chosen) }, t('wc.start', { size: sizeLabel(chosen) }))),
    );
  }

  function side(item, i) {
    return h('div', { class: `vs-side vs-${i ? 'right' : 'left'}` },
      h('button', {
        type: 'button', class: 'vs-pick', 'aria-label': t('wc.pickAria', { name: item.name }),
        onclick: () => pick(i),
      },
        h('span', { class: `vs-media kind-${kind}` },
          item.img ? pic(item, { decoding: 'async', draggable: 'false' }) : h('span', { class: 'vs-noimg', 'aria-hidden': 'true' }, Array.from(item.name || '?')[0])),
        h('span', { class: 'vs-name' }, item.name),
        opts.extra?.(item) ?? null,
        h('span', { class: 'vs-key kbd-only', 'aria-hidden': 'true' }, i ? '→' : '←'),
      ),
      opts.onDetail ? h('button', { type: 'button', class: 'btn ghost small vs-info', onclick: () => opts.onDetail(item) }, t('wc.detail')) : null,
    );
  }

  // 예선 동안: 부전승으로 바로 P강에 오른 항목들 (많으면 앞의 몇 개 + '모두 보기')
  function drawByes() {
    const byes = state.byes;
    if (!byes.length || state.current?.round !== 'pre') return null;
    const names = byes.map(id => byId.get(id)?.name ?? '?');
    const shown = byesOpen ? names : names.slice(0, BYES_SHOWN);
    const rest = names.length - shown.length;
    return h('p', { class: 'cup-byes' },
      h('span', { class: 'cup-byes-label' }, t('wc.byes', { n: byes.length, p: state.plan.P })), ' ',
      h('span', { class: 'cup-byes-names' }, shown.join(', ')),
      rest > 0 ? [' ', h('button', { type: 'button', class: 'linkish cup-byes-more', onclick: () => { byesOpen = true; draw(); } }, t('wc.byesMore', { n: rest }))] : null);
  }

  function drawMatch() {
    const m = state.current;
    const pct = Math.round((state.played / state.total) * 100);
    // 다음 경기 두 개의 그림을 미리 받아 둔다
    const ahead = state.matches.filter(x => x.w === undefined && x !== m && x.a && x.b).slice(0, 2);
    preload(ahead.flatMap(x => [byId.get(x.a), byId.get(x.b)]));
    const abandonBtn = h('button', {
      type: 'button',
      class: `btn ghost small cup-abandon${abandonArmed ? ' armed' : ''}`,
      onclick: () => {
        if (abandonArmed) { clearTimeout(abandonArmed); abandonArmed = 0; abandon(); return; }
        abandonArmed = setTimeout(() => { abandonArmed = 0; abandonBtn.classList.remove('armed'); abandonBtn.textContent = t('wc.abandon'); }, 3000);
        abandonBtn.classList.add('armed');
        abandonBtn.textContent = t('wc.abandonConfirm');
      },
    }, abandonArmed ? t('wc.abandonConfirm') : t('wc.abandon'));
    return h('section', { class: 'vs-arena cup-run' },
      h('div', { class: 'cup-bar' },
        h('div', { class: 'cup-status' },
          h('span', { class: 'cup-round', 'aria-live': 'polite' }, matchLabel(m)),
          h('span', { class: 'cup-count' }, t('wc.progress', { n: state.played, total: state.total, size: sizeLabel(run.size) }))),
        h('div', {
          class: 'cup-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(state.total),
          'aria-valuenow': String(state.played), 'aria-label': t('wc.progressAria'),
        }, h('span', { style: { width: `${pct}%` } })),
        h('div', { class: 'cup-tools' },
          h('button', { type: 'button', class: 'btn ghost small cup-undo', disabled: run.sides.length ? null : true, onclick: undo },
            h('span', { 'aria-hidden': 'true' }, '↶ '), t('wc.undo')),
          abandonBtn),
      ),
      drawByes(),
      h('h2', { class: 'vs-question' }, opts.question),
      h('div', { class: `vs-pair kind-${kind}` },
        side(byId.get(m.a), 0),
        h('div', { class: 'vs-mid', 'aria-hidden': 'true' }, 'VS'),
        side(byId.get(m.b), 1),
      ),
      h('p', { class: 'vs-last', 'aria-live': 'polite' },
        last ? [h('span', { class: 'vs-last-label' }, t('wc.lastLabel')), ' ', h('strong', {}, last.winner.name), ' > ', last.loser.name] : ''),
      h('p', { class: 'vs-keys kbd-only' }, t('wc.keys')),
    );
  }

  const mini = item => (opts.mini ? opts.mini(item)
    : h('span', { class: 'cup-mini' }, item.img ? pic(item, { loading: 'lazy' }) : Array.from(item.name || '?')[0]));

  function drawChampion() {
    const champ = byId.get(state.champion);
    const runner = byId.get(state.runnerUp);
    const road = roadOf(state, champ.id);
    return h('section', { class: 'cup-champ' },
      h('p', { class: 'cup-champ-kicker' }, t('wc.champKicker', { size: sizeLabel(run.size) })),
      h('h2', { class: 'cup-champ-title' }, h('span', { 'aria-hidden': 'true' }, '🏆 '), t('wc.champion')),
      h('div', { class: `cup-champ-card kind-${kind}` },
        h('span', { class: `vs-media kind-${kind}` },
          champ.img ? pic(champ, { decoding: 'async' }) : h('span', { class: 'vs-noimg', 'aria-hidden': 'true' }, Array.from(champ.name || '?')[0])),
        h('span', { class: 'vs-name cup-champ-name' }, champ.name),
        opts.extra?.(champ) ?? null,
        opts.onDetail ? h('button', { type: 'button', class: 'btn ghost small', onclick: () => opts.onDetail(champ) }, t('wc.detail')) : null,
      ),
      h('div', { class: 'cup-after' },
        h('section', { class: 'cup-road' },
          h('h3', {}, t('wc.road')),
          h('ol', {}, road.map(r => {
            if (r.bye) {
              return h('li', { class: 'bye' },
                h('span', { class: 'cup-road-round' }, roundName(r.round)),
                h('span', { class: 'cup-road-name' }, t('wc.byeRoad')));
            }
            const o = byId.get(r.opponent);
            return h('li', { class: r.round === 2 ? 'final' : null },
              h('span', { class: 'cup-road-round' }, roundName(r.round)),
              mini(o),
              h('span', { class: 'cup-road-name' }, t('wc.beat', { name: o.name })),
            );
          }))),
        h('section', { class: 'cup-runner' },
          h('h3', {}, t('wc.runnerUp')),
          h('div', { class: 'cup-runner-row' }, mini(runner), h('span', { class: 'cup-road-name' }, runner.name))),
      ),
      h('p', { class: 'actions cup-actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => start(run.size) }, t('wc.again', { size: sizeLabel(run.size) })),
        h('button', { type: 'button', class: 'btn', onclick: abandon }, t('wc.otherSize')),
        opts.onRank ? h('button', { type: 'button', class: 'btn', onclick: () => opts.onRank() }, t('wc.toRank')) : null,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => saveImage(champ, runner) }, t('wc.saveImage')),
      ),
    );
  }

  async function saveImage(champ, runner) {
    try {
      const blob = await championImage({ title: opts.title, size: sizeLabel(run.size), champ, runner, fallback: opts.imgFallback?.(champ) });
      const url = URL.createObjectURL(blob);
      const name = `${opts.title || 'worldcup'} - ${champ.name}`.replace(/[\\/:*?"<>|]/g, '_');
      const a = h('a', { href: url, download: `${name}.png` });
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

  function draw(scroll) {
    hideTip();
    if (abandonArmed) { clearTimeout(abandonArmed); abandonArmed = 0; }
    el.replaceChildren(!run ? drawPicker() : state.done ? drawChampion() : drawMatch());
    if (scroll) {
      const top = el.getBoundingClientRect().top;
      if (top < 0) el.scrollIntoView({ block: 'start' });
    }
  }

  function onKey(e) {
    if (!el.isConnected || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (document.body.classList.contains('modal-open')) return;
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName))) return;
    if (run && state?.current) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); pick(0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pick(1); }
      else if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); }
    } else if (!run && options.length && e.key === 'Enter' && tg === document.body) {
      e.preventDefault();
      start(chosen);
    }
  }
  document.addEventListener('keydown', onKey);

  draw();
  return {
    el,
    destroy() {
      document.removeEventListener('keydown', onKey);
      clearTimeout(abandonArmed);
    },
    get running() { return Boolean(run && !run.finished); },
  };
}

// ---- 우승 이미지 (공유용 PNG) ----

function loadImage(src) {
  return new Promise(resolve => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function championImage({ title, size, champ, runner, fallback }) {
  const W = 720, H = 900;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font-game').trim() || 'sans-serif';
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2a1f10');
  bg.addColorStop(1, '#0f1116');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(240, 199, 106, .55)';
  g.lineWidth = 3;
  g.strokeRect(14, 14, W - 28, H - 28);
  g.textAlign = 'center';
  g.fillStyle = '#c9b48a';
  g.font = `600 26px ${font}`;
  g.fillText(title || '', W / 2, 70, W - 80);
  g.fillStyle = '#f0c76a';
  g.font = `700 54px ${font}`;
  g.fillText(`🏆 ${t('wc.champion')}`, W / 2, 140, W - 80);
  g.fillStyle = '#a99a7c';
  g.font = `500 22px ${font}`;
  g.fillText(t('wc.champKicker', { size }), W / 2, 178, W - 80);

  const img = (await loadImage(champ.img)) || (fallback ? await loadImage(fallback) : null);
  const box = { x: 90, y: 210, w: W - 180, h: 500 };
  if (img) {
    const s = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const w = img.naturalWidth * s, hh = img.naturalHeight * s;
    g.drawImage(img, box.x + (box.w - w) / 2, box.y + (box.h - hh) / 2, w, hh);
  } else {
    g.fillStyle = '#2b2f38';
    g.fillRect(box.x + box.w / 2 - 120, box.y + 100, 240, 300);
  }
  g.fillStyle = '#f0c76a';
  g.font = `700 44px ${font}`;
  g.fillText(champ.name, W / 2, 770, W - 80);
  if (runner) {
    g.fillStyle = '#a99a7c';
    g.font = `500 24px ${font}`;
    g.fillText(`${t('wc.runnerUp')}: ${runner.name}`, W / 2, 818, W - 80);
  }
  g.fillStyle = 'rgba(255, 255, 255, .35)';
  g.font = `500 18px ${font}`;
  g.fillText(location.host || '', W / 2, H - 36, W - 80);
  return new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}
