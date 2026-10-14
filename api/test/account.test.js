import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleIdToken, makeKeyResolver, keyResolverFor, getUser } from '../src/auth.js';
import { handleAccount, isTemplateId, cleanName, cleanComment, cleanTitle, normalizeState } from '../src/account.js';
import { makeValidator, isAnonVoter } from '../src/votes.js';
import { corsHeaders } from '../src/http.js';
import { makeTestKey, googlePayload, makeD1 } from './helpers.js';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const key = await makeTestKey('k1');
const otherKey = await makeTestKey('k1'); // 같은 kid, 다른 키 → 서명이 맞지 않아야 한다
const getKey = makeKeyResolver(async () => ({ jwks: key.jwks, maxAge: 3600 }));
const verify = (token, opts = {}) => verifyGoogleIdToken(token, { clientId: CLIENT_ID, getKey, ...opts });

// ---------- JWT ----------

test('JWT: 올바른 토큰', async () => {
  const r = await verify(await key.sign(googlePayload(CLIENT_ID)));
  assert.equal(r.ok, true);
  assert.equal(r.payload.sub, '1000001');
  const r2 = await verify(await key.sign(googlePayload(CLIENT_ID, { iss: 'accounts.google.com' })));
  assert.equal(r2.ok, true);
});

test('JWT: aud·iss·exp 가 틀리면 거른다', async () => {
  assert.equal((await verify(await key.sign(googlePayload('someone-else')))).reason, 'aud');
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID, { aud: [CLIENT_ID] })))).reason, 'aud');
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID, { iss: 'https://evil.example' })))).reason, 'iss');
  const past = Math.floor(Date.now() / 1000) - 10;
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID, { exp: past })))).reason, 'exp');
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID, { exp: undefined })))).reason, 'exp');
  const future = Math.floor(Date.now() / 1000) + 3600;
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID, { iat: future, exp: future + 60 })))).reason, 'iat');
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID, { sub: 42 })))).reason, 'sub');
});

test('JWT: 서명이 틀리거나 바꿔치기한 토큰을 거른다', async () => {
  assert.equal((await verify(await otherKey.sign(googlePayload(CLIENT_ID)))).reason, 'signature');
  // 서명은 그대로 두고 내용만 바꾸기
  const [h, , s] = (await key.sign(googlePayload(CLIENT_ID))).split('.');
  const forged = Buffer.from(JSON.stringify(googlePayload(CLIENT_ID, { sub: 'admin' }))).toString('base64url');
  assert.equal((await verify(`${h}.${forged}.${s}`)).reason, 'signature');
  // alg 바꿔치기, 모르는 kid, 형식 오류
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID), { alg: 'none' }))).reason, 'alg');
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID), { alg: 'HS256' }))).reason, 'alg');
  assert.equal((await verify(await key.sign(googlePayload(CLIENT_ID), { kid: 'nope' }))).reason, 'kid');
  assert.equal((await verify(`${h}.${forged}.`)).reason, 'format');
  assert.equal((await verify('a.b')).reason, 'format');
  assert.equal((await verify(null)).reason, 'format');
  assert.equal((await verify('x'.repeat(5000))).reason, 'format');
  // 클라이언트 ID 가 비어 있으면 무엇도 통과하지 않는다
  assert.equal((await verify(await key.sign(googlePayload('')), { clientId: '' })).reason, 'config');
});

test('JWKS 캐시: 한 번만 읽고, 모르는 kid 로는 자주 다시 읽지 않는다', async () => {
  let loads = 0;
  const resolve = makeKeyResolver(async () => { loads++; return { jwks: key.jwks, maxAge: 3600 }; });
  assert.ok(await resolve('k1'));
  assert.ok(await resolve('k1'));
  assert.equal(loads, 1);
  assert.equal(await resolve('unknown'), null);
  assert.equal(await resolve('unknown2'), null);
  assert.equal(loads, 1); // 방금 읽었으므로 1분 동안은 다시 읽지 않는다
});

