// 구글 로그인(ID 토큰 검증)과 세션.
// getUser(request, env) → { id, name, avatar, admin } | null   (Authorization: Bearer <세션 토큰>)
import { sha256 } from './http.js';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
const MAX_JWT_LENGTH = 4096;
const IAT_SKEW_SEC = 300; // 시계가 조금 어긋나도 받되, 먼 미래에 발급된 토큰은 거른다
export const SESSION_MS = 30 * 24 * 3600 * 1000;

export function b64urlToBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, ch => ch.charCodeAt(0));
}

export function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomHex(n) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
}

function importRsaKey(jwk) {
  // use/key_ops 같은 부가 필드는 넘기지 않는다 (런타임마다 검사가 달라 실패할 수 있음)
  return crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, RS256, false, ['verify']);
}

// JWKS({ keys: [...] }) 를 읽어 kid → 공개 키 를 돌려주는 함수를 만든다.
// load() → { jwks, maxAge(초) }. 캐시가 만료됐거나 모르는 kid 가 오면 다시 읽되,
// 엉터리 kid 로 구글을 두드리지 못하게 다시 읽기는 minRefreshMs 에 한 번까지만.
export function makeKeyResolver(load, { minRefreshMs = 60_000 } = {}) {
  let keys = new Map();
  let expires = 0;
  let lastFetch = -Infinity;
  let pending = null;

  async function refresh() {
    lastFetch = Date.now();
    const { jwks, maxAge } = await load();
    const next = new Map();
    for (const k of jwks?.keys || []) {
      if (k && k.kty === 'RSA' && typeof k.kid === 'string' && k.n && k.e) next.set(k.kid, await importRsaKey(k));
    }
    keys = next;
    expires = Date.now() + maxAge * 1000;
  }

  return async function getKey(kid) {
    const now = Date.now();
    if (now >= expires || (!keys.has(kid) && now - lastFetch >= minRefreshMs)) {
      pending ||= refresh().finally(() => { pending = null; });
      try { await pending; } catch (err) { if (!keys.size) throw err; } // 다시 읽기 실패: 예전 키로 버틴다
    }
    return keys.get(kid) || null;
  };
}

async function loadGoogleJwks() {
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error(`google jwks ${res.status}`);
  const m = /max-age=(\d+)/.exec(res.headers.get('Cache-Control') || '');
  const maxAge = Math.min(Math.max(m ? Number(m[1]) : 3600, 60), 86400);
  return { jwks: await res.json(), maxAge };
}

// isolate 안에서 재사용된다 (요청마다 구글에 묻지 않게)
const googleKeys = makeKeyResolver(loadGoogleJwks);
let testKeys = null;

// 로컬 시험용: TEST_JWKS(JWKS JSON 문자열)가 있고 요청 주소가 localhost 일 때만 그 키를 쓴다.
// 배포된 Worker 는 localhost 로 불릴 수 없으므로 TEST_JWKS 가 잘못 설정돼도 구글 키만 쓴다.
export function keyResolverFor(env, url) {
  const local = url && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (!env.TEST_JWKS || !local) return googleKeys;
  if (testKeys?.source !== env.TEST_JWKS) {
    const jwks = JSON.parse(env.TEST_JWKS);
    testKeys = { source: env.TEST_JWKS, getKey: makeKeyResolver(async () => ({ jwks, maxAge: 86400 })) };
  }
  return testKeys.getKey;
}

