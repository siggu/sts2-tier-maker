import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleCups, cleanLine, cleanText, refKind, imageIdsOf, validateCup, validateCupPatch, cupSample,
  validatePlay, playError, tallyMatches, imageTypeOf, IMAGE_TYPES, imageId, MAX_IMAGE_BYTES,
} from '../src/cups.js';
import { handleAccount } from '../src/account.js';
import { avatarOf } from '../src/auth.js';
import { corsHeaders } from '../src/http.js';
import { makeTestKey, googlePayload, makeD1, playBracket } from './helpers.js';

const keys = new Set(['cards/bash', 'cards/strike', 'relics/anchor']);
const HEX = 'a'.repeat(32);
const voter = 'abcdef0123456789';

// 시험용 이미지: 매직 바이트 + 아무 내용
const png = (seed = 0) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, seed]);
const jpeg = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const webp = () => new Uint8Array([...'RIFF'].map(c => c.charCodeAt(0)).concat([4, 0, 0, 0], [...'WEBPVP8 '].map(c => c.charCodeAt(0))));

// 이긴 쪽 = 짝의 앞쪽(혹은 pick 이 고른 쪽)으로 한 판을 치른 경기 목록
function bracket(entrants, pick = (a) => a) {
  let round = [...entrants];
  const matches = [];
  while (round.length > 1) {
    const next = [];
    for (let i = 0; i < round.length; i += 2) {
      const w = pick(round[i], round[i + 1]);
      const l = w === round[i] ? round[i + 1] : round[i];
      matches.push([w, l]);
      next.push(w);
    }
    round = next;
  }
  return { champion: round[0], entrants, matches };
}

// ---------- 입력 검사 ----------

test('글 정리: 한 줄·여러 줄', () => {
  assert.equal(cleanLine('  가   나\n다 ', 2, 60), '가 나 다');
  assert.equal(cleanLine('a', 2, 60), null);
  assert.equal(cleanLine('x'.repeat(61), 2, 60), null);
  assert.equal(cleanLine('🙂🙂', 2, 60), '🙂🙂'); // 코드 포인트로 센다
  assert.equal(cleanLine('a‮b', 2, 60), 'ab'); // 방향 바꾸기 문자 제거
  assert.equal(cleanLine(3, 1, 80), null);
  assert.equal(cleanText('', 0, 300), '');
  assert.equal(cleanText('a\r\n\n\n\nb', 0, 300), 'a\n\nb');
  assert.equal(cleanText('x'.repeat(301), 0, 300), null);
});

test('이미지 참조', () => {
  assert.equal(refKind(null, keys), 'none');
  assert.equal(refKind(`img:${HEX}`, keys), 'img');
  assert.equal(refKind('game:cards/bash', keys), 'game');
  assert.equal(refKind('game:cards/nope', keys), null);
  assert.equal(refKind(`img:${HEX.toUpperCase()}`, keys), null);
  assert.equal(refKind(`img:${HEX}0`, keys), null);
  assert.equal(refKind('https://evil.example/x.png', keys), null);
  assert.equal(refKind(undefined, keys), null);
  assert.equal(refKind(5, keys), null);
  assert.deepEqual(imageIdsOf([null, `img:${HEX}`, 'game:cards/bash', `img:${HEX}`, 'img:x']), [HEX]);
});

test('월드컵 만들기 검사', () => {
  const items = n => Array.from({ length: n }, (_, i) => ({ name: `항목 ${i + 1}`, img: i % 2 ? 'game:cards/bash' : null }));
  const ok = validateCup({ title: ' 내 월드컵 ', items: items(4) }, keys);
  assert.deepEqual(ok.cup, { title: '내 월드컵', description: '', cover: null, items: items(4) });
  assert.equal(validateCup(null, keys).reason, 'json');
  assert.equal(validateCup({ title: 'x', items: items(4) }, keys).reason, 'title');
  assert.equal(validateCup({ title: 'xx', description: 5, items: items(4) }, keys).reason, 'description');
  assert.equal(validateCup({ title: 'xx', cover: 'game:nope/x', items: items(4) }, keys).reason, 'cover');
  assert.equal(validateCup({ title: 'xx', items: items(3) }, keys).reason, 'items');
  assert.equal(validateCup({ title: 'xx', items: items(65) }, keys).reason, 'items');
  assert.equal(validateCup({ title: 'xx', items: 'nope' }, keys).reason, 'items');
  assert.ok(validateCup({ title: 'xx', items: items(64) }, keys).cup);
  const bad = items(5);
  bad[3] = { name: '   ', img: null };
  assert.deepEqual(validateCup({ title: 'xx', items: bad }, keys), { reason: 'name', index: 3 });
  bad[3] = { name: 'ok', img: 'img:zz' };
  assert.deepEqual(validateCup({ title: 'xx', items: bad }, keys), { reason: 'img', index: 3 });
  bad[3] = null;
  assert.deepEqual(validateCup({ title: 'xx', items: bad }, keys), { reason: 'item', index: 3 });
  // img 를 빼면 null
  assert.equal(validateCup({ title: 'xx', items: items(4).map(({ name }) => ({ name })) }, keys).cup.items[0].img, null);

  assert.deepEqual(validateCupPatch({}, keys), { patch: {} });
  assert.deepEqual(validateCupPatch({ title: ' 새 제목 ', cover: null }, keys), { patch: { title: '새 제목', cover: null } });
  assert.equal(validateCupPatch({ title: '' }, keys).reason, 'title');
  assert.equal(validateCupPatch({ cover: 'x' }, keys).reason, 'cover');
  assert.equal(validateCupPatch({ description: 'x'.repeat(301) }, keys).reason, 'description');
});

