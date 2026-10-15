// 월드컵 대진 계산 (DOM·문구 없음 — node 시험에서 그대로 불러 쓴다: tools/test/bracket.test.mjs).
// worldcup.js 엔진이 쓰고, 서버(api/src/bracket.js)가 같은 규칙으로 결과를 검사·집계한다.
//
// 출전 n개, P = n 이하의 가장 큰 2의 거듭제곱, k = n − P.
//   entrants[0 .. 2k) 는 둘씩 예선 k경기 (예선 j = entrants[2j] vs entrants[2j+1]),
//   entrants[2k .. n) 의 P − k 개는 부전승으로 바로 P강.
//   P강 자리는 '예선 승자 vs 부전승' 짝을 먼저 만들고(mainSlots), 남는 자리는 같은 쪽끼리.
// 경기는 라운드 순서로 치른다: 예선 k경기 → P강 P/2경기 → … → 결승. 모두 n − 1 경기.
//
// 진행은 sides 문자열 하나로 저장한다: 경기마다 '0'(왼쪽 a 승) / '1'(오른쪽 b 승). 502개 판도 501글자.

export const MIN_SIZE = 4;       // 화면이 고르게 하는 가장 작은 대진
export const MAX_ENTRANTS = 512; // 한 판 출전 상한 (서버와 같다)
export const DEFAULT_MAX = 16;   // 기본 선택: 전체가 이 이하면 '전체', 아니면 이 이하의 가장 큰 2의 거듭제곱

export const isPow2 = n => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

// n 개 출전 → { n, P, prelims: k, byes: P − k, rounds: R }. R = log2(P) + (예선이 있으면 1).
export function plan(n) {
  let P = 1;
  while (P * 2 <= n) P *= 2;
  const prelims = n - P;
  return { n, P, prelims, byes: P - prelims, rounds: Math.log2(P) + (prelims > 0 ? 1 : 0) };
}

// 항목 total 개로 할 수 있는 대진: 4 ≤ 2의 거듭제곱 ≤ total, 그리고 total 이 2의 거듭제곱이 아니면 '전체'(total).
// [{ n, full, matches, prelims }]. 출전 상한(512)을 넘는 크기는 뺀다.
export function sizeOptions(total, max = MAX_ENTRANTS) {
  const out = [];
  for (let s = MIN_SIZE; s <= total && s <= max; s *= 2) out.push({ n: s, full: s === total, matches: s - 1, prelims: 0 });
  if (total >= MIN_SIZE && total <= max && !isPow2(total)) out.push({ n: total, full: true, matches: total - 1, prelims: plan(total).prelims });
  return out;
}
export const sizesFor = (total, max) => sizeOptions(total, max).map(o => o.n);

// 기본 크기: preferred('all' 또는 수)가 지금 고를 수 있으면 그것, 아니면 전체 ≤ 16 이면 전체, 아니면 16 이하의 가장 큰 2의 거듭제곱.
const PREF_MAX = 64;

export function defaultSize(total, preferred, max) {
  const ok = sizesFor(total, max);
  if (!ok.length) return null;
  const full = ok.includes(total) ? total : null;
  // 지난번 고른 크기는 다른 묶음에도 이어지지만, 64개를 넘는 긴 판을 저절로 고르지는 않는다
  // (캐릭터에서 '전체'를 골랐다고 유물 297개 전체가 기본으로 잡히면 곤란하다).
  if (preferred === 'all' && full && full <= PREF_MAX) return full;
  if (ok.includes(Number(preferred)) && Number(preferred) <= PREF_MAX) return Number(preferred);
  if (full && full <= DEFAULT_MAX) return full;
  return ok.filter(s => s <= DEFAULT_MAX && isPow2(s)).pop() ?? ok[0];
}

// ids 에서 size 개를 무작위로 뽑아 섞는다 (Fisher–Yates). 섞인 순서 그대로가 대진이다 (앞쪽이 예선, 뒤쪽이 부전승).
export function drawEntrants(ids, size, rand = Math.random) {
  const a = [...new Set(ids)];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, size);
}

// P강 자리 P개: { pre: j } (예선 j 의 승자) 또는 { bye: i } (부전승 i 번째). 짝(2t, 2t+1)마다 예선 승자와 부전승을 먼저 맞붙인다.
export function mainSlots(prelims, byes) {
  const slots = [];
  let w = 0, y = 0;
  for (let t = 0; t < (prelims + byes) / 2; t++) {
    slots.push(w < prelims ? { pre: w++ } : { bye: y++ });
    slots.push(y < byes ? { bye: y++ } : { pre: w++ });
  }
  return slots;
}

