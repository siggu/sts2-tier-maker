import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  templateCategory, tierScore, aggregateStates, finalizeAggregate,
  validateVersus, normalizePair, eloDelta, ELO_K,
  validateTournament, tournamentError, mergeRanking, categorySizes, TOURNAMENT_MAX, handlePlay,
} from '../src/play.js';
import { makeD1, playBracket } from './helpers.js';

const keys = new Set(['cards/bash', 'cards/strike', 'cards/defend', 'relics/anchor', 'relics/vajra']);
const voter = 'abcdef0123456789';

test('묶음 id 형식과 카테고리', () => {
  assert.equal(templateCategory('cards', keys), 'cards');
  assert.equal(templateCategory('cards.ironclad.type-attack', keys), 'cards');
  assert.equal(templateCategory('relics.rarity-ancient.source-Neow', keys), 'relics');
  assert.equal(templateCategory('potions', keys), null); // 모르는 카테고리
  assert.equal(templateCategory('Cards', keys), null);
  assert.equal(templateCategory('.cards', keys), null);
  assert.equal(templateCategory('cards/bash', keys), null);
  assert.equal(templateCategory("cards'--", keys), null);
  assert.equal(templateCategory(`cards.${'a'.repeat(80)}`, keys), null);
  assert.equal(templateCategory(null, keys), null);
});

test('줄 점수: 맨 위 1, 맨 아래 0, 한 줄이면 1', () => {
  assert.equal(tierScore(0, 1), 1);
  assert.equal(tierScore(0, 5), 1);
  assert.equal(tierScore(4, 5), 0);
  assert.equal(tierScore(1, 3), 0.5);
});

test('티어표 집계: 평균 점수와 배치 수, 중복은 위쪽 줄만', () => {
  const states = [
    { tiers: [{ items: ['bash'] }, { items: ['strike'] }, { items: [] }] },      // bash 1, strike .5
    { tiers: [{ items: ['strike', 'bash'] }, { items: ['bash', 'defend'] }] },   // strike 1, bash 1(중복), defend 0
    { tiers: [{ items: ['defend'] }] },                                            // 한 줄 → 1
    { tiers: 'nope' }, null, { tiers: [null, { items: 'x' }, { items: [3, 'bash'] }] }, // bash 0 (k=3, i=2)
  ];
  const rows = aggregateStates(states);
  const items = finalizeAggregate(rows, 'cards', keys);
  assert.deepEqual(items, {
    bash: { score: 0.6667, n: 3 },
    strike: { score: 0.75, n: 2 },
    defend: { score: 0.5, n: 2 },
  });
});

test('집계 결과에서 없는 아이템은 뺀다', () => {
  const items = finalizeAggregate([{ item: 'bash', total: 1, n: 1 }, { item: 'gone', total: 1, n: 1 }, { item: 'anchor', total: 1, n: 1 }], 'cards', keys);
  assert.deepEqual(Object.keys(items), ['bash']);
});

test('대결 입력 검사', () => {
  const ok = { category: 'cards', winner: 'bash', loser: 'strike', voter };
  assert.equal(validateVersus(ok, keys), null);
  assert.equal(validateVersus({ ...ok, voter: undefined }, keys, true), null); // 로그인하면 voter 불필요
  assert.equal(validateVersus(null, keys), 'body');
  assert.equal(validateVersus({ ...ok, category: 'potions' }, keys), 'category');
  assert.equal(validateVersus({ ...ok, category: 'toString' }, keys), 'category');
  assert.equal(validateVersus({ ...ok, loser: 'anchor' }, keys), 'item');         // 다른 카테고리
  assert.equal(validateVersus({ ...ok, winner: 'nope' }, keys), 'item');
  assert.equal(validateVersus({ ...ok, winner: ['bash'] }, keys), 'item');
  assert.equal(validateVersus({ ...ok, loser: 'bash' }, keys), 'same');
  assert.equal(validateVersus({ ...ok, voter: 'short' }, keys), 'voter');
  assert.equal(validateVersus({ ...ok, voter: 'u_0123456789abcdef' }, keys), 'voter'); // 계정 흉내
  assert.equal(validateVersus({ ...ok, voter: 'a b c d e f g h' }, keys), 'voter');
});

