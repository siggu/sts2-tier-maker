import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyImage, storeModeratedImage, moderationModels, DEFAULT_MODERATION_MODELS, imageCacheKey } from '../src/moderation.js';
import { imageId, inspectImage } from '../src/image.js';
import { handleCups } from '../src/cups.js';
import { handleAccount } from '../src/account.js';
import { handleAdmin } from '../src/admin.js';
import { isAdmin } from '../src/auth.js';
import { corsHeaders } from '../src/http.js';
import { makeTestKey, googlePayload, makeD1 } from './helpers.js';
import { png, pngChunk, jpeg, webp, exifApp1, contains } from './images.js';

const keys = new Set(['cards/bash']);
const LLAMA = '@cf/meta/llama-3.2-11b-vision-instruct';
const LLAVA = '@cf/llava-hf/llava-1.5-7b-hf';

// Workers AI 대역: answers[모델] = 문자열(답) | Error(던짐) | 'hang'(답하지 않음) | 함수(input → 출력)
function mockAI(answers) {
  const calls = [];
  return {
    calls,
    async run(model, input) {
      calls.push({ model, input });
      const a = answers[model];
      if (a === undefined) throw new Error(`3008: model not found ${model}`);
      if (a instanceof Error) throw a;
      if (a === 'hang') return new Promise(() => {});
      if (typeof a === 'function') return a(input);
      return /llava/.test(model) ? { description: a } : { response: a };
    },
  };
}
const LICENSE = new Error("5016: Prior to using this model, you must submit the prompt 'agree'");

test('모델 목록', () => {
  assert.deepEqual(moderationModels({}), DEFAULT_MODERATION_MODELS.split(','));
  assert.deepEqual(moderationModels({ MODERATION_MODELS: ' a , ,b ' }), ['a', 'b']);
  assert.deepEqual(DEFAULT_MODERATION_MODELS.split(','), [LLAMA, LLAVA]);
});

test('AI 판정: 답·오류·다음 모델·시간 초과', async () => {
  const img = png();
  assert.deepEqual(await classifyImage({}, img), { verdict: null, note: 'no-ai' });
  assert.deepEqual(await classifyImage({ AI: {} }, img), { verdict: null, note: 'no-ai' });

  let ai = mockAI({ [LLAMA]: 'SAFE' });
  let r = await classifyImage({ AI: ai }, img);
  assert.deepEqual(r, { verdict: 'safe', note: 'llama-3.2-11b-vision-instruct: SAFE' });
  assert.equal(ai.calls.length, 1);
  // 라마는 messages + image(바이트 배열)
  assert.deepEqual(ai.calls[0].input.image, [...img]);
  assert.match(ai.calls[0].input.messages[0].content, /exactly one word: SAFE or UNSAFE/);

  ai = mockAI({ [LLAMA]: ' unsafe.' });
  assert.equal((await classifyImage({ AI: ai }, img)).verdict, 'unsafe');
  ai = mockAI({ [LLAMA]: 'Not safe' });
  assert.equal((await classifyImage({ AI: ai }, img)).verdict, 'unsafe');

  // 라마가 라이선스 동의를 요구하면 'agree' 를 보내지 않고 다음 모델(llava)로
  ai = mockAI({ [LLAMA]: LICENSE, [LLAVA]: 'The image is SAFE' });
  r = await classifyImage({ AI: ai }, img);
  assert.equal(r.verdict, 'safe');
  assert.match(r.note, /^llava-1\.5-7b-hf: SAFE$/);
  assert.deepEqual(ai.calls.map(c => c.model), [LLAMA, LLAVA]);
  assert.ok(!JSON.stringify(ai.calls.map(c => c.input.messages ?? c.input.prompt)).includes("'agree'"));
  assert.ok(ai.calls.every(c => !/^\s*agree\s*$/i.test(c.input.prompt ?? '') && !c.input.messages?.some(m => /^\s*agree\s*$/i.test(m.content))));
  assert.equal(typeof ai.calls[1].input.prompt, 'string'); // llava 는 prompt + image

  // 알아들을 수 없는 답도 다음 모델로
  ai = mockAI({ [LLAMA]: 'I cannot tell', [LLAVA]: 'UNSAFE' });
  assert.equal((await classifyImage({ AI: ai }, img)).verdict, 'unsafe');

  // 모두 오류 → 판정 없음, 오류를 짧게 남긴다
  ai = mockAI({ [LLAMA]: LICENSE, [LLAVA]: new Error('boom') });
  r = await classifyImage({ AI: ai }, img);
  assert.equal(r.verdict, null);
  assert.match(r.note, /llama-3\.2-11b-vision-instruct: 5016.*llava-1\.5-7b-hf: boom/);

  // 시간 초과 (전체)
  ai = mockAI({ [LLAMA]: 'hang' });
  const t0 = Date.now();
  r = await classifyImage({ AI: ai }, img, { timeoutMs: 50 });
  assert.equal(r.verdict, null);
  assert.match(r.note, /^timeout/);
  assert.ok(Date.now() - t0 < 1000);

  // MODERATION_MODELS 로 순서·모델을 바꾼다
  ai = mockAI({ '@cf/x/one': new Error('nope'), '@cf/x/two': 'SAFE' });
  r = await classifyImage({ AI: ai, MODERATION_MODELS: '@cf/x/one,@cf/x/two' }, img);
  assert.deepEqual([r.verdict, ai.calls.map(c => c.model)], ['safe', ['@cf/x/one', '@cf/x/two']]);
});