test('TEST_JWKS 는 localhost 요청에서만 쓴다', () => {
  const env = { TEST_JWKS: JSON.stringify(key.jwks) };
  const local = keyResolverFor(env, new URL('http://localhost:8787/auth/google'));
  const prod = keyResolverFor(env, new URL('https://sts2-balance-api.siggu100.workers.dev/auth/google'));
  const plain = keyResolverFor({}, new URL('http://localhost:8787/auth/google'));
  assert.notEqual(local, prod);
  assert.equal(prod, plain); // 배포 주소에서는 언제나 구글 JWKS
});

// ---------- 입력 검사 ----------

const keys = new Set(['cards/bash', 'cards/strike', 'relics/anchor']);

test('템플릿 id', () => {
  assert.ok(isTemplateId('cards', keys));
  assert.ok(isTemplateId('cards.ironclad.type-attack', keys));
  assert.ok(isTemplateId('relics.rarity-ancient.source-Neow', keys));
  assert.ok(!isTemplateId('potions', keys));
  assert.ok(!isTemplateId('Cards', keys));
  assert.ok(!isTemplateId('cards/bash', keys));
  assert.ok(!isTemplateId("cards'--", keys));
  assert.ok(!isTemplateId(`cards.${'a'.repeat(80)}`, keys));
  assert.ok(!isTemplateId(undefined, keys));
});

test('이름·제목·댓글 정리', () => {
  assert.equal(cleanName('  철수  '), '철수');
  assert.equal(cleanName('a   b'), 'a b');
  assert.equal(cleanName('x'), null);
  assert.equal(cleanName('가'.repeat(21)), null);
  assert.equal(cleanName('😀😀'), '😀😀');
  assert.equal(cleanName('ab‮'), 'ab');
  assert.equal(cleanName(12), null);
  assert.equal(cleanTitle('  my list '), 'my list');
  assert.equal(cleanTitle(''), null);
  assert.equal(cleanTitle('t'.repeat(81)), null);
  assert.equal(cleanComment(' <b>hi</b>\r\n\r\n\r\n\r\nthere '), '<b>hi</b>\n\nthere'); // HTML 은 그대로 저장
  assert.equal(cleanComment('   '), null);
  assert.equal(cleanComment('가'.repeat(500)), '가'.repeat(500));
  assert.equal(cleanComment('가'.repeat(501)), null);
});

test('티어표 state 형식', () => {
  const good = { title: 'T', tiers: [{ label: 'S', color: '#E5484d', items: ['bash'] }], updatedAt: 1, extra: 'drop' };
  assert.deepEqual(normalizeState(good).state, { title: 'T', tiers: [{ label: 'S', color: '#E5484d', items: ['bash'] }], updatedAt: 1 });
  assert.equal(normalizeState(null).reason, 'state');
  assert.equal(normalizeState({ ...good, title: 't'.repeat(81) }).reason, 'state.title');
  assert.equal(normalizeState({ ...good, tiers: [] }).reason, 'state.tiers');
  assert.equal(normalizeState({ ...good, tiers: Array(21).fill(good.tiers[0]) }).reason, 'state.tiers');
  assert.equal(normalizeState({ ...good, tiers: [{ ...good.tiers[0], color: 'red' }] }).reason, 'state.color');
  assert.equal(normalizeState({ ...good, tiers: [{ ...good.tiers[0], label: 'l'.repeat(41) }] }).reason, 'state.label');
  assert.equal(normalizeState({ ...good, tiers: [{ ...good.tiers[0], items: ['<script>'] }] }).reason, 'state.items');
  assert.equal(normalizeState({ ...good, updatedAt: 'x' }).reason, 'state.updatedAt');
  const big = { title: 'T', tiers: [{ label: 'S', color: '#000000', items: Array.from({ length: 3000 }, (_, i) => `item-${i}`) }] };
  assert.equal(normalizeState(big).reason, 'state.size');
});