test('월드컵 결과 입력 검사', () => {
  const k4 = new Set([...keys, 'cards/zap']);
  const cup = (entrants, pick) => ({ category: 'cards', voter, ...playBracket(entrants, pick) });
  const ok = cup(['strike', 'bash', 'defend', 'zap'], (a, b) => (b === 'bash' ? b : a)); // bash 우승
  assert.equal(ok.champion, 'bash');
  assert.equal(validateTournament(ok, k4), null);
  assert.equal(validateTournament({ ...ok, voter: undefined }, k4, true), null);
  assert.equal(validateTournament(null, k4), 'body');
  assert.equal(validateTournament([], k4), 'body');
  assert.equal(validateTournament({ ...ok, category: 'potions' }, k4), 'category');
  assert.equal(validateTournament({ ...ok, entrants: 'bash' }, k4), 'entrants');
  assert.equal(validateTournament({ ...ok, entrants: [] }, k4), 'entrants');
  assert.equal(validateTournament({ ...ok, entrants: ['bash'] }, k4), 'entrants');
  // 3개: 이제 예선 1경기 + 결승 (2의 거듭제곱이 아니어도 된다)
  assert.equal(validateTournament(cup(['bash', 'strike', 'defend']), k4), null);
  assert.equal(validateTournament({ ...ok, entrants: ['bash', 'strike', 'defend'] }, k4), 'matches');
  // 그 카테고리의 항목 수(cards 4개)보다 많으면 안 된다
  assert.equal(validateTournament({ ...ok, entrants: ['bash', 'strike', 'defend', 'zap', 'x'] }, k4), 'entrants');
  assert.equal(validateTournament({ ...ok, entrants: ['bash', 'strike', 'defend', 'anchor'] }, k4), 'item'); // 다른 카테고리
  assert.equal(validateTournament({ ...ok, entrants: ['bash', 'strike', 'defend', 3] }, k4), 'item');
  assert.equal(validateTournament({ ...ok, entrants: ['bash', 'strike', 'defend', 'bash'] }, k4), 'duplicate');
  assert.equal(validateTournament({ ...ok, matches: undefined }, k4), 'matches'); // 예전 화면(경기 결과 없이)은 받지 않는다
  assert.equal(validateTournament({ ...ok, matches: ok.matches.slice(1) }, k4), 'matches');
  assert.deepEqual(tournamentError({ ...ok, matches: [['strike', 'bash'], ['defend', 'zap'], ['bash', 'defend']] }, k4), { reason: 'match', index: 2 });
  assert.equal(validateTournament({ ...ok, champion: 'nope' }, k4), 'champion');
  assert.equal(validateTournament({ ...ok, champion: ['bash'] }, k4), 'champion');
  assert.equal(validateTournament({ ...ok, voter: 'u_0123456789abcdef' }, k4), 'voter');

  // 큰 카테고리: 5·6·12·37·64·128·300(전체) 는 되고, 항목 수를 넘거나 512 를 넘으면 안 된다
  const many = new Set([...keys, ...Array.from({ length: 600 }, (_, i) => `relics/r${i}`)]);
  const relics = n => Array.from({ length: n }, (_, i) => `r${i}`);
  for (const n of [5, 6, 12, 37, 64, 128, 300, 512]) {
    assert.equal(validateTournament({ category: 'relics', voter, ...playBracket(relics(n)) }, many), null, `n=${n}`);
  }
  assert.equal(TOURNAMENT_MAX, 512);
  assert.equal(validateTournament({ category: 'relics', voter, ...playBracket(relics(513)) }, many), 'entrants');
  assert.equal(categorySizes(many).counts.get('relics'), 602);
  const few = new Set([...keys, ...Array.from({ length: 10 }, (_, i) => `relics/r${i}`)]); // relics 12개
  assert.equal(validateTournament({ category: 'relics', voter, ...playBracket(relics(10)) }, few), null);
  assert.equal(validateTournament({ category: 'relics', voter, ...playBracket(relics(13)) }, few), 'entrants');
});

test('순위: Elo 와 월드컵 수치를 합친다', () => {
  const items = mergeRanking(
    [{ item: 'bash', rating: 1512.34, wins: 1, losses: 0 }, { item: 'gone', rating: 1400, wins: 0, losses: 1 }],
    [
      { item: 'bash', champ: 2, entries: 5, expected: 0.4166666, progress: 1.3333333, tracked: 2, tracked_champ: 1 },
      { item: 'defend', champ: 0, entries: 1, expected: 0, progress: 0, tracked: 0, tracked_champ: 0 },
      { item: 'gone', champ: 1, entries: 1, expected: 0.25, progress: 1, tracked: 1, tracked_champ: 1 },
    ],
    'cards', keys);
  assert.deepEqual(items, {
    bash: { rating: 1512.3, wins: 1, losses: 0, champ: 2, entries: 5, expected: 0.4167, progress: 1.3333, tracked: 2, trackedChamp: 1 },
    defend: { rating: 1500, wins: 0, losses: 0, champ: 0, entries: 1, expected: 0, progress: 0, tracked: 0, trackedChamp: 0 },
  });
});

