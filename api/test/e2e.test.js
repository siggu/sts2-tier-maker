// 실제 Worker 를 `wrangler dev --local` 로 띄워 보는 시험. 느려서 RUN_E2E=1 일 때만 돈다.
//   RUN_E2E=1 node --test test/e2e.test.js
// 임시 폴더에 D1 을 만들고(--persist-to), 시험용 GOOGLE_CLIENT_ID·TEST_JWKS 를 --env-file 로 넣는다.
// TEST_JWKS 는 localhost 로 온 요청에서만 쓰이므로 배포된 Worker 의 검증은 약해지지 않는다.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { makeTestKey, googlePayload } from './helpers.js';

const RUN = process.env.RUN_E2E === '1';
const API_DIR = new URL('..', import.meta.url).pathname;
const CLIENT_ID = 'e2e-client.apps.googleusercontent.com';
const ORIGIN = 'http://localhost:8000';

let dir, proc, key, PORT, BASE;

// 다른 dev 서버와 겹치지 않게 비어 있는 포트를 받는다
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer().once('error', reject).listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

before(async () => {
  if (!RUN) return;
  key = await makeTestKey('e2e');
  PORT = await freePort();
  BASE = `http://localhost:${PORT}`;
  dir = mkdtempSync(join(tmpdir(), 'sts2-e2e-'));
  const envFile = join(dir, 'test.env');
  writeFileSync(envFile, `GOOGLE_CLIENT_ID=${CLIENT_ID}\nADMIN_SUBS=e2e-admin\nTEST_JWKS='${JSON.stringify(key.jwks)}'\n`);
  const persist = join(dir, 'state');
  execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'sts2-balance', '--local', '--persist-to', persist], { cwd: API_DIR, stdio: 'ignore', env: { ...process.env, CI: '1' } });
  proc = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(PORT), '--persist-to', persist, '--env-file', envFile, '--show-interactive-dev-session=false'],
    { cwd: API_DIR, stdio: 'ignore', detached: true });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch { /* 아직 안 떴다 */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('wrangler dev 가 뜨지 않았다');
});

after(() => {
  if (proc) try { process.kill(-proc.pid); } catch { /* 이미 끝남 */ }
  if (dir) rmSync(dir, { recursive: true, force: true });
});

async function call(method, path, { body, token, ip = '10.1.0.1' } = {}) {
  const headers = { Origin: ORIGIN, 'CF-Connecting-IP': ip };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN, `${method} ${path} CORS`);
  return { status: res.status, data: await res.json() };
}

test('Worker 전체 흐름', { skip: !RUN && 'RUN_E2E=1 일 때만' }, async () => {
  // CORS 사전 요청에 Authorization 이 허용되는지
  const pre = await fetch(`${BASE}/me`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'authorization, content-type' } });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  assert.match(pre.headers.get('Access-Control-Allow-Methods'), /PATCH/);

  // 익명으로 낸 표 → 로그인하면서 계정으로 옮기기
  const anon = '0123456789abcdef0123456789abcdef';
  let r;
  r = await call('POST', '/balance', { body: { voter: anon, votes: [{ item: 'cards/abrasive', v: 'nerf' }] } });
  assert.equal(r.data.saved, 1, JSON.stringify(r.data));
  assert.equal((await call('POST', '/balance', { body: { voter: 'u_spoofspoofspoof', votes: [{ item: 'cards/abrasive', v: 'nerf' }] } })).data.reason, 'voter');
  r = await call('POST', '/auth/google', { body: { credential: await key.sign(googlePayload(CLIENT_ID, { sub: 'e2e-user', name: 'E2E 사용자' })), voter: anon } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const { token, user } = r.data;
  r = await call('GET', '/me', { token });
  assert.deepEqual(r.data.votes, { 'cards/abrasive': 'nerf' });

  // 로그인 상태의 /balance: voter 없이, 계정 표로
  r = await call('POST', '/balance', { token, body: { votes: [{ item: 'cards/abrasive', v: 'buff' }, { item: 'relics/akabeko', v: 'fair' }] } });
  assert.deepEqual(r.data, { ok: true, saved: 2, skipped: 0 });
  assert.deepEqual((await call('GET', '/me', { token })).data.votes, { 'cards/abrasive': 'buff', 'relics/akabeko': 'fair' });
  // 만료·잘못된 세션으로 voter 없이 내면 401
  assert.equal((await call('POST', '/balance', { token: 'x'.repeat(43), body: { votes: [{ item: 'cards/abrasive', v: 'buff' }] } })).status, 401);

  // 이름, 티어표
  assert.equal((await call('PATCH', '/me', { token, body: { name: '새 이름' } })).data.user.name, '새 이름');
  const state = { title: 'E2E', tiers: [{ label: 'S', color: '#e5484d', items: ['abrasive'] }], updatedAt: 0 };
  assert.equal((await call('PUT', '/me/tiers/relics.rarity-ancient.source-Neow', { token, body: { state } })).data.ok, true);
  assert.ok((await call('GET', '/me', { token })).data.tiers['relics.rarity-ancient.source-Neow']);

  // 갤러리 + 댓글
  const post = (await call('POST', '/gallery', { token, body: { template: 'cards', title: 'E2E 글', state } })).data.post;
  assert.equal((await call('GET', '/gallery?template=cards')).data.posts[0].id, post.id);
  assert.equal((await call('POST', `/gallery/${post.id}/react`, { token, body: { v: 1 } })).data.likes, 1);
  const pc = (await call('POST', `/gallery/${post.id}/comments`, { token, body: { body: '글 댓글' } })).data.comment;
  assert.equal(pc.vote, null);
  const ic = (await call('POST', '/items/cards/abrasive/comments', { token, body: { body: '항목 댓글' } })).data.comment;
  assert.equal(ic.vote, 'buff');
  assert.equal((await call('GET', '/items/cards/abrasive/comments')).data.comments[0].vote, 'buff');

  // 다른 사람 셋이 신고하면 숨김, 관리자는 지울 수 있다
  const others = [];
  for (const sub of ['e2e-a', 'e2e-b', 'e2e-admin']) {
    others.push((await call('POST', '/auth/google', { ip: `10.2.0.${others.length}`, body: { credential: await key.sign(googlePayload(CLIENT_ID, { sub, name: sub })) } })).data);
  }
  assert.equal((await call('POST', `/comments/${ic.id}/like`, { token: others[0].token, body: { on: true } })).data.likes, 1);
  for (const o of others) await call('POST', '/report', { token: o.token, body: { kind: 'post', id: post.id } });
  assert.equal((await call('GET', `/gallery/${post.id}`)).status, 404);
  assert.equal((await call('GET', `/gallery/${post.id}`, { token })).data.post.hidden, true);
  assert.equal(others[2].user.admin, true);
  assert.equal((await call('DELETE', `/gallery/${post.id}`, { token: others[0].token })).status, 404); // 숨겨져서 안 보인다
  assert.equal((await call('DELETE', `/comments/${ic.id}`, { token: others[0].token })).status, 403);
  assert.equal((await call('DELETE', `/comments/${ic.id}`, { token: others[2].token })).data.ok, true);
  assert.equal((await call('DELETE', `/gallery/${post.id}`, { token: others[2].token })).data.ok, true);
  assert.equal((await call('GET', `/gallery?author=${user.id}`)).data.posts.length, 0);

  assert.deepEqual((await call('POST', '/auth/logout', { token })).data, { ok: true });
  assert.equal((await call('GET', '/me', { token })).status, 401);
});