test('익명 voter: u_ 로 시작하면 받지 않고, 로그인 상태면 voter 를 보지 않는다', () => {
  const { validateBody } = makeValidator(['cards/bash']);
  const votes = [{ item: 'cards/bash', v: 'nerf' }];
  assert.ok(isAnonVoter('0123456789abcdef'));
  assert.ok(!isAnonVoter('u_0123456789abcdef0123456789abcdef'));
  assert.equal(validateBody({ voter: 'u_0123456789abcdef', votes }), 'voter');
  assert.equal(validateBody({ votes }), 'voter');
  assert.equal(validateBody({ votes }, { voterOptional: true }), null);
  assert.equal(validateBody({ votes: [] }, { voterOptional: true }), 'votes');
});

// ---------- 경로 전체 (node:sqlite 로 만든 D1 대역) ----------

const DB = await makeD1(['0001_init.sql', '0002_accounts.sql']);

test('계정·갤러리·댓글 흐름', { skip: !DB && 'node:sqlite 없음' }, async () => {
  const env = { DB, GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_SUBS: 'admin-sub, other', TEST_JWKS: JSON.stringify(key.jwks), ALLOWED_ORIGINS: 'http://localhost:8000' };
  const ctx = { waitUntil() {} };
  let ip = 1;
  async function call(method, path, { body, token, raw } = {}) {
    const headers = { Origin: 'http://localhost:8000', 'CF-Connecting-IP': `10.0.0.${ip}` };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const request = new Request(`http://localhost:8787${path}`, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const res = await handleAccount(request, env, ctx, { url: new URL(request.url), cors: corsHeaders(request, env), keys });
    if (!res) return { status: 0, data: null };
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8000');
    return { status: res.status, data: await res.json() };
  }
  const login = async (sub, name, voter) => {
    ip++;
    const r = await call('POST', '/auth/google', { body: { credential: await key.sign(googlePayload(CLIENT_ID, { sub, name })), voter } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  };

  // 자기 경로가 아니면 null, 메서드가 틀리면 405
  assert.equal((await call('GET', '/health')).status, 0);
  assert.equal((await call('GET', '/auth/google')).status, 405);

  // 로그인 꺼짐
  const off = await handleAccount(new Request('http://localhost/auth/google', { method: 'POST', body: '{}' }), { ...env, GOOGLE_CLIENT_ID: '' }, ctx, { url: new URL('http://localhost/auth/google'), cors: {}, keys });
  assert.equal(off.status, 503);
  assert.deepEqual(await off.json(), { error: 'login_disabled' });

  // 틀린 토큰
  let r = await call('POST', '/auth/google', { body: { credential: await otherKey.sign(googlePayload(CLIENT_ID)) } });
  assert.deepEqual([r.status, r.data], [401, { error: 'auth', reason: 'signature' }]);
  assert.deepEqual((await call('POST', '/auth/google', { raw: 'nope' })).data, { error: 'bad_request', reason: 'json' });

  // 익명 표를 계정으로 옮기기: 계정에 이미 있는 항목은 계정 표 유지
  const anon = 'abcdef0123456789';
  DB.raw.exec(`INSERT INTO balance_votes VALUES ('cards/bash', '${anon}', 'h', 1, 1), ('cards/strike', '${anon}', 'h', 3, 1)`);
  const alice = await login('alice-sub', '  Alice   Liddell  ');
  assert.equal(alice.user.name, 'Alice Liddell');
  assert.equal(alice.user.admin, false);
  assert.match(alice.token, /^[A-Za-z0-9_-]{43}$/);
  DB.raw.exec(`INSERT INTO balance_votes VALUES ('cards/bash', 'u_${alice.user.id}', 'h', 2, 2)`);
  const again = await login('alice-sub', 'Ignored', anon);
  assert.equal(again.user.id, alice.user.id);
  assert.equal(again.user.name, 'Alice Liddell');
  const A = again.token;

  r = await call('GET', '/me', { token: A });
  assert.deepEqual(r.data.votes, { 'cards/bash': 'fair', 'cards/strike': 'buff' });
  assert.deepEqual(r.data.tiers, {});
  assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM balance_votes WHERE voter = ?').get(anon).n, 0);
  assert.equal((await call('GET', '/me')).status, 401);
  assert.equal((await call('GET', '/me', { token: 'x'.repeat(43) })).status, 401);

  // 이름 바꾸기
  assert.deepEqual((await call('PATCH', '/me', { token: A, body: { name: 'a' } })).data, { error: 'bad_request', reason: 'name' });
  r = await call('PATCH', '/me', { token: A, body: { name: ' 앨리스 ' } });
  assert.equal(r.data.user.name, '앨리스');

  // 티어표 동기화
  const state = { title: '내 티어', tiers: [{ label: 'S', color: '#e5484d', items: ['bash'] }, { label: 'A', color: '#f2884b', items: [] }], updatedAt: 5 };
  assert.equal((await call('PUT', '/me/tiers/potions', { token: A, body: { state } })).data.reason, 'template');
  assert.equal((await call('PUT', '/me/tiers/cards', { token: A, body: { state: { ...state, tiers: 'x' } } })).data.reason, 'state.tiers');
  r = await call('PUT', '/me/tiers/cards.ironclad', { token: A, body: { state } });
  assert.equal(r.data.ok, true);
  r = await call('GET', '/me', { token: A });
  assert.deepEqual(r.data.tiers['cards.ironclad'].state.tiers, state.tiers);
  assert.equal(r.data.tiers['cards.ironclad'].updatedAt, r.data.tiers['cards.ironclad'].state.updatedAt);
  await call('DELETE', '/me/tiers/cards.ironclad', { token: A });
  assert.deepEqual((await call('GET', '/me', { token: A })).data.tiers, {});
  assert.equal((await call('PUT', '/me/tiers/cards', { token: A, raw: JSON.stringify({ state, pad: 'x'.repeat(40000) }) })).status, 413);

  // 갤러리
  assert.equal((await call('POST', '/gallery', { body: { template: 'cards', title: 't', state } })).status, 401);
  assert.equal((await call('POST', '/gallery', { token: A, body: { template: 'cards', title: '', state } })).data.reason, 'title');
  assert.equal((await call('POST', '/gallery', { token: A, body: { template: 'cards', title: 't', state: { ...state, tiers: [{ label: 'S', color: '#000000', items: [] }] } } })).data.reason, 'empty');
  r = await call('POST', '/gallery', { token: A, body: { template: 'cards', title: ' 첫 글 ', state } });
  const post = r.data.post;
  assert.equal(post.title, '첫 글');
  assert.equal(post.author.name, '앨리스');
  const bob = await login('bob-sub', 'Bob');
  const B = bob.token;
  const p2 = (await call('POST', '/gallery', { token: B, body: { template: 'relics', title: 'bob', state } })).data.post;

  r = await call('GET', '/gallery');
  assert.deepEqual(r.data.posts.map(p => p.id), [p2.id, post.id]);
  assert.equal(r.data.next, null);
  assert.ok(r.data.posts[0].state.tiers);
  assert.deepEqual((await call('GET', '/gallery?template=cards')).data.posts.map(p => p.id), [post.id]);
  assert.deepEqual((await call('GET', `/gallery?author=${bob.user.id}`)).data.posts.map(p => p.id), [p2.id]);
  assert.equal((await call('GET', '/gallery?sort=hot')).data.reason, 'sort');
  assert.equal((await call('GET', '/gallery?cursor=1%20OR%201=1')).data.reason, 'cursor');
  assert.equal((await call('GET', '/gallery?author=x')).data.reason, 'author');

  // 반응
  assert.equal((await call('POST', `/gallery/${post.id}/react`, { token: B, body: { v: 2 } })).data.reason, 'v');
  assert.deepEqual((await call('POST', `/gallery/${post.id}/react`, { token: B, body: { v: 1 } })).data, { likes: 1, dislikes: 0, myReaction: 1 });
  assert.deepEqual((await call('POST', `/gallery/${post.id}/react`, { token: B, body: { v: -1 } })).data, { likes: 0, dislikes: 1, myReaction: -1 });
  assert.deepEqual((await call('POST', `/gallery/${post.id}/react`, { token: A, body: { v: 1 } })).data, { likes: 1, dislikes: 1, myReaction: 1 });
  assert.deepEqual((await call('POST', `/gallery/${p2.id}/react`, { token: A, body: { v: 1 } })).data, { likes: 1, dislikes: 0, myReaction: 1 });
  r = await call('GET', '/gallery?sort=top', { token: B });
  assert.deepEqual(r.data.posts.map(p => [p.id, p.myReaction]), [[p2.id, 0], [post.id, -1]]);
  assert.equal((await call('GET', `/gallery/${post.id}`, { token: B })).data.post.myReaction, -1);
  assert.equal((await call('GET', '/gallery/000000000000000000000000')).status, 404);

  // 쪽 나누기: 25개를 더 만들어 20 + 나머지
  for (let i = 0; i < 25; i++) {
    DB.raw.prepare(`INSERT INTO posts (id, user_id, template, title, state, created) VALUES (?, ?, 'cards', 'x', '{}', ?)`)
      .run(i.toString(16).padStart(24, 'f'), bob.user.id, i);
  }
  for (const sort of ['new', 'top']) {
    const page1 = (await call('GET', `/gallery?sort=${sort}`)).data;
    assert.equal(page1.posts.length, 20);
    const page2 = (await call('GET', `/gallery?sort=${sort}&cursor=${encodeURIComponent(page1.next)}`)).data;
    assert.equal(page2.posts.length, 7);
    assert.equal(page2.next, null);
    assert.equal(new Set([...page1.posts, ...page2.posts].map(p => p.id)).size, 27);
  }
  DB.raw.exec(`DELETE FROM posts WHERE title = 'x'`);

  // 글 댓글
  assert.equal((await call('POST', `/gallery/${post.id}/comments`, { token: B, body: { body: '  ' } })).data.reason, 'body');
  const c1 = (await call('POST', `/gallery/${post.id}/comments`, { token: B, body: { body: '<i>좋아요</i>' } })).data.comment;
  assert.equal(c1.body, '<i>좋아요</i>');
  assert.equal(c1.mine, true);
  assert.equal(c1.vote, null);
  const c2 = (await call('POST', `/gallery/${post.id}/comments`, { token: A, body: { body: '고마워요' } })).data.comment;
  r = await call('GET', `/gallery/${post.id}/comments`, { token: A });
  assert.deepEqual(r.data.comments.map(c => [c.id, c.mine]), [[c1.id, false], [c2.id, true]]);
  assert.equal((await call('GET', `/gallery/${post.id}`)).data.post.comments, 2);

  // 댓글 좋아요
  assert.deepEqual((await call('POST', `/comments/${c1.id}/like`, { token: A, body: { on: true } })).data, { likes: 1, myLike: true });
  assert.deepEqual((await call('POST', `/comments/${c1.id}/like`, { token: A, body: { on: true } })).data, { likes: 1, myLike: true });
  assert.equal((await call('GET', `/gallery/${post.id}/comments`, { token: A })).data.comments[0].myLike, true);
  assert.deepEqual((await call('POST', `/comments/${c1.id}/like`, { token: A, body: { on: false } })).data, { likes: 0, myLike: false });

  // 항목 댓글: 작성자의 밸런스 표가 vote 로
  assert.equal((await call('GET', '/items/cards/nope/comments')).status, 404);
  const ic = (await call('POST', '/items/cards/bash/comments', { token: A, body: { body: '너무 세다' } })).data.comment;
  assert.equal(ic.vote, 'fair');
  await call('POST', '/items/cards/bash/comments', { token: B, body: { body: '약하다' } });
  r = await call('GET', '/items/cards/bash/comments?sort=new');
  assert.deepEqual(r.data.comments.map(c => [c.body, c.vote, c.mine]), [['약하다', null, false], ['너무 세다', 'fair', false]]);
  await call('POST', `/comments/${ic.id}/like`, { token: B, body: { on: true } });
  assert.equal((await call('GET', '/items/cards/bash/comments?sort=top')).data.comments[0].id, ic.id);

  // 남의 댓글·글은 못 지운다
  assert.equal((await call('DELETE', `/comments/${c1.id}`, { token: A })).status, 403);
  assert.equal((await call('DELETE', `/gallery/${p2.id}`, { token: A })).status, 403);
  assert.equal((await call('DELETE', `/comments/${c1.id}`, { token: B })).data.ok, true);
  assert.equal((await call('DELETE', `/comments/${c1.id}`, { token: B })).status, 404);
  assert.equal((await call('GET', `/gallery/${post.id}/comments`)).data.comments.length, 1);
  assert.equal((await call('GET', `/gallery/${post.id}`)).data.post.comments, 1);
  assert.equal(DB.raw.prepare('SELECT body FROM comments WHERE id = ?').get(c1.id).body, '');

  // 신고 3건이면 숨김 (작성자·관리자에게는 보임)
  const carol = await login('carol-sub', 'Carol');
  const admin = await login('admin-sub', 'Admin');
  assert.equal(admin.user.admin, true);
  assert.equal((await call('POST', '/report', { token: B, body: { kind: 'user', id: post.id } })).data.reason, 'kind');
  for (const t of [B, B, carol.token]) assert.equal((await call('POST', '/report', { token: t, body: { kind: 'post', id: post.id, reason: '스팸' } })).data.ok, true);
  assert.equal((await call('GET', `/gallery/${post.id}`)).data.post.hidden, false); // 같은 사람의 신고는 한 번
  await call('POST', '/report', { token: admin.token, body: { kind: 'post', id: post.id } });
  assert.equal((await call('GET', `/gallery/${post.id}`)).status, 404);
  assert.equal((await call('GET', `/gallery/${post.id}/comments`)).status, 404);
  assert.deepEqual((await call('GET', '/gallery')).data.posts.map(p => p.id), [p2.id]);
  assert.equal((await call('GET', `/gallery/${post.id}`, { token: A })).data.post.hidden, true);
  assert.equal((await call('GET', '/gallery', { token: admin.token })).data.posts.length, 2);
  assert.equal((await call('POST', `/gallery/${post.id}/react`, { token: B, body: { v: 1 } })).status, 404);

  // 댓글 신고
  for (const t of [A, carol.token, admin.token]) await call('POST', '/report', { token: t, body: { kind: 'comment', id: ic.id } });
  assert.deepEqual((await call('GET', '/items/cards/bash/comments')).data.comments.map(c => c.body), ['약하다']);
  assert.equal((await call('GET', '/items/cards/bash/comments', { token: A })).data.comments.length, 2);

  // 관리자는 남의 글을 지울 수 있고, 딸린 댓글·반응도 같이 지워진다
  assert.equal((await call('DELETE', `/gallery/${post.id}`, { token: admin.token })).data.ok, true);
  assert.equal(DB.raw.prepare(`SELECT COUNT(*) n FROM comments WHERE target = ?`).get(`post:${post.id}`).n, 0);
  assert.equal(DB.raw.prepare(`SELECT COUNT(*) n FROM reactions WHERE post_id = ?`).get(post.id).n, 0);
  assert.equal((await call('DELETE', `/gallery/${p2.id}`, { token: B })).data.ok, true);

  // 댓글은 1분에 5개까지
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await call('POST', '/items/cards/strike/comments', { token: carol.token, body: { body: `c${i}` } })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);

  // 로그아웃하면 그 세션은 끝
  assert.ok(await getUser(new Request('http://localhost/me', { headers: { Authorization: `Bearer ${B}` } }), env));
  assert.deepEqual((await call('POST', '/auth/logout', { token: B })).data, { ok: true });
  assert.equal((await call('GET', '/me', { token: B })).status, 401);
});