test('월드컵 결과 저장: 대진 크기를 반영한 수치를 서버가 계산한다 (D1 대역)', async t => {
  const DB = await makeD1();
  if (!DB) return t.skip('node:sqlite 없음');
  const k = new Set(['potions/p1', 'potions/p2', 'potions/p3', 'potions/p4', 'potions/p5', 'potions/p6']);
  const env = { DB };
  const ctx = { waitUntil() {} };
  const post = async (body, ip = '10.0.0.1') => {
    const request = new Request('http://x/versus/tournament', { method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: JSON.stringify(body) });
    const res = await handlePlay(request, env, ctx, { url: new URL(request.url), cors: {}, keys: k });
    return { status: res.status, body: await res.json() };
  };
  const row = id => DB.raw.prepare('SELECT champ, entries, expected, progress, tracked, tracked_champ FROM worldcup_stats WHERE category = ? AND item = ?').get('potions', id);
  // 예전(0006 전) 기록: tracked 없이 champ·entries 만 있는 행
  DB.raw.prepare("INSERT INTO worldcup_stats (category, item, champ, entries) VALUES ('potions', 'p3', 4, 9)").run();

  // 5개 전체: 예선 p1>p2, 준결승 p3>p1, p4>p5, 결승 p3>p4
  const five = { category: 'potions', voter, entrants: ['p1', 'p2', 'p3', 'p4', 'p5'], champion: 'p3',
    matches: [['p1', 'p2'], ['p3', 'p1'], ['p4', 'p5'], ['p3', 'p4']] };
  assert.deepEqual(await post(five), { status: 200, body: { ok: true } });
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const want = { p1: [0, 1 / 3], p2: [0, 0], p3: [1, 1], p4: [0, 2 / 3], p5: [0, 1 / 3] };
  for (const [id, [champ, progress]] of Object.entries(want)) {
    const r = row(id);
    assert.ok(near(r.expected, 0.2), `${id} expected ${r.expected}`);
    assert.ok(near(r.progress, progress), `${id} progress ${r.progress}`);
    assert.equal(r.tracked, 1);
    assert.equal(r.tracked_champ, champ);
  }
  assert.deepEqual({ ...row('p3'), expected: 0, progress: 0 }, { champ: 5, entries: 10, expected: 0, progress: 0, tracked: 1, tracked_champ: 1 });
  assert.equal(row('p6'), undefined);

  // 4강 한 판 더: p3 첫 경기 탈락 → progress 그대로, expected + 1/4
  const four = { category: 'potions', voter, entrants: ['p3', 'p6', 'p1', 'p2'], champion: 'p6',
    matches: [['p6', 'p3'], ['p1', 'p2'], ['p6', 'p1']] };
  assert.deepEqual(await post(four), { status: 200, body: { ok: true } });
  assert.ok(near(row('p3').expected, 0.2 + 0.25));
  assert.ok(near(row('p3').progress, 1));
  assert.equal(row('p3').tracked, 2);
  assert.ok(near(row('p6').progress, 1));
  assert.ok(near(row('p1').progress, 1 / 3 + 0.5));

  // 틀린 판은 400 + 이유 (경기 위치)
  const bad = await post({ ...five, matches: [['p1', 'p2'], ['p2', 'p3'], ['p4', 'p5'], ['p3', 'p4']] });
  assert.deepEqual(bad, { status: 400, body: { error: 'bad_request', reason: 'match', index: 1 } });
  assert.deepEqual((await post({ ...five, matches: undefined })).body, { error: 'bad_request', reason: 'matches' });
  assert.equal(row('p5').tracked, 1); // 바뀌지 않음
  // IP 당 1분 6판 (이미 2판)
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await post(five)).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 429]);
});

test('쌍 정렬', () => {
  assert.deepEqual(normalizePair('strike', 'bash'), ['bash', 'strike']);
  assert.deepEqual(normalizePair('bash', 'strike'), ['bash', 'strike']);
});

test('Elo 변화', () => {
  assert.equal(eloDelta(1500, 1500), ELO_K / 2);
  // 강한 쪽이 이기면 조금, 약한 쪽이 이기면 많이 오른다. 합은 K.
  const strongWins = eloDelta(1700, 1500);
  const weakWins = eloDelta(1500, 1700);
  assert.ok(strongWins < 12 && weakWins > 12);
  assert.ok(Math.abs(strongWins + weakWins - ELO_K) < 1e-9);
  assert.ok(Math.abs(eloDelta(1900, 1500) - 24 / 11) < 1e-9); // 400점 차 → 기대 승률 10/11
});

