import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bracketPlan, checkBracket, bracketStats, MAX_ENTRANTS } from '../src/bracket.js';
import { playBracket } from './helpers.js';

const ids = n => Array.from({ length: n }, (_, i) => `x${i}`);
const all = () => true;
// 결정적인 '무작위' 선택 (시험마다 같은 결과)
function seeded(seed) {
  let s = seed >>> 0;
  return (a, b) => { s = (s * 1664525 + 1013904223) >>> 0; return s & 0x10000 ? a : b; };
}

test('대진 계획: P, 예선, 부전승, 라운드', () => {
  assert.deepEqual(bracketPlan(2), { P: 2, prelims: 0, byes: 2, rounds: 1 });
  assert.deepEqual(bracketPlan(3), { P: 2, prelims: 1, byes: 1, rounds: 2 });
  assert.deepEqual(bracketPlan(4), { P: 4, prelims: 0, byes: 4, rounds: 2 });
  assert.deepEqual(bracketPlan(5), { P: 4, prelims: 1, byes: 3, rounds: 3 });
  assert.deepEqual(bracketPlan(6), { P: 4, prelims: 2, byes: 2, rounds: 3 });
  assert.deepEqual(bracketPlan(12), { P: 8, prelims: 4, byes: 4, rounds: 4 });
  assert.deepEqual(bracketPlan(37), { P: 32, prelims: 5, byes: 27, rounds: 6 });
  assert.deepEqual(bracketPlan(64), { P: 64, prelims: 0, byes: 64, rounds: 6 });
  assert.deepEqual(bracketPlan(128), { P: 128, prelims: 0, byes: 128, rounds: 7 });
  assert.deepEqual(bracketPlan(297), { P: 256, prelims: 41, byes: 215, rounds: 9 });
  assert.deepEqual(bracketPlan(502), { P: 256, prelims: 246, byes: 10, rounds: 9 });
  assert.equal(MAX_ENTRANTS, 512);
});

test('대진 검사: 크기마다 올바른 판은 통과', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 12, 37, 64, 100, 128, 297, 502, 512]) {
    for (const seed of [1, 2, 3]) {
      const b = playBracket(ids(n), seeded(seed * 1000 + n));
      assert.equal(checkBracket(b, all, MAX_ENTRANTS), null, `n=${n} seed=${seed}`);
      assert.equal(b.matches.length, n - 1);
    }
  }
});

test('대진 검사: 틀린 판의 이유', () => {
  const five = playBracket(ids(5)); // 예선 x0>x1, 본선 [x0, x2, x3, x4]
  assert.deepEqual(five.matches, [['x0', 'x1'], ['x0', 'x2'], ['x3', 'x4'], ['x0', 'x3']]);
  const bad = (body, max = 512, isItem = all) => checkBracket({ ...five, ...body }, isItem, max);
  assert.deepEqual(bad({ entrants: 'x' }), { reason: 'entrants' });
  assert.deepEqual(bad({ entrants: ['x0'] }), { reason: 'entrants' });         // 2개 미만
  assert.deepEqual(bad({}, 4), { reason: 'entrants' });                        // 상한(항목 수) 초과
  assert.deepEqual(bad({ entrants: ids(513) }), { reason: 'entrants' });       // 512 초과는 상한 안이라도 호출자가 막는다
  assert.deepEqual(bad({}, 512, id => id !== 'x4'), { reason: 'item' });
  assert.deepEqual(bad({ entrants: ['x0', 'x1', 'x2', 'x3', 5] }), { reason: 'item' });
  assert.deepEqual(bad({ entrants: ['x0', 'x1', 'x2', 'x3', 'x3'] }), { reason: 'duplicate' });
  assert.deepEqual(bad({ matches: five.matches.slice(1) }), { reason: 'matches' });
  assert.deepEqual(bad({ matches: 'x' }), { reason: 'matches' });
  // 예선이 아닌 경기로 시작 (x2 는 부전승이어야 하는데 예선에 나옴 — 모양은 맞지만 예선 짝이 다르다: 서버는 짝은 묻지 않는다)
  assert.equal(bad({ matches: [['x2', 'x3'], ['x2', 'x0'], ['x1', 'x4'], ['x2', 'x1']], champion: 'x2' }), null);
  // 진 항목이 다시 나옴
  assert.deepEqual(bad({ matches: [['x0', 'x1'], ['x1', 'x2'], ['x3', 'x4'], ['x1', 'x3']], champion: 'x1' }), { reason: 'match', index: 1 });
  // 같은 항목끼리 / 출전하지 않은 항목 / 모양
  assert.deepEqual(bad({ matches: [['x0', 'x0'], ...five.matches.slice(1)] }), { reason: 'match', index: 0 });
  assert.deepEqual(bad({ matches: [['x0', 'x9'], ...five.matches.slice(1)] }), { reason: 'match', index: 0 });
  assert.deepEqual(bad({ matches: [['x0'], ...five.matches.slice(1)] }), { reason: 'match', index: 0 });
  assert.deepEqual(bad({ matches: [null, ...five.matches.slice(1)] }), { reason: 'match', index: 0 });
  // 본선 한 라운드에 같은 항목이 두 번 (x0 이 준결승을 두 번 치르고 x3·x4 는 건너뜀)
  assert.deepEqual(bad({ matches: [['x0', 'x1'], ['x0', 'x2'], ['x0', 'x3'], ['x0', 'x4']] }), { reason: 'round', index: 2 });
  assert.deepEqual(bad({ champion: 'x3' }), { reason: 'champion' });
  assert.deepEqual(bad({ champion: undefined }), { reason: 'champion' });

  // 예선: 6개면 앞의 2경기가 서로 다른 4개 항목이어야 한다
  const six = playBracket(ids(6));
  assert.equal(checkBracket(six, all, 6), null);
  const twice = [['x0', 'x1'], ['x0', 'x2'], ['x3', 'x4'], ['x5', 'x0'], ['x5', 'x3']];
  assert.deepEqual(checkBracket({ entrants: ids(6), matches: twice, champion: 'x5' }, all, 6), { reason: 'prelim', index: 1 });

  // 12·37·128: 경기 하나를 빼거나 순서를 섞으면 틀린다
  for (const n of [12, 37, 128]) {
    const b = playBracket(ids(n), seeded(n));
    assert.deepEqual(checkBracket({ ...b, matches: b.matches.slice(0, -1) }, all, 512), { reason: 'matches' });
    const swapped = [...b.matches];
    [swapped[0], swapped[swapped.length - 2]] = [swapped[swapped.length - 2], swapped[0]];
    assert.notEqual(checkBracket({ ...b, matches: swapped }, all, 512), null, `n=${n}`);
  }
});

