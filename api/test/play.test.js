import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  templateCategory, tierScore, aggregateStates, finalizeAggregate,
  validateVersus, normalizePair, eloDelta, ELO_K,
} from '../src/play.js';

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
