// 월드컵 대진 계산 (site/js/bracket.js) 시험. 화면이 만든 판을 서버 검사(api/src/bracket.js)가 그대로 받는지,
// 화면과 서버의 수치(우승 기대·진출도) 계산이 같은지도 맞춰 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
// site/js 에는 package.json 이 없어 node 가 ESM 으로 읽지 못할 수 있으므로 소스를 data: 모듈로 불러온다 (bracket.js 는 import 가 없다).
async function load(file) {
  const src = await readFile(join(ROOT, file), 'utf8');
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(src)}`);
}
const B = await load('site/js/bracket.js');
const S = await import(new URL('../../api/src/bracket.js', import.meta.url));

const ids = n => Array.from({ length: n }, (_, i) => `x${i}`);
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
// 판 하나를 끝까지: 경기마다 rand 로 왼쪽/오른쪽
function playOut(entrants, rand) {
  let sides = '';
  for (;;) {
    const b = B.bracket(entrants, sides);
    if (b.done) return { b, sides };
    sides += rand() < 0.5 ? '0' : '1';
  }
}

test('계획·크기 고르기', () => {
  assert.deepEqual(B.plan(5), { n: 5, P: 4, prelims: 1, byes: 3, rounds: 3 });
  assert.deepEqual(B.plan(37), { n: 37, P: 32, prelims: 5, byes: 27, rounds: 6 });
  for (const n of [2, 3, 5, 6, 12, 37, 64, 128, 297, 502]) {
    const { n: _, ...c } = B.plan(n);
    assert.deepEqual(c, S.bracketPlan(n), `n=${n}`);
  }
  const opt = n => B.sizeOptions(n).map(o => (o.full && !B.isPow2(o.n) ? `all${o.n}/${o.prelims}` : o.n));
  assert.deepEqual(opt(3), []);
  assert.deepEqual(opt(4), [4]);
  assert.deepEqual(opt(5), [4, 'all5/1']);            // 캐릭터 5개: 4강 + 전체 5개
  assert.deepEqual(opt(8), [4, 8]);
  assert.deepEqual(opt(37), [4, 8, 16, 32, 'all37/5']);
  assert.deepEqual(opt(297), [4, 8, 16, 32, 64, 128, 256, 'all297/41']); // 유물
  assert.deepEqual(opt(502), [4, 8, 16, 32, 64, 128, 256, 'all502/246']); // 카드 전체
  assert.deepEqual(opt(512), [4, 8, 16, 32, 64, 128, 256, 512]);
  assert.deepEqual(opt(600), [4, 8, 16, 32, 64, 128, 256, 512]);      // 512 넘는 전체는 없다
  assert.deepEqual(B.sizeOptions(5).map(o => o.matches), [3, 4]);
  assert.equal(B.sizeOptions(8).at(-1).full, true);
  assert.deepEqual(B.sizesFor(6), [4, 6]);

  // 기본: 고른 적 있는 크기 → 전체 ≤ 16 이면 전체 → 16 이하의 가장 큰 2의 거듭제곱
  assert.equal(B.defaultSize(5, null), 5);
  assert.equal(B.defaultSize(12, null), 12);
  assert.equal(B.defaultSize(16, null), 16);
  assert.equal(B.defaultSize(37, null), 16);
  assert.equal(B.defaultSize(64, null), 16);
  assert.equal(B.defaultSize(502, null), 16);
  assert.equal(B.defaultSize(37, 32), 32);
  assert.equal(B.defaultSize(37, 'all'), 37);
  assert.equal(B.defaultSize(64, 'all'), 64);
  assert.equal(B.defaultSize(600, 'all'), 16);       // 전체를 고를 수 없으면 기본으로
  assert.equal(B.defaultSize(5, 32), 5);             // 32강이 없으면 기본
  assert.equal(B.defaultSize(5, 4), 4);
  assert.equal(B.defaultSize(3, null), null);
});

test('부전승 배치: 예선 승자와 부전승을 먼저 맞붙인다', () => {
  assert.deepEqual(B.mainSlots(1, 3), [{ pre: 0 }, { bye: 0 }, { bye: 1 }, { bye: 2 }]);
  assert.deepEqual(B.mainSlots(2, 2), [{ pre: 0 }, { bye: 0 }, { pre: 1 }, { bye: 1 }]);
  assert.deepEqual(B.mainSlots(3, 1), [{ pre: 0 }, { bye: 0 }, { pre: 1 }, { pre: 2 }]);
  for (const n of [5, 6, 7, 12, 37, 297, 502]) {
    const { prelims, byes } = B.plan(n);
    const slots = B.mainSlots(prelims, byes);
    assert.equal(slots.length, prelims + byes);
    assert.equal(new Set(slots.filter(s => 'pre' in s).map(s => s.pre)).size, prelims);
    assert.equal(new Set(slots.filter(s => 'bye' in s).map(s => s.bye)).size, byes);
  }
});

test('5개 전체: 예선 1경기, 부전승 3개, 모두 4경기', () => {
  const e = ['a', 'b', 'c', 'd', 'e'];
  let b = B.bracket(e, '');
  assert.deepEqual(b.byes, ['c', 'd', 'e']);
  assert.equal(b.total, 4);
  assert.deepEqual([b.current.a, b.current.b, b.current.round, b.current.idx, b.current.of], ['a', 'b', 'pre', 0, 1]);
  b = B.bracket(e, '1'); // b 가 예선 승
  assert.deepEqual([b.current.a, b.current.b, b.current.round, b.current.of], ['b', 'c', 4, 2]);
  b = B.bracket(e, '10');
  assert.deepEqual([b.current.a, b.current.b, b.current.round, b.current.idx], ['d', 'e', 4, 1]);
  b = B.bracket(e, '101');
  assert.deepEqual([b.current.a, b.current.b, b.current.round], ['b', 'e', 2]);
  b = B.bracket(e, '1011');
  assert.equal(b.done, true);
  assert.equal(b.champion, 'e');
  assert.equal(b.runnerUp, 'b');
  const pairs = B.matchPairs(b);
  assert.deepEqual(pairs, [['b', 'a'], ['b', 'c'], ['e', 'd'], ['e', 'b']]);
  assert.equal(S.checkBracket({ entrants: e, matches: pairs, champion: 'e' }, () => true, 5), null);
  const { expected, items } = B.runStats(e, pairs);
  assert.equal(expected, 0.2);
  const p = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, Math.round(v.p * 1000) / 1000]));
  assert.deepEqual(p, { a: 0, b: 0.667, c: 0.333, d: 0.333, e: 1 }); // e: 부전승 + 2승 = 우승
  // 잘못된 진행
  assert.equal(B.bracket(e, '10112'), null);
  assert.equal(B.bracket(e, '2'), null);
  assert.equal(B.bracket(['a', 'a', 'b', 'c'], ''), null);
  assert.equal(B.bracket(['a'], ''), null);
});

test('어떤 크기든: 화면이 치른 판을 서버가 받고, 수치 계산이 같다', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 9, 12, 16, 37, 63, 64, 100, 128, 297, 502, 512]) {
    for (const seed of [1, 2]) {
      const entrants = B.drawEntrants(ids(n), n, rng(seed * 31 + n));
      const { b, sides } = playOut(entrants, rng(seed * 7 + n));
      assert.equal(sides.length, n - 1);
      assert.equal(b.matches.length, n - 1);
      const k = B.plan(n).prelims;
      assert.ok(b.matches.slice(0, k).every(m => m.round === 'pre'));
      assert.ok(b.matches.slice(k).every(m => m.round !== 'pre'));
      assert.equal(b.byes.length, k ? B.plan(n).byes : 0);
      const pairs = B.matchPairs(b);
      assert.equal(S.checkBracket({ entrants, matches: pairs, champion: b.champion }, () => true, 512), null, `n=${n}`);
      const mine = B.runStats(entrants, pairs), theirs = S.bracketStats(entrants, pairs);
      assert.equal(mine.expected, theirs.expected);
      assert.deepEqual(mine.items, theirs.items);
      // 되돌리기·이어 하기: 이긴 id 목록(예전 저장본)에서 같은 sides 를 되찾는다
      assert.equal(B.sidesFromWinners(entrants, pairs.map(([w]) => w)), sides);
    }
  }
});

test('저장 크기: 502개 판도 진행은 한 글자씩', () => {
  const entrants = B.drawEntrants(ids(502), 502, rng(5));
  const { sides } = playOut(entrants, rng(9));
  assert.equal(sides.length, 501);
  const run = { v: 2, size: 502, entrants, sides, finished: true, at: 0 };
  assert.ok(JSON.stringify(run).length < 502 * 8 + 600);
});

test('순위 수치: 기록이 없으면 null (0 으로 나누지 않는다)', () => {
  assert.deepEqual(B.cupMetrics({ champ: 3, entries: 9 }), { index: null, progress: null, rate: 1 / 3, tracked: 0 });
  assert.deepEqual(B.cupMetrics({}), { index: null, progress: null, rate: null, tracked: 0 });
  const m = B.cupMetrics({ champ: 5, entries: 10, expected: 0.5, progress: 1.5, tracked: 3, trackedChamp: 1 });
  assert.equal(m.index, 2);
  assert.equal(m.progress, 0.5);
  assert.equal(B.cupMetrics({ expected: 0.25, tracked: 1, trackedChamp: 0 }).index, 0);
});
