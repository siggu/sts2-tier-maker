// 이상형 월드컵 엔진: 대진(무작위 추첨) → 라운드별 1:1 선택 → 우승.
// 게임 데이터와 무관하다. 항목은 { id, name, img? } 이면 되고, 보여 줄 덧붙임·자세히 보기·결과 보내기는
// 부르는 쪽이 콜백으로 넘긴다 (play.js 의 카드·유물 월드컵, 나중에는 사용자가 만든 월드컵).
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
//     onFinish: ({ champion, runnerUp, entrants, size }) => {},  // 판이 끝날 때 한 번
//     onRank: () => {},                          // 있으면 우승 화면에 '순위 보기'
//   });
//   target.replaceChildren(cup.el);  …  cup.destroy();
//
// 판 상태는 { size, entrants: [id...](대진 순서), picks: [이긴 id...](경기 순서), finished, at } 뿐이고
// 나머지(라운드, 지금 경기, 우승까지의 길)는 bracket() 이 entrants·picks 에서 다시 계산한다.
// 그래서 되돌리기는 picks.pop(), 이어 하기는 저장본을 읽기만 하면 된다.

import { h, hideTip, toast } from './ui.js';
import { t } from './i18n.js';

export const SIZES = [4, 8, 16, 32, 64];
const DEFAULT_MAX = 16;
const RESUME_FINISHED_MS = 60 * 60 * 1000; // 끝난 판의 우승 화면은 1시간 동안만 다시 보여 준다

export const sizesFor = n => SIZES.filter(s => s <= n);
export function defaultSize(n, preferred) {
  const ok = sizesFor(n);
  if (ok.includes(preferred)) return preferred;
  return ok.filter(s => s <= DEFAULT_MAX).pop() ?? null;
}

// ids 에서 size 개를 무작위로 뽑아 섞는다 (Fisher–Yates).
export function drawEntrants(ids, size, rand = Math.random) {
  const a = [...new Set(ids)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, size);
}

// entrants·picks → 경기 목록과 지금 경기. picks 가 대진과 맞지 않으면 null.
// matches[i] = { a, b, w?, size(그 라운드의 강), idx(라운드 안 0부터), of(라운드 경기 수) }
export function bracket(entrants, picks) {
  if (!Array.isArray(entrants) || !SIZES.includes(entrants.length) || new Set(entrants).size !== entrants.length) return null;
  if (!Array.isArray(picks) || picks.length > entrants.length - 1) return null;
  const matches = [];
  let round = entrants;
  let p = 0;
  let current = null;
  while (round.length > 1) {
    const next = [];
    const of = round.length / 2;
    for (let idx = 0; idx < of; idx++) {
      const a = round[idx * 2], b = round[idx * 2 + 1];
      const m = { a, b, size: round.length, idx, of };
      if (current || p >= picks.length) {
        // 아직 정해지지 않은 경기: 양쪽이 다 알려진 경우만 의미가 있다
        current ??= m;
        matches.push(m);
        next.push(undefined);
        continue;
      }
      const w = picks[p++];
      if (w !== a && w !== b) return null;
      m.w = w;
      matches.push(m);
      next.push(w);
    }
    round = next;
  }
  const done = !current;
  const final = matches[matches.length - 1];
  return {
    matches,
    current,
    played: picks.length,
    total: entrants.length - 1,
    done,
    champion: done ? final.w : null,
    runnerUp: done ? (final.w === final.a ? final.b : final.a) : null,
  };
}

// 우승 항목이 라운드마다 이긴 상대: [{ size, opponent }]
export function roadOf(b, id) {
  return b.matches.filter(m => m.w === id).map(m => ({ size: m.size, opponent: m.a === id ? m.b : m.a }));
}

// 라운드 이름: 결승·준결승·8강·16강…
export function roundName(size) {
  if (size === 2) return t('wc.round.final');
  if (size === 4) return t('wc.round.semi');
  if (size === 8) return t('wc.round.quarter');
  return t('wc.round.n', { n: size });
}
const matchLabel = m => (m.of > 1 ? t('wc.match', { round: roundName(m.size), i: m.idx + 1, of: m.of }) : roundName(m.size));

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
      if (run && !run.finished && Array.isArray(run.picks)) return true;
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

