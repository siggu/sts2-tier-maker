import keys from '../../site/data/keys.json';
import { makeValidator, VOTE_VALUES } from './votes.js';
import { corsHeaders, json, sha256 } from './http.js';
import { getUser } from './auth.js';
import { handleAccount } from './account.js';
import { handlePlay } from './play.js';
import { handleCups } from './cups.js';
import { handleAdmin } from './admin.js';

const MAX_VOTERS_PER_IP_ITEM = 3; // 같은 IP 에서 한 아이템에 표를 무한히 늘리지 못하게
const RATE_PER_MINUTE = 30;
const RESULTS_TTL = 30;

const { validKeys, categories, validateBody } = makeValidator(keys);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (await overFrontLimit(request, env, url)) return json({ error: 'rate_limited' }, 429, { ...cors, 'Retry-After': '60' });
      if (url.pathname === '/health') return json({ ok: true, items: validKeys.size }, 200, cors);
      if (url.pathname === '/balance' && request.method === 'POST') return await postVotes(request, env, ctx, cors);
      if (url.pathname === '/balance' && request.method === 'GET') return await getResults(url, env, ctx, cors);
      // 로그인·동기화·갤러리·댓글 (account.js), 모두의 티어표·A vs B (play.js), 사용자 월드컵 (cups.js),
      // 이미지 검토 (admin.js). 처리하지 않으면 null.
      const res = (await handleAccount(request, env, ctx, { url, cors, keys: validKeys }))
        ?? (await handlePlay(request, env, ctx, { url, cors, keys: validKeys }))
        ?? (await handleCups(request, env, ctx, { url, cors, keys: validKeys }))
        ?? (await handleAdmin(request, env, ctx, { url, cors }));
      if (res) return res;
      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      console.error(err);
      return json({ error: 'internal' }, 500, cors);
    }
  },
};

// 맨 앞 IP 당 요청 수 제한: Cloudflare 요청 제한 바인딩(wrangler.toml [[ratelimits]]) — D1 을 쓰지 않으므로
// 마구 보내는 요청이 D1 쓰기 한도를 먹지 못한다. 기능별 세부 제한(rateLimited)은 이 뒤에 따로 있다.
// 이미지(/img/)는 한 화면에 여러 장이라 따로 넉넉하게 센다. 바인딩이 없으면(시험) 건너뛴다.
async function overFrontLimit(request, env, url) {
  if (url.pathname === '/health') return false;
  const limiter = url.pathname.startsWith('/img/') ? env.IMG_LIMITER : env.API_LIMITER;
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    return !success;
  } catch (err) {
    console.warn('limiter', err?.message || err);
    return false;
  }
}

async function postVotes(request, env, ctx, cors) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_request', reason: 'json' }, 400, cors); }
  // 로그인 상태면 계정 표('u_' + id)로 낸다. body.voter 는 없어도 되고 IP 당 voter 수 제한도 건너뛴다.
  const user = await getUser(request, env);
  const reason = validateBody(body, { voterOptional: Boolean(user) });
  // 세션이 만료됐는데 voter 없이 보냈다면 다시 로그인하라고 알린다
  if (reason === 'voter' && request.headers.has('Authorization')) return json({ error: 'auth' }, 401, cors);
  if (reason) return json({ error: 'bad_request', reason }, 400, cors);
  const voter = user ? `u_${user.id}` : body.voter;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256(`${env.IP_SALT || 'sts2-balance'}:${ip}`);
  const now = Date.now();
  const minute = Math.floor(now / 60000);

  const rl = await env.DB.prepare(
    `INSERT INTO rate_limit (ip_hash, minute, n) VALUES (?1, ?2, 1)
     ON CONFLICT (ip_hash, minute) DO UPDATE SET n = n + 1 RETURNING n`
  ).bind(ipHash, minute).first();
  if (rl && rl.n > RATE_PER_MINUTE) return json({ error: 'rate_limited' }, 429, cors);

  // 같은 아이템에 대한 마지막 표만 남긴다
  const latest = new Map();
  for (const vote of body.votes) latest.set(vote.item, vote.v);

  // 이 IP 에서 다른 voter 로 이미 표를 낸 수 (계정 표는 계정당 하나라 세지 않는다)
  const items = user ? [] : [...latest.keys()];
  const crowded = new Set();
  for (let i = 0; i < items.length; i += 90) {
    const chunk = items.slice(i, i + 90);
    const placeholders = chunk.map((_, j) => `?${j + 3}`).join(',');
    const { results } = await env.DB.prepare(
      `SELECT item, COUNT(*) AS n FROM balance_votes
       WHERE ip_hash = ?1 AND voter != ?2 AND item IN (${placeholders}) GROUP BY item`
    ).bind(ipHash, voter, ...chunk).all();
    for (const r of results) if (r.n >= MAX_VOTERS_PER_IP_ITEM) crowded.add(r.item);
  }

  const upsert = env.DB.prepare(
    `INSERT INTO balance_votes (item, voter, ip_hash, v, ts) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (item, voter) DO UPDATE SET v = excluded.v, ip_hash = excluded.ip_hash, ts = excluded.ts`
  );
  const del = env.DB.prepare('DELETE FROM balance_votes WHERE item = ?1 AND voter = ?2');
  const stmts = [];
  let skipped = 0;
  for (const [item, v] of latest) {
    if (v === null) stmts.push(del.bind(item, voter));
    else if (crowded.has(item)) skipped++;
    else stmts.push(upsert.bind(item, voter, ipHash, VOTE_VALUES[v], now));
  }
  if (stmts.length) await env.DB.batch(stmts);

  if (Math.random() < 0.02) {
    ctx.waitUntil(env.DB.prepare('DELETE FROM rate_limit WHERE minute < ?1').bind(minute - 10).run());
  }
  return json({ ok: true, saved: stmts.length, skipped }, 200, cors);
}

// GET /balance?category=cards  →  { items: { 'cards/Bash': [너프, 적당, 버프], ... } }
async function getResults(url, env, ctx, cors) {
  const category = url.searchParams.get('category');
  if (!categories.has(category)) return json({ error: 'bad_request', reason: 'category' }, 400, cors);

  const cache = caches.default;
  const cacheKey = new Request(`https://cache.sts2-balance/balance?category=${category}`);
  const hit = await cache.match(cacheKey);
  if (hit) {
    const res = new Response(hit.body, hit);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }

  const { results } = await env.DB.prepare(
    `SELECT item, v, COUNT(*) AS n FROM balance_votes
     WHERE item >= ?1 AND item < ?2 GROUP BY item, v`
  ).bind(`${category}/`, `${category}0`).all(); // '0' 은 '/' 다음 문자
  const items = {};
  for (const { item, v, n } of results) {
    (items[item] ||= [0, 0, 0])[v - 1] = n;
  }

  const res = json({ category, updatedAt: Date.now(), items }, 200, { 'Cache-Control': `public, max-age=${RESULTS_TTL}` });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}