const close = (a, b) => Math.abs(a - b) < 1e-12;
function assertStats(actual, expected) {
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  for (const [id, [w, l, p]] of Object.entries(expected)) {
    assert.equal(actual[id].w, w, `${id}.w`);
    assert.equal(actual[id].l, l, `${id}.l`);
    assert.ok(close(actual[id].p, p), `${id}.p = ${actual[id].p}, 기대 ${p}`);
  }
}

test('수치: n=5 (예선 1경기, 부전승 3개, 라운드 3개)', () => {
  // 예선 x0>x1. 준결승 x2>x0 (예선 승자 탈락), x3>x4 (부전승 탈락). 결승 x2>x3 (부전승이 우승).
  const entrants = ids(5);
  const matches = [['x0', 'x1'], ['x2', 'x0'], ['x3', 'x4'], ['x2', 'x3']];
  assert.equal(checkBracket({ entrants, matches, champion: 'x2' }, all, 5), null);
  const { expected, items } = bracketStats(entrants, matches);
  assert.equal(expected, 1 / 5);
  assertStats(items, {
    x0: [1, 1, 1 / 3], // 예선 이김 → 준결승 탈락: 1/3
    x1: [0, 1, 0],     // 예선 탈락: 0
    x2: [2, 0, 1],     // 부전승 + 2승 = 우승: 1
    x3: [1, 1, 2 / 3], // 부전승 + 1승 → 결승 탈락: 2/3
    x4: [0, 1, 1 / 3], // 부전승 → 준결승 탈락: 1/3
  });
  // 예선을 거친 항목이 우승해도 1
  const b = playBracket(entrants); // x0 이 모두 이김
  assert.ok(close(bracketStats(entrants, b.matches).items.x0.p, 1));
});

test('수치: 2의 거듭제곱 (예선 없음), 6개, 37개', () => {
  // 4강: 첫 경기 탈락 0, 준우승 1/2, 우승 1
  const four = playBracket(ids(4)); // x0>x1, x2>x3, x0>x2
  assertStats(bracketStats(ids(4), four.matches).items, { x0: [2, 0, 1], x1: [0, 1, 0], x2: [1, 1, 0.5], x3: [0, 1, 0] });
  // 6개: P=4, 예선 2경기, R=3. 예선 x0>x1, x2>x3, 본선 [x0, x2, x4, x5]: x0>x2, x4>x5, x0>x4
  const six = playBracket(ids(6));
  assertStats(bracketStats(ids(6), six.matches).items, {
    x0: [3, 0, 1], x1: [0, 1, 0], x2: [1, 1, 1 / 3], x3: [0, 1, 0], x4: [1, 1, 2 / 3], x5: [0, 1, 1 / 3],
  });
  // 어떤 판이든: 진출도 합 = (경기 수 + 부전승 수) / R, 기대 우승 합 = 1, 우승은 1·첫 경기 탈락 예선 항목은 0
  for (const n of [5, 6, 12, 37, 64, 128, 297, 502]) {
    const b = playBracket(ids(n), seeded(n * 7));
    const { prelims, byes, rounds } = bracketPlan(n);
    const { expected, items } = bracketStats(b.entrants, b.matches);
    assert.ok(close(expected * n, 1));
    const sum = Object.values(items).reduce((s, x) => s + x.p, 0);
    assert.ok(close(sum, (n - 1 + (prelims ? byes : 0)) / rounds), `n=${n}`);
    assert.equal(items[b.champion].p, 1);
    for (const [, l] of b.matches.slice(0, prelims)) assert.equal(items[l].p, 0);
  }
});
