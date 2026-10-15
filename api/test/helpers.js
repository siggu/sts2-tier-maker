// 테스트 도우미: 시험용 RSA 키로 구글 ID 토큰 흉내 내기, node:sqlite 로 만든 작은 D1 대역.
import { readFileSync, readdirSync } from 'node:fs';
import { bytesToB64url } from '../src/auth.js';
import { bracketPlan } from '../src/bracket.js';

const RS256 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };

// → { kid, jwks: { keys: [공개 JWK] }, sign(payload, headerExtra?) → JWT }
export async function makeTestKey(kid = 'test-key-1') {
  const pair = await crypto.subtle.generateKey(
    { ...RS256, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['sign', 'verify']);
  const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const enc = obj => bytesToB64url(new TextEncoder().encode(JSON.stringify(obj)));
  return {
    kid,
    jwks: { keys: [{ kty: 'RSA', n: pub.n, e: pub.e, kid, alg: 'RS256', use: 'sig' }] },
    async sign(payload, header = {}) {
      const head = `${enc({ alg: 'RS256', typ: 'JWT', kid, ...header })}.${enc(payload)}`;
      const sig = await crypto.subtle.sign(RS256, pair.privateKey, new TextEncoder().encode(head));
      return `${head}.${bytesToB64url(new Uint8Array(sig))}`;
    },
  };
}

export function googlePayload(clientId, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { iss: 'https://accounts.google.com', aud: clientId, sub: '1000001', name: 'Test User', picture: 'https://example.com/a.png', iat: now, exp: now + 3600, ...extra };
}

// migrations 폴더의 모든 마이그레이션 (0001_… 순서대로)
export const ALL_MIGRATIONS = readdirSync(new URL('../migrations/', import.meta.url)).filter(f => f.endsWith('.sql')).sort();

// D1 의 prepare/bind/first/all/run/batch 만 흉내 낸다. node:sqlite 가 없으면 null.
// migrations 를 주지 않으면 모두 적용한다.
export async function makeD1(migrations = ALL_MIGRATIONS) {
  let DatabaseSync;
  try { ({ DatabaseSync } = await import('node:sqlite')); } catch { return null; }
  const db = new DatabaseSync(':memory:');
  for (const file of migrations) db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));

  const plain = row => (row ? { ...row } : null);
  const exec = (sql, params) => {
    const stmt = db.prepare(sql);
    if (/\bRETURNING\b/i.test(sql) || /^\s*(SELECT|WITH)\b/i.test(sql)) return { results: stmt.all(...params).map(plain), meta: {} };
    const r = stmt.run(...params);
    return { results: [], meta: { changes: Number(r.changes) } };
  };
  const statement = (sql, params = []) => ({
    sql, params,
    bind: (...p) => statement(sql, p),
    first: async col => { const row = exec(sql, params).results[0] ?? null; return row && col ? row[col] : row; },
    all: async () => ({ success: true, ...exec(sql, params) }),
    run: async () => ({ success: true, ...exec(sql, params) }),
  });
  return {
    raw: db,
    prepare: sql => statement(sql),
    async batch(stmts) {
      db.exec('BEGIN');
      try {
        const out = stmts.map(s => ({ success: true, ...exec(s.sql, s.params) }));
        db.exec('COMMIT');
        return out;
      } catch (err) { db.exec('ROLLBACK'); throw err; }
    },
  };
}

// 한 판을 규칙대로 치른다: 예선 (0,1), (2,3)… → 본선 [예선 승자…, 부전승…] 을 둘씩. pick(a, b) = 이긴 쪽.
// (본선 짝은 서버가 따지지 않으므로 화면과 다른 배치여도 된다)
export function playBracket(entrants, pick = a => a) {
  const { prelims } = bracketPlan(entrants.length);
  const matches = [];
  const duel = (a, b) => { const w = pick(a, b); matches.push([w, w === a ? b : a]); return w; };
  let round = [];
  for (let j = 0; j < prelims; j++) round.push(duel(entrants[2 * j], entrants[2 * j + 1]));
  round.push(...entrants.slice(2 * prelims));
  while (round.length > 1) {
    const next = [];
    for (let i = 0; i < round.length; i += 2) next.push(duel(round[i], round[i + 1]));
    round = next;
  }
  return { champion: round[0], entrants, matches };
}
