import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeValidator } from '../src/votes.js';

const { validateBody, categories } = makeValidator(['cards/bash', 'relics/anchor']);
const voter = 'abcdef0123456789';

test('정상 투표', () => {
  assert.equal(validateBody({ voter, votes: [{ item: 'cards/bash', v: 'nerf' }, { item: 'relics/anchor', v: null }] }), null);
});

test('카테고리 목록', () => {
  assert.deepEqual([...categories].sort(), ['cards', 'relics']);
});

test('잘못된 입력을 거른다', () => {
  assert.equal(validateBody(null), 'body');
  assert.equal(validateBody({ voter: 'x', votes: [] }), 'voter');
  assert.equal(validateBody({ voter, votes: [] }), 'votes');
  assert.equal(validateBody({ voter, votes: [{ item: 'cards/nope', v: 'nerf' }] }), 'item');
  assert.equal(validateBody({ voter, votes: [{ item: 'cards/bash', v: 'toString' }] }), 'v');
  assert.equal(validateBody({ voter, votes: [{ item: 'cards/bash', v: 'great' }] }), 'v');
});