test('미리보기: 이미지 있는 항목 먼저 4개', () => {
  assert.deepEqual(cupSample([{ img: null }, { img: 'a' }, { img: null }, { img: 'b' }, { img: 'c' }]), ['a', 'b', 'c', null]);
  assert.deepEqual(cupSample([{ img: null }, { img: null }, { img: null }, { img: null }]), [null, null, null, null]);
  assert.deepEqual(cupSample(['a', 'b', 'c', 'd', 'e'].map(img => ({ img }))), ['a', 'b', 'c', 'd']);
});

test('한 판 결과 검사', () => {
  const ids = new Set(Array.from({ length: 10 }, (_, i) => `i${i + 1}`));
  const four = ['i1', 'i2', 'i3', 'i4'];
  const b = bracket(four);
  assert.equal(validatePlay({ ...b, voter }, ids), null);
  assert.equal(validatePlay(b, ids, true), null);
  assert.equal(validatePlay(b, ids), 'voter');
  assert.equal(validatePlay({ ...b, voter: 'u_abcdefgh123' }, ids), 'voter');
  assert.equal(validatePlay(null, ids, true), 'body');
  assert.equal(validatePlay({ ...b, entrants: ['i1', 'i2', 'i3'] }, ids, true), 'matches'); // 3개도 되지만(예선 1 + 결승) 경기 수가 틀림
  assert.equal(validatePlay({ ...b, entrants: ['i1'] }, ids, true), 'entrants');
  assert.equal(validatePlay(bracket(['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8']), new Set(['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7']), true), 'entrants'); // 항목 수보다 많다
  assert.equal(validatePlay({ ...b, entrants: ['i1', 'i2', 'i3', 'x'] }, ids, true), 'item');
  assert.equal(validatePlay({ ...b, entrants: ['i1', 'i2', 'i3', 'i3'] }, ids, true), 'duplicate');
  assert.equal(validatePlay({ ...b, matches: b.matches.slice(1) }, ids, true), 'matches');
  assert.equal(validatePlay({ ...b, matches: 'x' }, ids, true), 'matches');
  assert.equal(validatePlay({ ...b, matches: [['i1', 'i2'], ['i3', 'i4'], ['i2', 'i3']] }, ids, true), 'match'); // 진 항목이 다시 나온다
  assert.equal(validatePlay({ ...b, matches: [['i1', 'i2'], ['i3', 'i4'], ['i1', 'i1']] }, ids, true), 'match');
  assert.equal(validatePlay({ ...b, matches: [['i1', 'i2'], ['i3', 'i5'], ['i1', 'i3']] }, ids, true), 'match'); // 출전하지 않은 항목
  assert.equal(validatePlay({ ...b, matches: [['i1', 'i2'], ['i3'], ['i1', 'i3']] }, ids, true), 'match');
  assert.equal(validatePlay({ ...b, champion: 'i3' }, ids, true), 'champion');
  const big = Array.from({ length: 64 }, (_, i) => `i${i + 1}`);
  assert.equal(validatePlay(bracket(big, (x, y) => y), new Set(big), true), null);
  assert.deepEqual(tallyMatches(four, b.matches), { i1: [2, 0, 1], i2: [0, 1, 0], i3: [1, 1, 0.5], i4: [0, 1, 0] });
  assert.deepEqual(tallyMatches(four, [['i1', 'i2'], ['i3', 'i4'], ['i3', 'i1']]), { i1: [1, 1, 0.5], i2: [0, 1, 0], i3: [2, 0, 1], i4: [0, 1, 0] });
  // 전체 참가(2의 거듭제곱이 아님): 5·6·12·37개, 그리고 64개
  for (const n of [5, 6, 12, 37, 64]) {
    const all = Array.from({ length: n }, (_, i) => `i${i + 1}`);
    const set = new Set(all);
    assert.equal(validatePlay(playBracket(all), set, true), null, `n=${n}`);
    assert.equal(validatePlay(playBracket(all, (x, y) => y), set, true), null, `n=${n}`);
    assert.equal(validatePlay(playBracket(all), new Set([...all.slice(1), 'zz']), true), 'item', `n=${n}`); // 없는 항목
    assert.equal(validatePlay(playBracket([...all, 'i999']), set, true), 'entrants', `n=${n}`); // 항목 수 초과
  }
  // 예선(앞의 1경기)에 이어 같은 항목이 본선 같은 라운드에 두 번 → round
  const five = ['i1', 'i2', 'i3', 'i4', 'i5'];
  assert.deepEqual(playError({ entrants: five, champion: 'i1', matches: [['i1', 'i2'], ['i1', 'i3'], ['i1', 'i4'], ['i1', 'i5']] }, ids, true), { reason: 'round', index: 2 });
  // 6개: 예선 2경기에 같은 항목 → prelim
  const six = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'];
  assert.deepEqual(playError({ entrants: six, champion: 'i1', matches: [['i1', 'i2'], ['i1', 'i3'], ['i4', 'i5'], ['i6', 'i4'], ['i1', 'i6']] }, ids, true), { reason: 'prelim', index: 1 });
  // n=5 진출도: 예선 i1>i2, 준결승 i3>i1, i4>i5, 결승 i3>i4 → i1 1/3, i2 0, i3 1, i4 2/3, i5 1/3 (부전승은 예선 라운드를 이긴 셈)
  const t5 = tallyMatches(five, [['i1', 'i2'], ['i3', 'i1'], ['i4', 'i5'], ['i3', 'i4']]);
  assert.deepEqual(Object.fromEntries(Object.entries(t5).map(([k, v]) => [k, [v[0], v[1], Math.round(v[2] * 1e6) / 1e6]])),
    { i1: [1, 1, 0.333333], i2: [0, 1, 0], i3: [2, 0, 1], i4: [1, 1, 0.666667], i5: [0, 1, 0.333333] });
});