// ---- 실제 Worker 에 대고 돌리는 시험 (선택) ----
// cd api && npx wrangler d1 migrations apply sts2-balance --local && npx wrangler dev --local --port 8799
// PLAY_E2E_URL=http://127.0.0.1:8799 npm test
const E2E = process.env.PLAY_E2E_URL;

test('e2e: A vs B 투표·재투표·순위·속도 제한', { skip: !E2E && 'PLAY_E2E_URL 없음' }, async () => {
  const ip = `10.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}.${Math.random() * 255 | 0}`;
  const post = async body => {
    const res = await fetch(`${E2E}/versus`, { method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const health = await fetch(`${E2E}/health`).then(r => r.json());
  assert.ok(health.ok);
  // 다른 시험과 겹치지 않게 아직 표가 없는 포션 쌍을 고른다 (순위는 30초 캐시라 연달아 돌리면 겹칠 수 있다).
  const { items } = await fetch(`${E2E}/versus/ranking?category=potions`).then(r => r.json());
  const keysJson = (await import('node:fs')).readFileSync(new URL('../../site/data/keys.json', import.meta.url), 'utf8');
  const fresh = JSON.parse(keysJson).filter(k => k.startsWith('potions/')).map(k => k.slice(8)).filter(id => !items[id]);
  if (fresh.length < 2) return; // 이미 다 써 버린 로컬 DB
  const [x, y] = fresh;
  const me = `e2e${Date.now()}`;

  let r = await post({ category: 'potions', winner: x, loser: y, voter: me });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, ratings: { [x]: 1512, [y]: 1488 } });
  r = await post({ category: 'potions', winner: x, loser: y, voter: me }); // 같은 선택 → 그대로
  assert.deepEqual(r.body.ratings, { [x]: 1512, [y]: 1488 });
  r = await post({ category: 'potions', winner: y, loser: x, voter: me }); // 뒤집기 → 새 결과만 반영
  const d = eloDelta(1488, 1512); // 약한 쪽이 이겨서 12 보다 많이 움직인다
  assert.deepEqual(r.body.ratings, { [x]: Math.round((1512 - d) * 10) / 10, [y]: Math.round((1488 + d) * 10) / 10 });

  assert.deepEqual((await post({ category: 'potions', winner: x, loser: x, voter: me })).body, { error: 'bad_request', reason: 'same' });
  assert.deepEqual((await post({ category: 'potions', winner: x, loser: y, voter: 'u_12345678' })).body, { error: 'bad_request', reason: 'voter' });
  assert.equal((await fetch(`${E2E}/versus`)).status, 405);
  assert.equal((await fetch(`${E2E}/versus/ranking?category=nope`)).status, 400);
  assert.equal((await fetch(`${E2E}/tiers/aggregate?template=nope.x`)).status, 400);
  const agg = await fetch(`${E2E}/tiers/aggregate?template=potions`).then(r => r.json());
  assert.equal(agg.template, 'potions');
  assert.equal(typeof agg.count, 'number');

  // 월드컵 결과: 출전 4개 → entries +1, 우승 → champ +1 (순위는 캐시라 여기서는 응답만 본다)
  const cup = async body => {
    const res = await fetch(`${E2E}/versus/tournament`, { method: 'POST', headers: { 'CF-Connecting-IP': `${ip}9` }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const five = JSON.parse(keysJson).filter(k => k.startsWith('potions/')).slice(0, 5).map(k => k.slice(8));
  assert.deepEqual(await cup({ category: 'potions', voter: me, ...playBracket(five) }), { status: 200, body: { ok: true } });
  assert.deepEqual((await cup({ category: 'potions', voter: me, ...playBracket(five), champion: 'nope' })).body, { error: 'bad_request', reason: 'champion' });
  assert.equal((await fetch(`${E2E}/versus/tournament`)).status, 405);

  // 이 IP 로 이미 3번 성공 → 57번 더 되고 그다음부터 429 (분이 바뀌어도 128번이면 한 분에 60번을 넘는다)
  const minute = () => Math.floor(Date.now() / 60000);
  const start = minute();
  const codes = [];
  for (let i = 0; i < 125; i++) codes.push((await post({ category: 'potions', winner: x, loser: y, voter: `${me}r${i}` })).status);
  assert.ok(codes.includes(429));
  if (minute() === start) assert.equal(codes.filter(c => c === 200).length, 57);
});