const DB0 = await makeD1();

test('검열하며 저장하기', { skip: !DB0 && 'node:sqlite 없음' }, async () => {
  const DB = await makeD1();
  const rows = () => DB.raw.prepare('SELECT id, status, ai, purpose, size FROM images ORDER BY created').all().map(r => ({ ...r }));
  const blocklist = () => DB.raw.prepare('SELECT hash, reason FROM image_blocklist').all().map(r => ({ ...r }));

  // AI 가 SAFE → ok, 메타데이터를 지운 바이트로 id·저장
  let ai = mockAI({ [LLAMA]: 'SAFE' });
  const withExif = jpeg({ app: [exifApp1()] });
  let r = await storeModeratedImage({ DB, AI: ai }, withExif, { userId: 'u1', type: 'image/jpeg' });
  const clean = inspectImage(withExif, 'image/jpeg').bytes;
  assert.deepEqual(r, { id: await imageId(clean), status: 'ok' });
  const stored = DB.raw.prepare('SELECT bytes FROM images WHERE id = ?').get(r.id).bytes;
  assert.deepEqual(new Uint8Array(stored), clean);
  assert.ok(!contains(new Uint8Array(stored), 'GPS-SECRET'));
  assert.equal(ai.calls.length, 1);
  assert.deepEqual(ai.calls[0].input.image, [...clean]); // AI 에도 정리한 바이트

  // 같은 그림(메타데이터만 다름) → 같은 id, AI 를 다시 부르지 않는다
  r = await storeModeratedImage({ DB, AI: ai }, jpeg(), { userId: 'u2', type: 'image/jpeg' });
  assert.deepEqual(r, { id: await imageId(clean), status: 'ok' });
  assert.equal(ai.calls.length, 1);

  // AI 가 UNSAFE → blocked, 바이트는 저장하지 않고 해시만 차단 목록에
  ai = mockAI({ [LLAMA]: 'UNSAFE' });
  r = await storeModeratedImage({ DB, AI: ai }, png({ seed: 9 }), { userId: 'u1' });
  assert.deepEqual(r, { error: 'blocked' });
  const badId = await imageId(png({ seed: 9 }));
  assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM images WHERE id = ?').get(badId).n, 0);
  assert.deepEqual(blocklist(), [{ hash: badId, reason: 'ai llama-3.2-11b-vision-instruct: UNSAFE' }]);
  // 차단된 해시는 AI 를 부르지 않고 바로 거른다 (메타데이터를 붙여도)
  ai = mockAI({ [LLAMA]: 'SAFE' });
  r = await storeModeratedImage({ DB, AI: ai }, png({ seed: 9, before: [pngChunk('tEXt', [65, 0, 66])] }), { userId: 'u3' });
  assert.deepEqual(r, { error: 'blocked' });
  assert.equal(ai.calls.length, 0);

  // AI 오류·없음·시간 초과 → pending (보이지만 검토 목록에)
  r = await storeModeratedImage({ DB, AI: mockAI({ [LLAMA]: LICENSE, [LLAVA]: new Error('x') }) }, png({ seed: 1 }), { userId: 'u1' });
  assert.equal(r.status, 'pending');
  r = await storeModeratedImage({ DB }, webp(), { userId: 'u1', purpose: 'avatar' });
  assert.equal(r.status, 'pending');
  r = await storeModeratedImage({ DB, AI: mockAI({ [LLAMA]: 'hang' }) }, png({ seed: 2 }), { userId: 'u1', timeoutMs: 30 });
  assert.equal(r.status, 'pending');
  const list = rows();
  assert.deepEqual(list.map(x => [x.status, x.purpose]), [['ok', 'cup'], ['pending', 'cup'], ['pending', 'avatar'], ['pending', 'cup']]);
  assert.match(list[1].ai, /5016/);
  assert.equal(list[2].ai, 'no-ai');
  assert.match(list[3].ai, /^timeout/);

  // 형식·크기·움직이는 그림
  assert.deepEqual(await storeModeratedImage({ DB }, png({ w: 8 }), { userId: 'u1' }), { error: 'bad_request', reason: 'dimensions' });
  assert.deepEqual(await storeModeratedImage({ DB }, webp({ kind: 'extended', flags: 0x02 }), { userId: 'u1' }), { error: 'bad_request', reason: 'animated' });
  assert.deepEqual(await storeModeratedImage({ DB }, new Uint8Array([1, 2, 3]), { userId: 'u1' }), { error: 'bad_request', reason: 'image' });
  assert.deepEqual(await storeModeratedImage({ DB }, png(), { userId: 'u1', type: 'image/jpeg' }), { error: 'bad_request', reason: 'image' });

  // 숨김·차단된 이미지를 다시 올리면 blocked
  DB.raw.prepare(`UPDATE images SET status = 'hidden' WHERE id = ?`).run(await imageId(png({ seed: 1 })));
  assert.deepEqual(await storeModeratedImage({ DB }, png({ seed: 1 }), { userId: 'u9' }), { error: 'blocked' });

  // 하루 제한은 새 이미지에만 (AI 를 부르기 전에)
  ai = mockAI({ [LLAMA]: 'SAFE' });
  r = await storeModeratedImage({ DB, AI: ai }, png({ seed: 3 }), { userId: 'u1', dailyLimit: 4 });
  assert.deepEqual(r, { error: 'rate_limited', reason: 'daily' });
  assert.equal(ai.calls.length, 0);
  assert.equal((await storeModeratedImage({ DB, AI: ai }, jpeg(), { userId: 'u1', dailyLimit: 4 })).status, 'ok');
});

