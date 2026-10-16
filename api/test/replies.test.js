// 댓글 답글(대댓글): YouTube 처럼 3단계까지. 답글의 답글은 그 답글 밑 3단계(under), 3단계에 단 답글은 같은 3단계에 (replyTo = 받는 사람).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAccount } from '../src/account.js';
import { handleCups } from '../src/cups.js';
import { corsHeaders } from '../src/http.js';
import { makeTestKey, googlePayload, makeD1 } from './helpers.js';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const key = await makeTestKey('k1');
const keys = new Set(['cards/bash', 'cards/strike', 'relics/anchor']);
const DB = await makeD1();

test('답글: 쓰기·목록·답글의 답글·잘못된 부모·지운 부모 자리·수·좋아요·지우기·신고', { skip: !DB && 'node:sqlite 없음' }, async () => {
  const env = { DB, GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_SUBS: 'admin-sub', TEST_JWKS: JSON.stringify(key.jwks), ALLOWED_ORIGINS: 'http://localhost:8000' };
  const ctx = { waitUntil() {} };
  let ip = 1;
  async function call(method, path, { body, token } = {}) {
    const headers = { Origin: 'http://localhost:8000', 'CF-Connecting-IP': `10.0.1.${ip}` };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const request = new Request(`http://localhost:8787${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const opts = { url: new URL(request.url), cors: corsHeaders(request, env), keys };
    const res = (await handleAccount(request, env, ctx, opts)) ?? (await handleCups(request, env, ctx, opts));
    return res ? { status: res.status, data: await res.json() } : { status: 0, data: null };
  }
  const login = async (sub, name) => {
    ip++;
    const r = await call('POST', '/auth/google', { body: { credential: await key.sign(googlePayload(CLIENT_ID, { sub, name })) } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  };
  const resetLimits = () => DB.raw.exec('DELETE FROM rate_limit');
  const alice = await login('alice-sub', '앨리스');
  const bob = await login('bob-sub', '밥돌이');
  const carol = await login('carol-sub', '캐럴');
  const admin = await login('admin-sub', '관리자');
  const [A, B, C, ADM] = [alice.token, bob.token, carol.token, admin.token];

  const state = { title: 't', tiers: [{ label: 'S', color: '#e5484d', items: ['bash'] }] };
  const post = (await call('POST', '/gallery', { token: A, body: { template: 'cards', title: '글', state } })).data.post;
  const other = (await call('POST', '/gallery', { token: B, body: { template: 'cards', title: '다른 글', state } })).data.post;
  const P = `/gallery/${post.id}/comments`;
  const write = (token, body, parent) => call('POST', P, { token, body: parent === undefined ? { body } : { body, parent } });
  const top = async (token) => (await call('GET', P, { token })).data.comments;
  const thread = async (id, token) => (await call('GET', `${P}?parent=${id}`, { token })).data.comments;
  const count = async () => (await call('GET', `/gallery/${post.id}`)).data.post.comments;

  // 맨 위 댓글 둘, 첫 댓글에 답글
  const t1 = (await write(A, '첫 댓글')).data.comment;
  assert.deepEqual([t1.parent, t1.replyTo, t1.replyCount], [null, null, 0]);
  const t2 = (await write(B, '둘째 댓글')).data.comment;
  const r1 = (await write(B, '답글입니다', t1.id)).data.comment;
  assert.deepEqual([r1.parent, r1.replyTo, r1.mine, 'replyCount' in r1], [t1.id, null, true, false]);

  // 답글의 답글 → 그 답글 밑 3단계 (같은 스레드)
  const r2 = (await write(C, '동의해요', r1.id)).data.comment;
  assert.deepEqual([r2.parent, r2.under, r2.replyTo], [t1.id, r1.id, null]);
  assert.deepEqual([r1.under, t1.under], [null, null]);
  // 3단계 답글에 단 답글 → 더 깊어지지 않고 같은 2단계 밑 3단계, replyTo = 받는 사람 ("@캐럴")
  const r2b = (await write(A, '저도요', r2.id)).data.comment;
  assert.deepEqual([r2b.parent, r2b.under, r2b.replyTo], [t1.id, r1.id, { id: carol.user.id, name: '캐럴' }]);
  assert.equal((await call('DELETE', `/comments/${r2b.id}`, { token: A })).data.ok, true);

  // 목록: 맨 위 댓글만 + replyCount. ?parent= 는 답글을 오래된 순으로
  let list = await top(A);
  assert.deepEqual(list.map(c => [c.id, c.replyCount, c.parent]), [[t1.id, 2, null], [t2.id, 0, null]]);
  let replies = await thread(t1.id, A);
  assert.deepEqual(replies.map(c => [c.id, c.parent, c.under]), [[r1.id, t1.id, null], [r2.id, t1.id, r1.id]]);
  assert.deepEqual(await thread(t2.id), []);
  assert.equal((await call('GET', `${P}?parent=nope`)).data.reason, 'parent');
  // 다른 글의 댓글 id 로는 이 글의 답글이 나오지 않는다
  assert.deepEqual((await call('GET', `/gallery/${other.id}/comments?parent=${t1.id}`)).data.comments, []);

  // 댓글 수에 답글도 들어간다
  assert.equal(await count(), 4);

  // 잘못된 부모
  resetLimits();
  assert.equal((await write(A, 'x', 'nope')).data.reason, 'parent');
  assert.equal((await write(A, 'x', 42)).data.reason, 'parent');
  assert.deepEqual((await write(A, 'x', '0'.repeat(24))).data, { error: 'not_found', reason: 'parent' });
  // 다른 글의 댓글에는 이 글로 답글을 달 수 없다
  const o1 = (await call('POST', `/gallery/${other.id}/comments`, { token: B, body: { body: '다른 글 댓글' } })).data.comment;
  assert.equal((await write(A, 'x', o1.id)).status, 404);
  assert.equal((await call('POST', '/items/cards/bash/comments', { token: A, body: { body: 'x', parent: t1.id } })).status, 404);
  resetLimits();
  assert.equal((await write(A, '빈 부모', null)).data.comment.parent, null); // null 은 맨 위 댓글

  // 답글 좋아요
  assert.deepEqual((await call('POST', `/comments/${r2.id}/like`, { token: A, body: { on: true } })).data, { likes: 1, myLike: true });
  replies = await thread(t1.id, A);
  assert.deepEqual(replies.map(c => [c.likes, c.myLike]), [[0, false], [1, true]]);

  // 답글 지우기: 남의 것은 못, 본인·관리자는 된다
  assert.equal((await call('DELETE', `/comments/${r1.id}`, { token: C })).status, 403);
  const r3 = (await write(C, '지워질 답글', t1.id)).data.comment;
  assert.equal((await call('DELETE', `/comments/${r3.id}`, { token: ADM })).data.ok, true);
  assert.equal((await top()).find(c => c.id === t1.id).replyCount, 2);

  // 답글 신고 3건 → 숨김: 남에게는 빠지고 작성자에게는 보인다. 수도 줄어든다.
  const before = await count();
  for (const t of [A, B, ADM]) await call('POST', '/report', { token: t, body: { kind: 'comment', id: r2.id } });
  assert.deepEqual((await thread(t1.id)).map(c => c.id), [r1.id]);
  assert.equal((await top()).find(c => c.id === t1.id).replyCount, 1);
  assert.deepEqual((await thread(t1.id, C)).map(c => [c.id, c.hidden]), [[r1.id, false], [r2.id, true]]);
  assert.equal((await top(C)).find(c => c.id === t1.id).replyCount, 2);
  assert.equal(await count(), before - 1);
  // 숨겨진 답글에는 남이 답글을 달 수 없다
  assert.equal((await write(B, 'x', r2.id)).status, 404);

  // 답글이 있는 맨 위 댓글을 지우면 내용·작성자 없이 자리만 남는다
  assert.equal((await call('DELETE', `/comments/${t1.id}`, { token: A })).data.ok, true);
  list = await top(B);
  const ghost = list.find(c => c.id === t1.id);
  assert.deepEqual(
    { body: ghost.body, author: ghost.author, removed: ghost.removed, replyCount: ghost.replyCount, mine: ghost.mine, likes: ghost.likes },
    { body: '', author: null, removed: 'deleted', replyCount: 1, mine: false, likes: 0 });
  assert.deepEqual((await thread(t1.id, B)).map(c => c.id), [r1.id]);
  assert.equal(await count(), before - 2);
  // 지운 댓글과 그 답글에는 답글을 달 수 없다
  assert.equal((await write(B, 'x', t1.id)).status, 404);
  assert.equal((await write(C, 'x', r1.id)).status, 404);
  // 마지막 보이는 답글까지 지우면 자리도 사라진다 (숨겨진 r2 는 작성자에게만 보이므로 그에게는 남는다)
  assert.equal((await call('DELETE', `/comments/${r1.id}`, { token: B })).data.ok, true);
  assert.equal((await top(B)).some(c => c.id === t1.id), false);
  assert.equal((await top(C)).find(c => c.id === t1.id)?.removed, 'deleted');
  // 답글이 없는 댓글을 지우면 지금처럼 바로 빠진다
  assert.equal((await call('DELETE', `/comments/${t2.id}`, { token: B })).data.ok, true);
  assert.equal((await top(B)).some(c => c.id === t2.id), false);

  // 숨겨진(신고) 맨 위 댓글에 보이는 답글이 있으면: 남에게는 자리만, 작성자·관리자에게는 그대로
  resetLimits();
  const t3 = (await write(C, '신고될 댓글')).data.comment;
  await write(A, '그래도 답글', t3.id);
  for (const t of [A, B, ADM]) await call('POST', '/report', { token: t, body: { kind: 'comment', id: t3.id } });
  const seenByB = (await top(B)).find(c => c.id === t3.id);
  assert.deepEqual([seenByB.removed, seenByB.body, seenByB.author, seenByB.replyCount], ['hidden', '', null, 1]);
  const seenByC = (await top(C)).find(c => c.id === t3.id);
  assert.deepEqual([seenByC.removed, seenByC.body, seenByC.hidden], [undefined, '신고될 댓글', true]);
  assert.equal((await top(ADM)).find(c => c.id === t3.id).body, '신고될 댓글');

  // 지운 2단계 답글도 밑에 3단계 답글이 남아 있으면 자리만 남고, 마지막 3단계 답글까지 지우면 사라진다
  resetLimits();
  const t4 = (await write(A, '셋째 스레드')).data.comment;
  const q1 = (await write(B, '2단계', t4.id)).data.comment;
  const q2 = (await write(C, '3단계', q1.id)).data.comment;
  assert.equal((await call('DELETE', `/comments/${q1.id}`, { token: B })).data.ok, true);
  let qs = await thread(t4.id, A);
  assert.deepEqual(qs.map(c => [c.id, c.removed ?? null, c.author, c.under]), [[q1.id, 'deleted', null, null], [q2.id, null, qs[1].author, q1.id]]);
  assert.equal(qs[1].author.name, '캐럴');
  assert.equal((await top(A)).find(c => c.id === t4.id).replyCount, 1);
  // 지운 2단계 답글에는 답글을 달 수 없지만, 그 밑 3단계 답글에는 된다 (같은 자리에, @받는 사람)
  assert.equal((await write(A, 'x', q1.id)).status, 404);
  const q3 = (await write(A, '이어서', q2.id)).data.comment;
  assert.deepEqual([q3.under, q3.replyTo?.name], [q1.id, '캐럴']);
  await call('DELETE', `/comments/${q3.id}`, { token: A });
  assert.equal((await call('DELETE', `/comments/${q2.id}`, { token: C })).data.ok, true);
  assert.deepEqual(await thread(t4.id, A), []);
  assert.equal((await top(A)).find(c => c.id === t4.id).replyCount, 0);

  // 항목 댓글: 답글에도 작성자의 밸런스 표, 공감순은 맨 위 댓글끼리만
  resetLimits();
  DB.raw.exec(`INSERT INTO balance_votes VALUES ('cards/bash', 'u_${bob.user.id}', 'h', 1, 1)`);
  const I = '/items/cards/bash/comments';
  const i1 = (await call('POST', I, { token: A, body: { body: '항목 댓글' } })).data.comment;
  const i2 = (await call('POST', I, { token: C, body: { body: '둘째' } })).data.comment;
  const ir = (await call('POST', I, { token: B, body: { body: '너프 필요', parent: i1.id } })).data.comment;
  assert.deepEqual([ir.parent, ir.vote], [i1.id, 'nerf']);
  await call('POST', `/comments/${ir.id}/like`, { token: A, body: { on: true } });
  await call('POST', `/comments/${i1.id}/like`, { token: C, body: { on: true } });
  assert.deepEqual((await call('GET', `${I}?sort=top`)).data.comments.map(c => [c.id, c.replyCount]), [[i1.id, 1], [i2.id, 0]]);
  assert.deepEqual((await call('GET', `${I}?sort=new`)).data.comments.map(c => c.id), [i2.id, i1.id]);
  assert.deepEqual((await call('GET', `${I}?parent=${i1.id}`)).data.comments.map(c => [c.id, c.vote, c.likes]), [[ir.id, 'nerf', 1]]);

  // 사용자 월드컵 댓글도 같다 (수에 답글 포함)
  resetLimits();
  DB.raw.prepare(`INSERT INTO cups (id, user_id, title, item_count, created) VALUES (?, ?, '컵', 2, 1)`).run('c'.repeat(24), alice.user.id);
  const K = `/cups/${'c'.repeat(24)}/comments`;
  const k1 = (await call('POST', K, { token: B, body: { body: '재밌다' } })).data.comment;
  const kr = (await call('POST', K, { token: A, body: { body: '고마워요', parent: k1.id } })).data.comment;
  assert.equal(kr.parent, k1.id);
  assert.equal((await call('POST', K, { token: A, body: { body: 'x', parent: i1.id } })).status, 404);
  assert.deepEqual((await call('GET', K)).data.comments.map(c => c.replyCount), [1]);
  assert.deepEqual((await call('GET', `${K}?parent=${k1.id}`)).data.comments.map(c => c.id), [kr.id]);
  assert.equal((await call('GET', `/cups/${'c'.repeat(24)}`)).data.cup.comments, 2);

  // 글을 지우면 답글도 같이 지워진다
  assert.equal((await call('DELETE', `/gallery/${post.id}`, { token: A })).data.ok, true);
  assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM comments WHERE target = ?').get(`post:${post.id}`).n, 0);
});