function parseJsonPart(part) {
  try {
    const v = JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

// 구글 ID 토큰(JWT) 검증. → { ok: true, payload } | { ok: false, reason }
// reason: config | format | alg | kid | signature | iss | aud | exp | iat | sub
export async function verifyGoogleIdToken(token, { clientId, getKey, now = Date.now() }) {
  if (!clientId) return { ok: false, reason: 'config' };
  if (typeof token !== 'string' || token.length > MAX_JWT_LENGTH) return { ok: false, reason: 'format' };
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return { ok: false, reason: 'format' };

  const header = parseJsonPart(parts[0]);
  if (!header) return { ok: false, reason: 'format' };
  // alg 를 꼭 RS256 으로 고정한다 ('none'·HS256 바꿔치기 막기)
  if (header.alg !== 'RS256') return { ok: false, reason: 'alg' };
  if (typeof header.kid !== 'string') return { ok: false, reason: 'kid' };
  const key = await getKey(header.kid);
  if (!key) return { ok: false, reason: 'kid' };

  let sig;
  try { sig = b64urlToBytes(parts[2]); } catch { return { ok: false, reason: 'format' }; }
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!(await crypto.subtle.verify(RS256, key, sig, data))) return { ok: false, reason: 'signature' };

  const payload = parseJsonPart(parts[1]);
  if (!payload) return { ok: false, reason: 'format' };
  if (!GOOGLE_ISSUERS.has(payload.iss)) return { ok: false, reason: 'iss' };
  if (payload.aud !== clientId) return { ok: false, reason: 'aud' };
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return { ok: false, reason: 'exp' };
  if (payload.iat !== undefined && (typeof payload.iat !== 'number' || payload.iat > now / 1000 + IAT_SKEW_SEC)) return { ok: false, reason: 'iat' };
  if (typeof payload.sub !== 'string' || !/^[0-9A-Za-z_-]{1,255}$/.test(payload.sub)) return { ok: false, reason: 'sub' };
  return { ok: true, payload };
}

const listOf = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

// 관리자: 구글 sub 이 ADMIN_SUBS 에 있거나, 사용자 id(users.id)가 ADMIN_USERS 에 있으면
export function isAdmin(env, googleSub, userId = null) {
  return listOf(env.ADMIN_SUBS).includes(googleSub) || (userId !== null && listOf(env.ADMIN_USERS).includes(userId));
}

// 프로필 사진: 'face:<캐릭터>' (기본 얼굴) | 'img:<32hex>' (올린 사진).
// 고르지 않았으면(NULL) 사용자 id 로 정한 얼굴 하나. site/js/community.js 의 avatarRef 와 같은 계산.
export const FACES = ['ironclad', 'silent', 'regent', 'necrobinder', 'defect'];
export const IMG_AVATAR = /^img:[0-9a-f]{32}$/;

export function isFace(value) {
  return typeof value === 'string' && value.startsWith('face:') && FACES.includes(value.slice(5));
}

export function avatarOf(value, userId) {
  if (isFace(value) || (typeof value === 'string' && IMG_AVATAR.test(value))) return value;
  let n = 0;
  for (const ch of String(userId)) n = (n * 31 + ch.charCodeAt(0)) % 9973;
  return `face:${FACES[n % FACES.length]}`;
}

// users 행 → 밖으로 내보내는 user
export function publicUser(row, env) {
  return { id: row.id, name: row.name, avatar: avatarOf(row.avatar, row.id), admin: isAdmin(env, row.google_sub, row.id) };
}

export function bearerToken(request) {
  const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') || '');
  return m ? m[1] : null;
}

// 세션 토큰 = 무작위 32바이트(base64url). DB 에는 해시만.
export async function createSession(env, userId, now = Date.now()) {
  const token = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?1, ?2, ?3, ?4)')
    .bind(await sha256(token), userId, now, now + SESSION_MS).run();
  return token;
}

export async function deleteSession(env, token) {
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256(token)).run();
}

// 한 요청 안에서 여러 번 불려도 DB 는 한 번만 본다.
const memo = new WeakMap();

export function getUser(request, env) {
  if (!memo.has(request)) memo.set(request, lookupUser(request, env));
  return memo.get(request);
}

async function lookupUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.google_sub, u.name, u.avatar FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires > ?2`
  ).bind(await sha256(token), Date.now()).first();
  return row ? publicUser(row, env) : null;
}