test('사이트 전체 한도: 저장 용량·하루 새 이미지·하루 AI 호출', { skip: !DB0 && 'node:sqlite 없음' }, async () => {
  const DB = await makeD1();
  const counter = key => DB.raw.prepare('SELECT n FROM usage_counters WHERE key = ?').get(key)?.n ?? 0;
  const now = Date.UTC(2026, 9, 15, 12);
  const day = '2026-10-15';
  let ai = mockAI({ [LLAMA]: 'SAFE' });

  // 저장하면 용량·하루 수가 늘고, AI 를 부른 수도 센다
  let r = await storeModeratedImage({ DB, AI: ai }, png({ seed: 1 }), { userId: 'u1', now });
  assert.equal(r.status, 'ok');
  const size = DB.raw.prepare('SELECT size FROM images WHERE id = ?').get(r.id).size;
  assert.deepEqual([counter('img_bytes'), counter(`img_day:${day}`), counter(`ai_day:${day}`)], [size, 1, 1]);
  // 같은 그림은 세지 않는다
  await storeModeratedImage({ DB, AI: ai }, png({ seed: 1 }), { userId: 'u2', now });
  assert.deepEqual([counter('img_bytes'), counter(`img_day:${day}`), counter(`ai_day:${day}`)], [size, 1, 1]);

  // AI 하루 한도를 넘으면 AI 없이 pending
  r = await storeModeratedImage({ DB, AI: ai, AI_DAILY_LIMIT: '1' }, png({ seed: 2 }), { userId: 'u1', now });
  assert.deepEqual([r.status, ai.calls.length], ['pending', 1]);
  assert.equal(DB.raw.prepare('SELECT ai FROM images WHERE id = ?').get(r.id).ai, 'ai-daily-limit');

  // 사이트 하루 새 이미지 한도
  r = await storeModeratedImage({ DB, AI: ai, IMAGES_PER_DAY_SITE: '2' }, png({ seed: 3 }), { userId: 'u3', now });
  assert.deepEqual(r, { error: 'rate_limited', reason: 'site_daily' });
  assert.equal(ai.calls.length, 1); // AI 를 부르기 전에 막는다
  // 다음 날은 다시 되고, 지난 날짜 칸은 지운다
  const next = now + 86400000;
  r = await storeModeratedImage({ DB, AI: ai, IMAGES_PER_DAY_SITE: '2' }, png({ seed: 3 }), { userId: 'u3', now: next });
  assert.equal(r.status, 'ok');
  assert.equal(counter(`img_day:${day}`), 0);
  assert.equal(counter(`ai_day:${day}`), 0);
  assert.equal(counter('img_day:2026-10-16'), 1);

  // 저장 용량 한도
  DB.raw.prepare(`UPDATE usage_counters SET n = ? WHERE key = 'img_bytes'`).run(350 * 1024 * 1024 - 10);
  assert.deepEqual(await storeModeratedImage({ DB, AI: ai }, png({ seed: 4 }), { userId: 'u1', now: next }), { error: 'storage_full' });
  assert.equal((await storeModeratedImage({ DB, AI: ai, IMAGE_STORAGE_MB: '400' }, png({ seed: 4 }), { userId: 'u1', now: next })).status, 'ok');
});