test('이미지 형식', async () => {
  assert.equal(imageTypeOf('image/PNG; charset=x'), 'image/png');
  assert.equal(imageTypeOf('image/svg+xml'), null);
  assert.equal(imageTypeOf('image/gif'), null);
  assert.equal(imageTypeOf(null), null);
  assert.equal(imageTypeOf('constructor'), null);
  assert.ok(IMAGE_TYPES['image/png'](png()));
  assert.ok(IMAGE_TYPES['image/jpeg'](jpeg()));
  assert.ok(IMAGE_TYPES['image/webp'](webp()));
  assert.ok(!IMAGE_TYPES['image/png'](jpeg()));
  assert.ok(!IMAGE_TYPES['image/webp'](png()));
  assert.ok(!IMAGE_TYPES['image/jpeg'](new Uint8Array([0xff, 0xd8])));
  assert.match(await imageId(png()), /^[0-9a-f]{32}$/);
  assert.equal(await imageId(png()), await imageId(png()));
  assert.notEqual(await imageId(png(1)), await imageId(png(2)));
});

// ---------- 경로 전체 (node:sqlite 로 만든 D1 대역, 마이그레이션 0001–0005) ----------

const DB = await makeD1();
const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const key = await makeTestKey('k1');

test('사용자 월드컵 흐름', { skip: !DB && 'node:sqlite 없음' }, async () => {
  const env = { DB, GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_SUBS: 'admin-sub', TEST_JWKS: JSON.stringify(key.jwks), ALLOWED_ORIGINS: 'http://localhost:8000' };
  const ctx = { waitUntil() {} };
  let ip = 1;
  // index.js 처럼 account → cups 순서로 넘긴다
  async function send(method, path, { body, token, raw, type, ipAddr } = {}) {
    const headers = { Origin: 'http://localhost:8000', 'CF-Connecting-IP': ipAddr ?? `10.0.0.${ip}` };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (type) headers['Content-Type'] = type;
    else if (body !== undefined) headers['Content-Type'] = 'application/json';
    const request = new Request(`http://localhost:8787${path}`, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const opts = { url: new URL(request.url), cors: corsHeaders(request, env), keys };
    return (await handleAccount(request, env, ctx, opts)) ?? (await handleCups(request, env, ctx, opts));
  }
  async function call(method, path, opts) {
    const res = await send(method, path, opts);
    if (!res) return { status: 0, data: null };
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8000', `${method} ${path}`);
    return { status: res.status, data: await res.json() };
  }
  const login = async (sub, name) => {
    ip++;
    const r = await call('POST', '/auth/google', { body: { credential: await key.sign(googlePayload(CLIENT_ID, { sub, name })) } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data;
  };
  const resetLimits = () => DB.raw.exec('DELETE FROM rate_limit');

  const alice = await login('alice-sub', 'Alice');
  const bob = await login('bob-sub', 'Bob');
  const carol = await login('carol-sub', 'Carol');
  const admin = await login('admin-sub', 'Admin');
  const A = alice.token, B = bob.token;

  // 자기 경로가 아니면 null, 메서드가 틀리면 405
  assert.equal(await send('GET', '/nope'), null);
  assert.equal((await call('GET', '/images')).status, 405);
  assert.equal((await call('PUT', '/cups')).status, 405);

  // ---- 이미지 올리기 ----
  assert.equal((await call('POST', '/images', { raw: png(), type: 'image/png' })).status, 401);
  let r = await call('POST', '/images', { token: A, raw: png(), type: 'image/png' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const pngId = r.data.id;
  assert.deepEqual(r.data, { id: pngId, ref: `img:${pngId}` });
  assert.equal(pngId, await imageId(png()));
  // 같은 파일은 같은 id (다른 사람이 올려도)
  assert.deepEqual((await call('POST', '/images', { token: B, raw: png(), type: 'image/png' })).data, { id: pngId, ref: `img:${pngId}` });
  assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM images').get().n, 1);
  const webpRef = (await call('POST', '/images', { token: A, raw: webp(), type: 'image/webp' })).data.ref;
  assert.deepEqual((await call('POST', '/images', { token: A, raw: png(), type: 'text/html' })).data, { error: 'bad_request', reason: 'type' });
  assert.deepEqual((await call('POST', '/images', { token: A, raw: jpeg(), type: 'image/png' })).data, { error: 'bad_request', reason: 'image' });
  assert.deepEqual((await call('POST', '/images', { token: A, raw: new Uint8Array(0), type: 'image/jpeg' })).data, { error: 'bad_request', reason: 'image' });
  const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
  huge.set(jpeg());
  assert.equal((await call('POST', '/images', { token: A, raw: huge, type: 'image/jpeg' })).status, 413);
  const edge = new Uint8Array(MAX_IMAGE_BYTES);
  edge.set(jpeg());
  r = await call('POST', '/images', { token: A, raw: edge, type: 'image/jpeg' });
  assert.equal(r.status, 200);
  const jpegRef = r.data.ref;

  // IP 당 1분 20개
  resetLimits();
  const statuses = [];
  for (let i = 0; i < 21; i++) statuses.push((await call('POST', '/images', { token: A, raw: png(), type: 'image/png', ipAddr: '10.9.9.9' })).status);
  assert.deepEqual(statuses.slice(-2), [200, 429]);

  // ---- 이미지 받기 ----
  let res = await send('GET', `/img/${pngId}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/png');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('Content-Security-Policy'), "default-src 'none'");
  assert.equal(res.headers.get('Vary'), null);
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), png());
  res = await send('GET', `/img/${jpegRef.slice(4)}`);
  assert.equal((await res.arrayBuffer()).byteLength, MAX_IMAGE_BYTES);
  assert.equal((await call('GET', `/img/${HEX}`)).status, 404);
  assert.equal((await call('GET', '/img/..%2Fx')).status, 404);

  // ---- 만들기 ----
  const items = [
    { name: '첫째', img: null },
    { name: '둘째', img: `img:${pngId}` },
    { name: '셋째', img: 'game:cards/bash' },
    { name: '넷째' },
    { name: '다섯째', img: webpRef },
    { name: '여섯째', img: null },
    { name: '일곱째', img: 'game:relics/anchor' },
    { name: '<b>여덟째</b>', img: null },
  ];
  const make = (body, token = A) => call('POST', '/cups', { token, body: { title: '최애 월드컵', description: '설명\n둘째 줄', cover: jpegRef, items, ...body } });
  resetLimits();
  assert.equal((await call('POST', '/cups', { body: {} })).status, 401);
  assert.equal((await make({ title: 'x' })).data.reason, 'title');
  assert.deepEqual((await make({ items: items.map((it, i) => (i === 5 ? { ...it, img: `img:${HEX}` } : it)) })).data, { error: 'bad_request', reason: 'img', index: 5 });
  resetLimits();
  assert.equal((await make({ cover: `img:${HEX}` })).data.reason, 'cover');
  assert.deepEqual((await make({ items: items.slice(0, 3) })).data, { error: 'bad_request', reason: 'items' });
  assert.equal((await call('POST', '/cups', { token: A, raw: 'nope' })).data.reason, 'json');
  resetLimits();
  r = await make({});
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const cup = r.data.cup;
  assert.match(cup.id, /^[0-9a-f]{24}$/);
  assert.deepEqual({ ...cup, id: 0, created: 0 }, {
    id: 0, title: '최애 월드컵', description: '설명\n둘째 줄', cover: jpegRef, itemCount: 8, plays: 0, likes: 0, comments: 0,
    author: { id: alice.user.id, name: 'Alice', avatar: avatarOf(null, alice.user.id) }, created: 0,
    sample: [`img:${pngId}`, 'game:cards/bash', webpRef, 'game:relics/anchor'], myLike: false, hidden: false, mine: true,
  });

  r = await call('GET', `/cups/${cup.id}`);
  assert.deepEqual(r.data.cup, { ...cup, mine: false });
  assert.deepEqual(r.data.items.map(it => [it.id, it.name, it.img]), items.map((it, i) => [`i${i + 1}`, it.name, it.img ?? null]));
  assert.deepEqual(r.data.items[0], {
    id: 'i1', name: '첫째', img: null, champ: 0, entries: 0, wins: 0, losses: 0, expected: 0, progress: 0, tracked: 0, trackedChamp: 0,
  });
  assert.equal((await call('GET', `/cups/${'0'.repeat(24)}`)).status, 404);
  assert.equal((await call('GET', '/cups/x')).status, 404);

  // 1분에 3개
  resetLimits();
  const four = items.slice(0, 4);
  const made = [];
  for (let i = 0; i < 4; i++) made.push(await make({ title: `빠른 ${i}`, items: four }, B));
  assert.deepEqual(made.map(m => m.status), [200, 200, 200, 429]);
  // 하루 10개
  resetLimits();
  for (let i = 0; i < 10; i++) {
    DB.raw.prepare(`INSERT INTO cups (id, user_id, title, item_count, created) VALUES (?, ?, 'old', 4, ?)`).run(`c${i}`.padEnd(24, 'e'), carol.user.id, Date.now() - 1000);
  }
  assert.deepEqual((await make({}, carol.token)).data, { error: 'rate_limited', reason: 'daily' });
  DB.raw.exec(`DELETE FROM cups WHERE title = 'old'`);

  // ---- 목록 ---- (같은 ms 에 만들어졌을 수 있어 시각을 정해 둔다)
  const T = 1_900_000_000_000;
  DB.raw.prepare('UPDATE cups SET created = ? WHERE id = ?').run(T, cup.id);
  made.slice(0, 3).forEach((m, i) => DB.raw.prepare('UPDATE cups SET created = ? WHERE id = ?').run(T + 1 + i, m.data.cup.id));
  r = await call('GET', '/cups');
  assert.deepEqual(r.data.cups.map(c => c.title), ['빠른 2', '빠른 1', '빠른 0', '최애 월드컵']);
  assert.equal(r.data.next, null);
  assert.deepEqual((await call('GET', `/cups?author=${alice.user.id}`)).data.cups.map(c => c.id), [cup.id]);
  assert.equal((await call('GET', '/cups?sort=hot')).data.reason, 'sort');
  assert.equal((await call('GET', '/cups?author=x')).data.reason, 'author');
  assert.equal((await call('GET', '/cups?cursor=1%20OR%201=1')).data.reason, 'cursor');

  // ---- 한 판 ----
  const ids = items.map((_, i) => `i${i + 1}`);
  const play = (body, opts = {}) => call('POST', `/cups/${cup.id}/play`, { body, ...opts });
  const eight = bracket(ids); // i1 우승
  assert.equal((await play({ ...eight })).data.reason, 'voter');
  assert.equal((await play({ ...eight }, { token: 'x'.repeat(43) })).status, 401); // 세션 만료 + voter 없음
  assert.equal((await play({ ...eight, entrants: [...ids, 'i9'] }, { token: B })).data.reason, 'entrants');
  assert.equal((await play({ ...bracket(['i1', 'i2', 'i3', 'i99']) }, { token: B })).data.reason, 'item');
  assert.equal((await play({ ...eight, champion: 'i2' }, { token: B })).data.reason, 'champion');
  assert.equal((await play({ ...eight, matches: eight.matches.slice(1) }, { token: B })).data.reason, 'matches');
  assert.equal((await call('POST', `/cups/${cup.id}/play`, { raw: '{' })).data.reason, 'json');
  assert.equal((await play({ ...eight, voter }, { ipAddr: '10.5.0.1' })).data.ok, true);
  const four2 = bracket(['i5', 'i6', 'i7', 'i8'], (x, y) => y); // i8 우승
  assert.deepEqual((await play(four2, { token: B, ipAddr: '10.5.0.2' })).data, { ok: true });
  r = await call('GET', `/cups/${cup.id}`);
  assert.equal(r.data.cup.plays, 2);
  const stat = Object.fromEntries(r.data.items.map(it => [it.id, [it.champ, it.entries, it.wins, it.losses]]));
  assert.deepEqual(stat, {
    i1: [1, 1, 3, 0], i2: [0, 1, 0, 1], i3: [0, 1, 1, 1], i4: [0, 1, 0, 1],
    i5: [0, 2, 2, 2], i6: [0, 2, 1, 2], i7: [0, 2, 1, 2], i8: [1, 2, 2, 1],
  });
  // 대진 크기를 반영한 수치: 8강(i1 우승) + 4강(i8 우승)
  const sx = id => { const it = r.data.items.find(x => x.id === id); return [it.expected, it.progress, it.tracked, it.trackedChamp]; };
  assert.deepEqual(sx('i1'), [0.125, 1, 1, 1]);
  assert.deepEqual(sx('i2'), [0.125, 0, 1, 0]);
  assert.deepEqual(sx('i3'), [0.125, 0.3333, 1, 0]);   // 8강에서 1승 (3라운드 중 1)
  assert.deepEqual(sx('i5'), [0.375, 0.6667, 2, 0]);   // 1/8 + 1/4, 1/3 + 1/3
  assert.deepEqual(sx('i8'), [0.375, 1, 2, 1]);        // 8강 첫 경기 탈락(0) + 4강 우승(1)
  // 전체 참가 5개 (예선 1경기, 부전승 3개): i1>i2 예선, i3>i1, i4>i5, i3>i4
  const full5 = { entrants: ['i1', 'i2', 'i3', 'i4', 'i5'], champion: 'i3', matches: [['i1', 'i2'], ['i3', 'i1'], ['i4', 'i5'], ['i3', 'i4']] };
  assert.deepEqual((await play(full5, { token: B, ipAddr: '10.5.0.4' })).data, { ok: true });
  // 예선 구조가 틀린 6개 판은 400 + 경기 위치
  const bad6 = { entrants: ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'], champion: 'i1', matches: [['i1', 'i2'], ['i1', 'i3'], ['i4', 'i5'], ['i6', 'i4'], ['i1', 'i6']] };
  assert.deepEqual((await play(bad6, { token: B, ipAddr: '10.5.0.4' })).data, { error: 'bad_request', reason: 'prelim', index: 1 });
  r = await call('GET', `/cups/${cup.id}`);
  assert.equal(r.data.cup.plays, 3);
  assert.deepEqual(sx('i2'), [0.325, 0, 2, 0]);        // 1/8 + 1/5, 예선 탈락 0
  assert.deepEqual(sx('i3'), [0.325, 1.3333, 2, 1]);   // 부전승 우승 → 1
  assert.deepEqual(sx('i5'), [0.575, 1, 3, 0]);        // 부전승 후 준결승 탈락 1/3
  assert.deepEqual(sx('i6'), [0.375, 0.5, 2, 0]);      // 이번 판에는 나오지 않음 (8강 0 + 4강 준우승 1/2)
  assert.deepEqual(sx('i1').slice(1), [1.3333, 2, 1]); // 예선 승 → 준결승 탈락 1/3

  // IP 당 1분 6판
  const plays = [];
  for (let i = 0; i < 7; i++) plays.push((await play(four2, { token: B, ipAddr: '10.5.0.3' })).status);
  assert.deepEqual(plays, [200, 200, 200, 200, 200, 200, 429]);

  // ---- 인기순: 좋아요 > 판 수 > 최신 ----
  const fast0 = made[0].data.cup.id;
  assert.equal((await call('POST', `/cups/${fast0}/like`, { body: { on: true } })).status, 401);
  assert.equal((await call('POST', `/cups/${fast0}/like`, { token: B, body: { on: 1 } })).data.reason, 'on');
  assert.deepEqual((await call('POST', `/cups/${fast0}/like`, { token: B, body: { on: true } })).data, { likes: 1, myLike: true });
  assert.deepEqual((await call('POST', `/cups/${fast0}/like`, { token: B, body: { on: true } })).data, { likes: 1, myLike: true });
  assert.deepEqual((await call('POST', `/cups/${fast0}/like`, { token: A, body: { on: true } })).data, { likes: 2, myLike: true });
  assert.deepEqual((await call('POST', `/cups/${fast0}/like`, { token: A, body: { on: false } })).data, { likes: 1, myLike: false });
  r = await call('GET', '/cups?sort=top', { token: B });
  assert.deepEqual(r.data.cups.map(c => [c.title, c.myLike]), [['빠른 0', true], ['최애 월드컵', false], ['빠른 2', false], ['빠른 1', false]]);
  assert.equal((await call('GET', `/cups/${fast0}`, { token: B })).data.cup.myLike, true);
  assert.equal((await call('POST', `/cups/${'0'.repeat(24)}/like`, { token: B, body: { on: true } })).status, 404);

  // ---- 댓글 (갤러리 댓글과 같은 모양, 같은 /comments/:id 경로) ----
  assert.equal((await call('POST', `/cups/${cup.id}/comments`, { body: { body: 'x' } })).status, 401);
  assert.equal((await call('POST', `/cups/${cup.id}/comments`, { token: B, body: { body: ' ' } })).data.reason, 'body');
  const c1 = (await call('POST', `/cups/${cup.id}/comments`, { token: B, body: { body: '재밌다' } })).data.comment;
  assert.deepEqual({ ...c1, id: 0, created: 0 }, {
    id: 0, body: '재밌다', author: { id: bob.user.id, name: 'Bob', avatar: avatarOf(null, bob.user.id) }, created: 0,
    likes: 0, myLike: false, mine: true, vote: null, hidden: false,
  });
  const c2 = (await call('POST', `/cups/${cup.id}/comments`, { token: A, body: { body: '고마워요' } })).data.comment;
  r = await call('GET', `/cups/${cup.id}/comments`, { token: A });
  assert.deepEqual(r.data.comments.map(c => [c.id, c.mine]), [[c1.id, false], [c2.id, true]]);
  assert.equal((await call('GET', `/cups/${cup.id}`)).data.cup.comments, 2);
  assert.deepEqual((await call('POST', `/comments/${c1.id}/like`, { token: A, body: { on: true } })).data, { likes: 1, myLike: true });
  assert.equal((await call('DELETE', `/comments/${c1.id}`, { token: A })).status, 403);
  assert.equal((await call('DELETE', `/comments/${c1.id}`, { token: B })).data.ok, true);
  assert.equal((await call('GET', `/cups/${cup.id}`)).data.cup.comments, 1);
  assert.equal((await call('GET', `/cups/${cup.id}/comments`)).data.comments.length, 1);
  // 댓글 신고 3건 → 숨김, 댓글 수도 줄어든다
  for (const t of [B, carol.token, admin.token]) await call('POST', '/report', { token: t, body: { kind: 'comment', id: c2.id } });
  assert.equal((await call('GET', `/cups/${cup.id}`)).data.cup.comments, 0);
  assert.equal((await call('GET', `/cups/${cup.id}/comments`)).data.comments.length, 0);

  // ---- 고치기 ----
  resetLimits();
  assert.equal((await call('PATCH', `/cups/${cup.id}`, { token: B, body: { title: '남의 것' } })).status, 403);
  assert.equal((await call('PATCH', `/cups/${cup.id}`, { token: A, body: { title: 'x' } })).data.reason, 'title');
  assert.equal((await call('PATCH', `/cups/${cup.id}`, { token: A, body: { cover: `img:${HEX}` } })).data.reason, 'cover');
  r = await call('PATCH', `/cups/${cup.id}`, { token: A, body: { title: ' 새 제목 ', cover: 'game:cards/strike', items: [] } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.cup.title, '새 제목');
  assert.equal(r.data.cup.cover, 'game:cards/strike');
  assert.equal(r.data.cup.description, '설명\n둘째 줄');
  r = await call('PATCH', `/cups/${cup.id}`, { token: admin.token, body: { description: '', cover: null } });
  assert.deepEqual([r.data.cup.title, r.data.cup.description, r.data.cup.cover, r.data.cup.mine], ['새 제목', '', null, false]);
  r = await call('GET', `/cups/${cup.id}`);
  assert.deepEqual([r.data.cup.title, r.data.cup.description, r.data.cup.cover, r.data.items.length], ['새 제목', '', null, 8]);

  // ---- 신고 3건 → 숨김 (작성자·관리자에게는 보임) ----
  assert.equal((await call('POST', '/report', { token: B, body: { kind: 'cup', id: 'nope' } })).data.reason, 'id');
  assert.equal((await call('POST', '/report', { token: B, body: { kind: 'cup', id: '0'.repeat(24) } })).status, 404);
  for (const t of [B, B, carol.token]) assert.equal((await call('POST', '/report', { token: t, body: { kind: 'cup', id: cup.id } })).data.ok, true);
  assert.equal((await call('GET', `/cups/${cup.id}`)).data.cup.hidden, false); // 같은 사람의 신고는 한 번
  await call('POST', '/report', { token: admin.token, body: { kind: 'cup', id: cup.id } });
  assert.equal((await call('GET', `/cups/${cup.id}`)).status, 404);
  assert.equal((await call('GET', `/cups/${cup.id}/comments`)).status, 404);
  assert.equal((await play({ ...eight, voter })).status, 404);
  assert.ok(!(await call('GET', '/cups')).data.cups.some(c => c.id === cup.id));
  assert.equal((await call('GET', `/cups/${cup.id}`, { token: A })).data.cup.hidden, true);
  assert.ok((await call('GET', '/cups', { token: A })).data.cups.some(c => c.id === cup.id && c.hidden));
  assert.ok((await call('GET', '/cups', { token: admin.token })).data.cups.some(c => c.id === cup.id));

  // ---- 지우기: 항목·좋아요·댓글이 같이 지워지고 이미지는 남는다 ----
  assert.equal((await call('DELETE', `/cups/${fast0}`, { token: A })).status, 403);
  await call('POST', `/cups/${fast0}/comments`, { token: A, body: { body: '지워질 댓글' } });
  assert.equal((await call('DELETE', `/cups/${fast0}`, { token: B })).data.ok, true);
  assert.equal((await call('GET', `/cups/${fast0}`)).status, 404);
  assert.equal((await call('DELETE', `/cups/${cup.id}`, { token: A })).data.ok, true);
  for (const id of [fast0, cup.id]) {
    assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM cup_items WHERE cup_id = ?').get(id).n, 0);
    assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM cup_likes WHERE cup_id = ?').get(id).n, 0);
    assert.equal(DB.raw.prepare('SELECT COUNT(*) n FROM comments WHERE target = ?').get(`cup:${id}`).n, 0);
    assert.equal(DB.raw.prepare(`SELECT COUNT(*) n FROM reports WHERE kind = 'cup' AND target_id = ?`).get(id).n, 0);
  }
  assert.equal((await send('GET', `/img/${pngId}`)).status, 200);

  // ---- 쪽 나누기: 25개를 더 만들어 20 + 나머지 ----
  for (let i = 0; i < 25; i++) {
    DB.raw.prepare(`INSERT INTO cups (id, user_id, title, item_count, likes, plays, created) VALUES (?, ?, 'x', 4, ?, ?, ?)`)
      .run(i.toString(16).padStart(24, 'f'), carol.user.id, i % 3, i % 5, 1000 + (i % 7));
  }
  const total = (await call('GET', '/cups')).data.cups.length; // 남은 빠른 1·2 포함
  assert.equal(total, 20);
  for (const sort of ['new', 'top']) {
    const page1 = (await call('GET', `/cups?sort=${sort}`)).data;
    assert.equal(page1.cups.length, 20);
    const page2 = (await call('GET', `/cups?sort=${sort}&cursor=${encodeURIComponent(page1.next)}`)).data;
    assert.equal(page2.cups.length, 7);
    assert.equal(page2.next, null);
    const all = [...page1.cups, ...page2.cups];
    assert.equal(new Set(all.map(c => c.id)).size, 27);
    const keyOf = c => (sort === 'new' ? [c.created] : [c.likes, c.plays, c.created]);
    for (let i = 1; i < all.length; i++) {
      const [a, b] = [keyOf(all[i - 1]), keyOf(all[i])];
      const cmp = a.findIndex((v, j) => v !== b[j]);
      assert.ok(cmp === -1 || a[cmp] > b[cmp], `${sort} 정렬 ${i}`);
    }
  }
});