// entrants·sides → 경기 목록과 지금 경기. 맞지 않으면 null.
// matches[i] = { a, b, w?, round: 'pre' | 그 라운드의 강(P, P/2, …, 2), idx(라운드 안 0부터), of(라운드 경기 수) }
// → { matches, current, played, total, done, champion, runnerUp, byes: [부전승 id], plan }
export function bracket(entrants, sides = '') {
  if (!Array.isArray(entrants) || entrants.length < 2 || new Set(entrants).size !== entrants.length) return null;
  if (typeof sides !== 'string' || sides.length > entrants.length - 1 || /[^01]/.test(sides)) return null;
  const pl = plan(entrants.length);
  const matches = [];
  let p = 0;
  let current = null;
  const play = (a, b, round, idx, of) => {
    const m = { a, b, round, idx, of };
    matches.push(m);
    if (current || p >= sides.length) { current ??= m; return undefined; }
    m.w = sides[p++] === '1' ? b : a;
    return m.w;
  };
  const k = pl.prelims;
  const pre = [];
  for (let j = 0; j < k; j++) pre.push(play(entrants[2 * j], entrants[2 * j + 1], 'pre', j, k));
  const byes = entrants.slice(2 * k);
  let round = k ? mainSlots(k, pl.byes).map(s => (s.bye !== undefined ? byes[s.bye] : pre[s.pre])) : entrants;
  while (round.length > 1) {
    const next = [];
    const of = round.length / 2;
    for (let idx = 0; idx < of; idx++) next.push(play(round[idx * 2], round[idx * 2 + 1], round.length, idx, of));
    round = next;
  }
  const done = !current;
  const final = matches[matches.length - 1];
  return {
    matches, current, played: p, total: entrants.length - 1, done,
    champion: done ? final.w : null,
    runnerUp: done ? (final.w === final.a ? final.b : final.a) : null,
    byes: k ? byes : [],
    plan: pl,
  };
}

// 예전 저장본(이긴 id 목록) → sides 문자열. 맞지 않으면 null.
export function sidesFromWinners(entrants, winners) {
  if (!Array.isArray(winners)) return null;
  let sides = '';
  for (const w of winners) {
    const b = bracket(entrants, sides);
    const m = b?.current;
    if (!m || (w !== m.a && w !== m.b)) return null;
    sides += w === m.a ? '0' : '1';
  }
  return sides;
}

// 끝난 판 → [[이긴 id, 진 id], …] (치른 순서, 서버로 보내는 모양)
export const matchPairs = b => b.matches.filter(m => m.w !== undefined).map(m => [m.w, m.w === m.a ? m.b : m.a]);

// 끝난 판의 수치 (서버 api/src/bracket.js 의 bracketStats 와 같은 계산): expected = 1/n,
// items[id] = { w: 이긴 경기, l: 진 경기, p: (이긴 라운드 + 부전승) ÷ 전체 라운드 }
export function runStats(entrants, pairs) {
  const { prelims, rounds } = plan(entrants.length);
  const items = Object.fromEntries(entrants.map(id => [id, { w: 0, l: 0, p: 0 }]));
  const inPrelim = new Set(pairs.slice(0, prelims).flat());
  for (const [w, l] of pairs) { items[w].w++; items[l].l++; }
  for (const id of entrants) items[id].p = (items[id].w + (prelims > 0 && !inPrelim.has(id) ? 1 : 0)) / rounds;
  return { expected: 1 / entrants.length, items };
}

// 순위 화면 수치. row = { champ, entries, expected, progress, tracked, trackedChamp } (서버 응답)
//   index    우승 지수 = 우승 ÷ 기대 우승 (대진 크기를 반영한 뒤의 판만). 기록이 없으면 null.
//   progress 평균 진출도 0–1. 기록이 없으면 null.
//   rate     예전 우승률 champ ÷ entries (전체 기간). 출전이 없으면 null.
export function cupMetrics(row) {
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const expected = num(row?.expected), tracked = num(row?.tracked), entries = num(row?.entries);
  return {
    index: expected > 0 ? num(row?.trackedChamp) / expected : null,
    progress: tracked > 0 ? Math.min(1, Math.max(0, num(row?.progress) / tracked)) : null,
    rate: entries > 0 ? num(row?.champ) / entries : null,
    tracked,
  };
}