test('isAdmin: ADMIN_SUBS 또는 ADMIN_USERS', () => {
  const env = { ADMIN_SUBS: 'sub-a, sub-b', ADMIN_USERS: ' f00d , beef' };
  assert.equal(isAdmin(env, 'sub-b'), true);
  assert.equal(isAdmin(env, 'nope', 'beef'), true);
  assert.equal(isAdmin(env, 'nope', 'f00d'), true);
  assert.equal(isAdmin(env, 'nope', 'cafe'), false);
  assert.equal(isAdmin({}, 'nope', ''), false);
  assert.equal(isAdmin({ ADMIN_USERS: '' }, '', ''), false);
});

// ---------- 경로 전체: 올리기 → /img → 신고 → 관리자 ----------

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const key = await makeTestKey('mod');

test('이미지 신고·관리자 검토 흐름', { skip: !DB0 && 'node:sqlite 없음' }, async () => {
  const DB = await makeD1();
  const ai = mockAI({ [LLAMA]: input => ({ response: input.image.length > 200 ? 'UNSAFE' : 'SAFE' }) });
  const env = { DB, AI: ai, GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_SUBS: 'admin-sub', TEST_JWKS: JSON.stringify(key.jwks), ALLOWED_ORIGINS: 'http://localhost:8000' };
  const ctx = { waitUntil() {} };
  // 엣지 캐시 대역: 지운 열쇠를 적어 둔다
  const purged = [];
  const cacheStore = new Map();
  globalThis.caches = {
    default: {
      async match(k) { return cacheStore.get(String(k))?.clone() ?? null; },
      async put(k, res) { cacheStore.set(String(k), res); },
      async delete(k) { purged.push(String(k)); return cacheStore.delete(String(k)); },
    },
  };
  let ip = 1;
  async function send(method, path, { body, token, raw, type } = {}) {
    const headers = { Origin: 'http://localhost:8000', 'CF-Connecting-IP': `10.7.0.${ip++ % 250}` };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (type) headers['Content-Type'] = type;
    else if (body !== undefined) headers['Content-Type'] = 'application/json';
    const request = new Request(`http://localhost:8787${path}`, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const opts = { url: new URL(request.url), cors: corsHeaders(request, env), keys };
    return (await handleAccount(request, env, ctx, opts)) ?? (await handleCups(request, env, ctx, opts)) ?? (await handleAdmin(request, env, ctx, opts));
  }
  async function call(method, path, opts) {
    const res = await send(method, path, opts);
    return { status: res.status, data: await res.json(), headers: res.headers };
  }
  const login = async sub => (await call('POST', '/auth/google', { body: { credential: await key.sign(googlePayload(CLIENT_ID, { sub, name: sub })) } })).data;

  try {
    const alice = await login('alice-sub');
    const users = [];
    for (const s of ['r1', 'r2', 'r3', 'r4']) users.push(await login(s));
    const admin = await login('admin-sub');
    const A = alice.token;
    const upload = (bytes, type = 'image/png', token = A) => call('POST', '/images', { token, raw: bytes, type });

    // ---- 올리기: SAFE → ok, UNSAFE → 400 blocked ----
    let r = await upload(png({ seed: 1 }));
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.status, 'ok');
    const okId = r.data.id;
    const big = jpeg({ scan: Array(400).fill(0x22) }); // 대역 AI 는 큰 그림을 UNSAFE 로 본다
    r = await upload(big, 'image/jpeg');
    assert.deepEqual([r.status, r.data], [400, { error: 'blocked' }]);
    const bigId = await imageId(big);
    assert.ok(DB.raw.prepare('SELECT 1 FROM image_blocklist WHERE hash = ?').get(bigId));
    r = await upload(big, 'image/jpeg', users[0].token);
    assert.deepEqual([r.status, r.data], [400, { error: 'blocked' }]);
    assert.deepEqual((await upload(png({ w: 2000 }))).data, { error: 'bad_request', reason: 'dimensions' });
    assert.deepEqual((await upload(webp({ kind: 'extended', flags: 0x02 }), 'image/webp')).data, { error: 'bad_request', reason: 'animated' });

    // AI 가 없으면 pending, 그래도 보인다
    const noAi = env.AI;
    env.AI = undefined;
    r = await upload(png({ seed: 2 }));
    env.AI = noAi;
    assert.equal(r.data.status, 'pending');
    const pendingId = r.data.id;

    // ---- /img: ok·pending 은 보낸다, 엣지 캐시 열쇠는 요청 주소 ----
    let res = await send('GET', `/img/${okId}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=86400');
    assert.deepEqual(new Uint8Array(await res.arrayBuffer()), png({ seed: 1 }));
    assert.ok(cacheStore.has(imageCacheKey('http://localhost:8787', okId)));
    assert.equal(cacheStore.get(imageCacheKey('http://localhost:8787', okId)).headers.get('Cache-Control'), 'public, max-age=3600');
    res = await send('GET', `/img/${okId}`); // 캐시에서
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'public, max-age=86400');
    assert.equal((await send('GET', `/img/${pendingId}`)).status, 200);
    assert.equal((await send('GET', `/img/${bigId}`)).status, 404);

    // ---- 신고: 한 사람 한 번, 3명이면 hidden + 캐시 지우기 ----
    const report = (token, id = okId, extra = {}) => call('POST', '/report', { token, body: { kind: 'image', id, ...extra } });
    assert.equal((await call('POST', '/report', { body: { kind: 'image', id: okId } })).status, 401);
    assert.equal((await report(A, 'x'.repeat(24))).data.reason, 'id');
    assert.equal((await report(A, '0'.repeat(32))).status, 404);
    assert.equal((await report(users[0].token, okId, { reason: 'inappropriate: 야함' })).data.ok, true);
    assert.equal((await report(users[0].token)).data.ok, true); // 같은 사람 두 번째는 세지 않는다
    assert.equal((await report(users[1].token)).data.ok, true);
    assert.equal(DB.raw.prepare('SELECT reports, status FROM images WHERE id = ?').get(okId).reports, 2);
    assert.equal((await send('GET', `/img/${okId}`)).status, 200);
    assert.deepEqual(purged, []);
    assert.equal((await report(users[2].token)).data.ok, true);
    assert.deepEqual({ ...DB.raw.prepare('SELECT reports, status FROM images WHERE id = ?').get(okId) }, { reports: 3, status: 'hidden' });
    assert.deepEqual(purged, [imageCacheKey('http://localhost:8787', okId)]);
    assert.equal((await send('GET', `/img/${okId}`)).status, 404);
    assert.equal((await report(users[3].token)).status, 404); // 이미 숨겨짐
    // 숨겨진 그림은 새 월드컵에 쓸 수 없다
    const items = [0, 1, 2, 3].map(i => ({ name: `항목${i}`, img: i === 2 ? `img:${okId}` : null }));
    assert.deepEqual((await call('POST', '/cups', { token: A, body: { title: '시험 월드컵', items } })).data, { error: 'bad_request', reason: 'img', index: 2 });
    // 같은 파일을 다시 올려도 blocked
    assert.deepEqual((await upload(png({ seed: 1 }))).data, { error: 'blocked' });

    // pending 그림에 신고 1건 → reported 목록
    await report(users[0].token, pendingId);

    // ---- 관리자 ----
    assert.equal((await call('GET', '/admin/images')).status, 401);
    assert.equal((await call('GET', '/admin/images', { token: A })).status, 403);
    assert.equal((await call('GET', `/admin/img/${okId}`, { token: A })).status, 403);
    assert.equal((await call('POST', `/admin/images/${okId}`, { token: A, body: { action: 'approve' } })).status, 403);
    assert.equal((await call('DELETE', '/admin/images', { token: admin.token })).status, 405);
    const T = admin.token;
    assert.equal(admin.user.admin, true);
    assert.equal((await call('GET', '/admin/images?status=nope', { token: T })).data.reason, 'status');
    assert.equal((await call('GET', '/admin/images?cursor=1%20or%201', { token: T })).data.reason, 'cursor');

    // 기본은 상태와 관계없이 최근 순 + 상태별 수
    r = await call('GET', '/admin/images', { token: T });
    assert.deepEqual(r.data.images.map(i => i.id), [pendingId, okId]);
    assert.deepEqual(r.data.counts, { all: 2, pending: 1, reported: 1, hidden: 1, blocked: 0 });
    // 기간·사용자·용도
    const created = DB.raw.prepare('SELECT created FROM images WHERE id = ?').get(pendingId).created;
    assert.deepEqual((await call('GET', `/admin/images?from=${created}`, { token: T })).data.images.map(i => i.id), [pendingId]);
    assert.deepEqual((await call('GET', `/admin/images?to=${created}`, { token: T })).data.images.map(i => i.id), [okId]);
    r = await call('GET', `/admin/images?user=${alice.user.id}`, { token: T });
    assert.deepEqual(r.data.user, { id: alice.user.id, name: 'alice-sub' });
    assert.ok(r.data.images.every(i => i.user.id === alice.user.id));
    assert.deepEqual((await call('GET', '/admin/images?purpose=avatar', { token: T })).data.counts.all, 0);
    for (const [qs, reason] of [['from=x', 'from'], ['to=-1', 'to'], ['user=bob', 'user'], ['purpose=hat', 'purpose']]) {
      assert.equal((await call('GET', `/admin/images?${qs}`, { token: T })).data.reason, reason, qs);
    }
    // 올린 사람 찾기 (이름 일부, LIKE 특수 문자는 글자로)
    r = await call('GET', '/admin/uploaders?q=alice', { token: T });
    assert.deepEqual(r.data.users.map(u => [u.id, u.name]), [[alice.user.id, 'alice-sub']]);
    assert.ok(r.data.users[0].images >= 1);
    assert.deepEqual((await call('GET', '/admin/uploaders?q=%25', { token: T })).data.users, []);
    assert.equal((await call('GET', '/admin/uploaders?q=a', { token: A })).status, 403);

    r = await call('GET', '/admin/images?status=pending', { token: T });
    assert.deepEqual(r.data.images.map(i => i.id), [pendingId]);
    const p = r.data.images[0];
    assert.deepEqual({ ...p, created: 0 }, {
      id: pendingId, status: 'pending', reports: 1, ai: 'no-ai', type: 'image/png', size: png({ seed: 2 }).length, purpose: 'cup',
      created: 0, user: { id: alice.user.id, name: 'alice-sub' }, reviewedBy: null, reviewedAt: null, cups: [],
    });
    assert.equal(r.data.next, null);
    assert.deepEqual((await call('GET', '/admin/images?status=reported', { token: T })).data.images.map(i => i.id), [pendingId]);
    r = await call('GET', '/admin/images?status=hidden', { token: T });
    assert.deepEqual(r.data.images.map(i => [i.id, i.reports]), [[okId, 3]]);
    assert.deepEqual((await call('GET', '/admin/images?status=blocked', { token: T })).data.images, []);

    // 관리자는 숨긴 그림도 받는다 (캐시 안 함)
    res = await send('GET', `/admin/img/${okId}`, { token: T });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8000');
    assert.deepEqual(new Uint8Array(await res.arrayBuffer()), png({ seed: 1 }));
    assert.equal((await send('GET', `/admin/img/${'0'.repeat(32)}`, { token: T })).status, 404);

    // 승인: ok + 신고 비우기 → 다시 보인다, 다시 3명이 신고해야 숨겨진다
    assert.equal((await call('POST', `/admin/images/${okId}`, { token: T, body: { action: 'nuke' } })).data.reason, 'action');
    assert.equal((await call('POST', `/admin/images/${'0'.repeat(32)}`, { token: T, body: { action: 'hide' } })).status, 404);
    r = await call('POST', `/admin/images/${okId}`, { token: T, body: { action: 'approve' } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.deepEqual([r.data.image.status, r.data.image.reports, r.data.image.reviewedBy], ['ok', 0, admin.user.id]);
    assert.ok(r.data.image.reviewedAt > 0);
    assert.equal((await send('GET', `/img/${okId}`)).status, 200);
    await report(users[0].token);
    assert.equal(DB.raw.prepare('SELECT status FROM images WHERE id = ?').get(okId).status, 'ok');

    // 월드컵에 쓰인 그림이면 목록에 그 월드컵이 같이 온다
    const made = await call('POST', '/cups', { token: A, body: { title: '시험 월드컵', cover: `img:${pendingId}`, items } });
    assert.equal(made.status, 200, JSON.stringify(made.data));
    r = await call('GET', '/admin/images?status=reported', { token: T });
    const usedBy = [{ id: made.data.cup.id, title: '시험 월드컵' }];
    assert.deepEqual(Object.fromEntries(r.data.images.map(i => [i.id, i.cups])), { [okId]: usedBy, [pendingId]: usedBy });

    // 숨김
    purged.length = 0;
    r = await call('POST', `/admin/images/${pendingId}`, { token: T, body: { action: 'hide' } });
    assert.equal(r.data.image.status, 'hidden');
    assert.deepEqual(purged, [imageCacheKey('http://localhost:8787', pendingId)]);
    assert.equal((await send('GET', `/img/${pendingId}`)).status, 404);

    // 차단: 차단 목록에 넣고 캐시 지우기 → 같은 파일 다시 올리기 금지. 승인하면 풀린다.
    r = await call('POST', `/admin/images/${okId}`, { token: T, body: { action: 'block' } });
    assert.equal(r.data.image.status, 'blocked');
    assert.ok(purged.includes(imageCacheKey('http://localhost:8787', okId)));
    assert.equal((await send('GET', `/img/${okId}`)).status, 404);
    assert.deepEqual((await upload(png({ seed: 1 }), 'image/png', users[3].token)).data, { error: 'blocked' });
    assert.deepEqual((await call('GET', '/admin/images?status=blocked', { token: T })).data.images.map(i => i.id), [okId]);
    await call('POST', `/admin/images/${okId}`, { token: T, body: { action: 'approve' } });
    assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM image_blocklist WHERE hash = ?').get(okId).n, 0);
    assert.equal((await upload(png({ seed: 1 }), 'image/png', users[3].token)).data.status, 'ok');

    // ADMIN_USERS 로 관리자가 된다
    assert.equal((await call('GET', '/admin/images', { token: users[3].token })).status, 403);
    env.ADMIN_USERS = users[3].user.id;
    const again = await call('GET', '/admin/images', { token: users[3].token });
    assert.equal(again.status, 200);
    assert.equal((await call('GET', '/me', { token: users[3].token })).data.user.admin, true);
    delete env.ADMIN_USERS;

    // 쪽 나누기: pending 65개 → 60 + 5 (기간·사용자 조건과 커서를 함께 써도)
    const now = Date.now();
    for (let i = 0; i < 65; i++) {
      DB.raw.prepare(`INSERT INTO images (id, user_id, type, bytes, size, created, status) VALUES (?, ?, 'image/png', x'00', 1, ?, 'pending')`)
        .run(i.toString(16).padStart(32, 'c'), alice.user.id, now + (i % 4));
    }
    const scope = `status=pending&from=${now - 1}&user=${alice.user.id}`;
    const page1 = (await call('GET', `/admin/images?${scope}`, { token: T })).data;
    assert.equal(page1.images.length, 60);
    assert.equal(page1.counts.pending, 65);
    const page2 = (await call('GET', `/admin/images?${scope}&cursor=${encodeURIComponent(page1.next)}`, { token: T })).data;
    assert.equal(page2.images.length, 5);
    assert.equal(page2.next, null);
    assert.equal(page2.counts, undefined);
    assert.equal(new Set([...page1.images, ...page2.images].map(i => i.id)).size, 65);
  } finally {
    delete globalThis.caches;
  }
});