export function mountWorldCup(opts) {
  const { storeKey, items, kind = 'custom' } = opts;
  const byId = new Map(items.map(i => [i.id, i]));
  const sizes = sizesFor(items.length);
  const el = h('div', { class: 'cup' });
  const prefKey = 'sts2wc.size';
  let pref = Number(readRun(prefKey)) || null;

  // 저장된 판: 모든 출전 항목이 지금 목록에 있고 대진이 맞아야 이어 한다
  let run = readRun(storeKey);
  let state = run && run.entrants?.every?.(id => byId.has(id)) ? bracket(run.entrants, run.picks) : null;
  if (!state || (run.finished && !(Date.now() - Number(run.at) < RESUME_FINISHED_MS))) {
    if (run) writeRun(storeKey, null);
    run = null;
    state = null;
  }
  let chosen = defaultSize(items.length, run?.size ?? pref);
  let last = null; // 방금 경기 { winner, loser }
  let abandonArmed = 0;

  const save = () => { run.at = Date.now(); writeRun(storeKey, run); };

  function start(size) {
    pref = size;
    writeRun(prefKey, size);
    run = { v: 1, size, entrants: drawEntrants(items.map(i => i.id), size), picks: [], finished: false, at: Date.now() };
    state = bracket(run.entrants, run.picks);
    last = null;
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
    run.picks.push(winner.id);
    state = bracket(run.entrants, run.picks);
    last = { winner, loser };
    if (state.done) run.finished = true;
    save();
    opts.onMatch?.({ winner, loser, size: m.size });
    if (state.done) {
      opts.onFinish?.({
        champion: byId.get(state.champion), runnerUp: byId.get(state.runnerUp),
        entrants: [...run.entrants], size: run.size,
      });
    }
    draw(state.done);
  }

  function undo() {
    if (!run || !run.picks.length || run.finished) return;
    run.picks.pop();
    state = bracket(run.entrants, run.picks);
    last = null;
    save();
    draw();
  }

  // ---- 화면 ----

  function drawPicker() {
    if (!sizes.length) {
      return h('section', { class: 'empty cup-empty' },
        h('h2', {}, t('wc.tooFew')),
        h('p', {}, t('wc.tooFewBody', { n: SIZES[0], have: items.length })));
    }
    const buttons = h('div', { class: 'cup-sizes', role: 'radiogroup', 'aria-label': t('wc.sizeAria') },
      sizes.map(n => h('button', {
        class: `cup-size${n === chosen ? ' on' : ''}`, role: 'radio', 'aria-checked': String(n === chosen),
        onclick: () => { chosen = n; draw(); },
        ondblclick: () => start(n),
      },
        h('strong', {}, t('wc.size', { n })),
        h('span', {}, t('wc.sizeMatches', { n: n - 1 })))));
    return h('section', { class: 'cup-picker' },
      h('h2', { class: 'vs-question' }, opts.question),
      h('p', { class: 'cup-picker-lead' }, t('wc.pickSize')),
      buttons,
      h('p', { class: 'help cup-picker-note' }, t('wc.drawNote', { total: items.length, n: chosen })),
      h('p', { class: 'cup-start-wrap' },
        h('button', { class: 'btn primary cup-start', onclick: () => start(chosen) }, t('wc.start', { size: t('wc.size', { n: chosen }) }))),
    );
  }

  function side(item, i) {
    return h('div', { class: `vs-side vs-${i ? 'right' : 'left'}` },
      h('button', {
        class: 'vs-pick', 'aria-label': t('wc.pickAria', { name: item.name }),
        onclick: () => pick(i),
      },
        h('span', { class: `vs-media kind-${kind}` },
          item.img ? h('img', { src: item.img, alt: '', decoding: 'async', draggable: 'false' }) : h('span', { class: 'vs-noimg', 'aria-hidden': 'true' }, Array.from(item.name || '?')[0])),
        h('span', { class: 'vs-name' }, item.name),
        opts.extra?.(item) ?? null,
        h('span', { class: 'vs-key kbd-only', 'aria-hidden': 'true' }, i ? '→' : '←'),
      ),
      opts.onDetail ? h('button', { class: 'btn ghost small vs-info', onclick: () => opts.onDetail(item) }, t('wc.detail')) : null,
    );
  }

  function drawMatch() {
    const m = state.current;
    const pct = Math.round((state.played / state.total) * 100);
    // 다음 경기 두 개의 그림을 미리 받아 둔다
    const ahead = state.matches.filter(x => x.w === undefined && x !== m && x.a && x.b).slice(0, 2);
    preload(ahead.flatMap(x => [byId.get(x.a), byId.get(x.b)]));
    const abandonBtn = h('button', {
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
          h('span', { class: 'cup-count' }, t('wc.progress', { n: state.played, total: state.total, size: t('wc.size', { n: run.size }) }))),
        h('div', {
          class: 'cup-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(state.total),
          'aria-valuenow': String(state.played), 'aria-label': t('wc.progressAria'),
        }, h('span', { style: { width: `${pct}%` } })),
        h('div', { class: 'cup-tools' },
          h('button', { class: 'btn ghost small cup-undo', disabled: run.picks.length ? null : true, onclick: undo },
            h('span', { 'aria-hidden': 'true' }, '↶ '), t('wc.undo')),
          abandonBtn),
      ),
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
    : h('span', { class: 'cup-mini' }, item.img ? h('img', { src: item.img, alt: '', loading: 'lazy' }) : Array.from(item.name || '?')[0]));

  function drawChampion() {
    const champ = byId.get(state.champion);
    const runner = byId.get(state.runnerUp);
    const road = roadOf(state, champ.id);
    return h('section', { class: 'cup-champ' },
      h('p', { class: 'cup-champ-kicker' }, t('wc.champKicker', { size: t('wc.size', { n: run.size }) })),
      h('h2', { class: 'cup-champ-title' }, h('span', { 'aria-hidden': 'true' }, '🏆 '), t('wc.champion')),
      h('div', { class: `cup-champ-card kind-${kind}` },
        h('span', { class: `vs-media kind-${kind}` },
          champ.img ? h('img', { src: champ.img, alt: '', decoding: 'async' }) : h('span', { class: 'vs-noimg', 'aria-hidden': 'true' }, Array.from(champ.name || '?')[0])),
        h('span', { class: 'vs-name cup-champ-name' }, champ.name),
        opts.extra?.(champ) ?? null,
        opts.onDetail ? h('button', { class: 'btn ghost small', onclick: () => opts.onDetail(champ) }, t('wc.detail')) : null,
      ),
      h('div', { class: 'cup-after' },
        h('section', { class: 'cup-road' },
          h('h3', {}, t('wc.road')),
          h('ol', {}, road.map(r => {
            const o = byId.get(r.opponent);
            return h('li', { class: r.size === 2 ? 'final' : null },
              h('span', { class: 'cup-road-round' }, roundName(r.size)),
              mini(o),
              h('span', { class: 'cup-road-name' }, t('wc.beat', { name: o.name })),
            );
          }))),
        h('section', { class: 'cup-runner' },
          h('h3', {}, t('wc.runnerUp')),
          h('div', { class: 'cup-runner-row' }, mini(runner), h('span', { class: 'cup-road-name' }, runner.name))),
      ),
      h('p', { class: 'actions cup-actions' },
        h('button', { class: 'btn primary', onclick: () => start(run.size) }, t('wc.again', { size: t('wc.size', { n: run.size }) })),
        h('button', { class: 'btn', onclick: abandon }, t('wc.otherSize')),
        opts.onRank ? h('button', { class: 'btn', onclick: () => opts.onRank() }, t('wc.toRank')) : null,
        h('button', { class: 'btn ghost', onclick: () => saveImage(champ, runner) }, t('wc.saveImage')),
      ),
    );
  }

  async function saveImage(champ, runner) {
    try {
      const blob = await championImage({ title: opts.title, size: run.size, champ, runner });
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
    } else if (!run && sizes.length && e.key === 'Enter' && tg === document.body) {
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

async function championImage({ title, size, champ, runner }) {
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
  g.fillText(t('wc.champKicker', { size: t('wc.size', { n: size }) }), W / 2, 178, W - 80);

  const img = await loadImage(champ.img);
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
