// 모두의 티어표(집계)·A vs B 대결·월드컵(토너먼트).
// 처리하는 경로면 Response, 아니면 null 을 돌려준다.
import { json, ipHashOf, rateLimited, readJson } from './http.js';
import { getUser } from './auth.js';
import { isAnonVoter } from './votes.js';

const AGGREGATE_TTL = 60;
const RANKING_TTL = 30;
const AGGREGATE_MAX_LISTS = 5000; // 최신 티어표 몇 개까지만 훑는다 (요청 비용 상한)
const VERSUS_RATE_PER_MINUTE = 60;
const TOURNAMENT_RATE_PER_MINUTE = 6;
export const BRACKET_SIZES = [4, 8, 16, 32, 64];
export const ELO_START = 1500;
export const ELO_K = 24;

// 형식만 본다. 고대 유물 묶음 id 에 'source-Neow' 처럼 대문자가 들어가므로 첫 글자 뒤로는 대문자도 받는다.
const TEMPLATE_RE = /^[a-z0-9][A-Za-z0-9.-]{0,79}$/;

export async function handlePlay(request, env, ctx, { url, cors, keys }) {
  const path = url.pathname;
  if (path !== '/tiers/aggregate' && path !== '/versus' && path !== '/versus/ranking' && path !== '/versus/tournament') return null;
  const method = path === '/versus' || path === '/versus/tournament' ? 'POST' : 'GET';
  if (request.method !== method) return json({ error: 'method' }, 405, { ...cors, Allow: method });

  if (path === '/tiers/aggregate') return getAggregate(url, env, ctx, cors, keys);
  if (path === '/versus') return postVersus(request, env, ctx, cors, keys);
  if (path === '/versus/tournament') return postTournament(request, env, ctx, cors, keys);
  return getRanking(url, env, ctx, cors, keys);
}

// ---- 순수 도우미 (테스트용으로 내보낸다) ----

const categoryCache = new WeakMap();
export function categoriesOf(keys) {
  let set = categoryCache.get(keys);
  if (!set) {
    set = new Set([...keys].map(k => k.split('/')[0]));
    categoryCache.set(keys, set);
  }
  return set;
}

// 묶음 id 가 맞으면 그 카테고리, 아니면 null.
export function templateCategory(template, keys) {
  if (typeof template !== 'string' || !TEMPLATE_RE.test(template)) return null;
  const category = template.split('.')[0];
  return categoriesOf(keys).has(category) ? category : null;
}

// k 줄짜리 티어표에서 i 번째 줄(0부터)의 점수. 맨 위 1, 맨 아래 0.
export function tierScore(i, k) {
  return k <= 1 ? 1 : 1 - i / (k - 1);
}

// SQL 이 하는 집계를 JS 로 똑같이 한 것 (테스트에서 SQL 결과와 맞춰 본다).
// 한 티어표에 같은 아이템이 두 번 있으면 위쪽 줄 하나만 센다.
export function aggregateStates(states) {
  const sums = new Map();
  for (const state of states) {
    const tiers = state?.tiers;
    if (!Array.isArray(tiers)) continue;
    const best = new Map();
    tiers.forEach((tier, i) => {
      if (!tier || typeof tier !== 'object' || !Array.isArray(tier.items)) return;
      const s = tierScore(i, tiers.length);
      for (const item of tier.items) {
        if (typeof item === 'string' && !(best.get(item) >= s)) best.set(item, s);
      }
    });
    for (const [item, s] of best) {
      const r = sums.get(item) || { item, total: 0, n: 0 };
      r.total += s;
      r.n += 1;
      sums.set(item, r);
    }
  }
  return [...sums.values()];
}

// rows: [{ item, total, n }] → { 아이템id: { score, n } } (지금 없는 아이템은 뺀다)
export function finalizeAggregate(rows, category, keys) {
  const items = {};
  for (const { item, total, n } of rows) {
    if (!n || !keys.has(`${category}/${item}`)) continue;
    items[item] = { score: Math.round((total / n) * 10000) / 10000, n };
  }
  return items;
}

// body: { category, winner, loser, voter? }. 틀리면 이유, 맞으면 null.
// 로그인했으면 voter 는 보지 않는다. 익명 voter 는 /balance 와 같은 형식 ('u_' 로 시작하면 안 됨).
export function validateVersus(body, keys, loggedIn = false) {
  if (!body || typeof body !== 'object') return 'body';
  const { category, winner, loser, voter } = body;
  if (typeof category !== 'string' || !categoriesOf(keys).has(category)) return 'category';
  if (typeof winner !== 'string' || typeof loser !== 'string'
    || !keys.has(`${category}/${winner}`) || !keys.has(`${category}/${loser}`)) return 'item';
  if (winner === loser) return 'same';
  if (!loggedIn && !isAnonVoter(voter)) return 'voter';
  return null;
}

// body: { category, champion, entrants: [아이템id...], voter? }. 틀리면 이유, 맞으면 null.
// entrants 는 4·8·16·32·64개, 서로 다른 그 카테고리의 아이템. champion 은 그중 하나.
export function validateTournament(body, keys, loggedIn = false) {
  if (!body || typeof body !== 'object') return 'body';
  const { category, champion, entrants, voter } = body;
  if (typeof category !== 'string' || !categoriesOf(keys).has(category)) return 'category';
  if (!Array.isArray(entrants) || !BRACKET_SIZES.includes(entrants.length)) return 'entrants';
  if (!entrants.every(id => typeof id === 'string' && keys.has(`${category}/${id}`))) return 'item';
  if (new Set(entrants).size !== entrants.length) return 'duplicate';
  if (typeof champion !== 'string' || !entrants.includes(champion)) return 'champion';
  if (!loggedIn && !isAnonVoter(voter)) return 'voter';
  return null;
}

// 쌍은 a < b 로 정렬해 저장한다.
export function normalizePair(x, y) {
  return x < y ? [x, y] : [y, x];
}

// 이긴 쪽이 얻는(진 쪽이 잃는) 점수.
export function eloDelta(winnerRating, loserRating, k = ELO_K) {
  const expected = 1 / (1 + 10 ** ((loserRating - winnerRating) / 400));
  return k * (1 - expected);
}

const round1 = r => Math.round(r * 10) / 10;

// ---- 모두의 티어표 ----

// 같은 사람은 한 표: 동기화본이 있으면 그것, 없으면 숨김이 아닌 최신 글.
// 읽는 행 수를 묶기 위해 동기화본은 최신 5000개, 글은 최신 10000개만 색인 순서로 가져온다
// (user_tiers (template, updated_at) 색인은 0003, posts 는 0004 의 posts_kind_template_created).
// 갤러리 글 중 티어표(kind = 'tier')만 센다 — 밸런스 투표 글 등은 state 모양이 다르다.
// 점수 계산까지 SQL(json_each) 에서 끝내서 큰 state 를 Worker 로 옮기거나 파싱하지 않는다.
// json_each/json_type 은 깨진 JSON 에서 오류를 낸다. WHERE 의 AND 는 SQLite 가 순서를 바꿔 평가하므로
// (json_valid 보다 json_type 이 먼저 돌 수 있다) 반드시 CASE 로 순서를 강제한다.
const AGGREGATE_SQL = `
WITH synced AS (
  SELECT user_id, state, updated_at AS t FROM user_tiers WHERE template = ?1
  ORDER BY updated_at DESC LIMIT ${AGGREGATE_MAX_LISTS}
),
recent_posts AS (
  SELECT user_id, state, created AS t FROM posts WHERE kind = 'tier' AND template = ?1 AND hidden = 0
  ORDER BY created DESC LIMIT ${AGGREGATE_MAX_LISTS * 2}
),
posted AS (
  SELECT user_id, state, t, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY t DESC) AS rn FROM recent_posts
),
lists AS MATERIALIZED (
  SELECT user_id, state FROM (
    SELECT user_id, state, t FROM synced
    UNION ALL
    SELECT p.user_id, p.state, p.t FROM posted p
    WHERE p.rn = 1 AND NOT EXISTS (SELECT 1 FROM user_tiers s WHERE s.user_id = p.user_id AND s.template = ?1)
  )
  WHERE CASE WHEN json_valid(state) THEN json_type(state, '$.tiers') = 'array' ELSE 0 END
  ORDER BY t DESC LIMIT ${AGGREGATE_MAX_LISTS}
),
placed AS (
  SELECT l.user_id, it.value AS item,
         MAX(CASE WHEN json_array_length(l.state, '$.tiers') <= 1 THEN 1.0
                  ELSE 1.0 - CAST(t.key AS REAL) / (json_array_length(l.state, '$.tiers') - 1) END) AS score
  FROM lists l
  JOIN json_each(l.state, '$.tiers') t
  JOIN json_each(CASE WHEN t.type != 'object' THEN '{}'
                      WHEN json_type(t.value, '$.items') = 'array' THEN t.value ELSE '{}' END, '$.items') it
  WHERE it.type = 'text'
  GROUP BY l.user_id, it.value
)
SELECT NULL AS item, 0 AS total, COUNT(*) AS n FROM lists
UNION ALL
SELECT item, SUM(score) AS total, COUNT(*) AS n FROM placed GROUP BY item`;

async function getAggregate(url, env, ctx, cors, keys) {
  const template = url.searchParams.get('template');
  const category = templateCategory(template, keys);
  if (!category) return json({ error: 'bad_request', reason: 'template' }, 400, cors);

  return cached(`tiers/aggregate?template=${encodeURIComponent(template)}`, AGGREGATE_TTL, ctx, cors, async () => {
    const { results } = await env.DB.prepare(AGGREGATE_SQL).bind(template).all();
    const count = results.find(r => r.item === null)?.n || 0;
    const items = finalizeAggregate(results.filter(r => r.item !== null), category, keys);
    return { template, count, items };
  });
}

// ---- A vs B 대결 ----

async function postVersus(request, env, ctx, cors, keys) {
  const body = await readJson(request);
  if (body === undefined) return json({ error: 'bad_request', reason: 'json' }, 400, cors);
  const user = await getUser(request, env);
  const reason = validateVersus(body, keys, Boolean(user));
  if (reason) return json({ error: 'bad_request', reason }, 400, cors);

  const ipHash = await ipHashOf(request, env);
  if (await rateLimited(env, ipHash, VERSUS_RATE_PER_MINUTE, 'versus')) return json({ error: 'rate_limited' }, 429, cors);

  const { category, winner, loser } = body;
  const voter = user ? `u_${user.id}` : body.voter;
  const [a, b] = normalizePair(winner, loser);
  const now = Date.now();

  // 점수 변화는 지금 점수로 미리 계산하고, 반영은 'rating = rating + 변화' 로 해서
  // 동시에 들어온 표끼리 서로 덮어쓰지 않게 한다 (기대 승률이 조금 낡을 뿐).
  const { results: current } = await env.DB.prepare(
    'SELECT item, rating FROM versus_ratings WHERE category = ?1 AND item IN (?2, ?3)'
  ).bind(category, winner, loser).all();
  const ratingOf = item => current.find(r => r.item === item)?.rating ?? ELO_START;
  const delta = eloDelta(ratingOf(winner), ratingOf(loser));

  // batch 는 한 트랜잭션으로 차례대로 돈다.
  // 표가 새로 들어갔거나 이긴 쪽이 바뀐 경우에만 upsert 의 changes() 가 1 이라서 Elo 를 반영한다
  // (같은 선택을 되풀이해 점수를 부풀리지 못하게). wins/losses 는 표에서 다시 센다.
  const results = await env.DB.batch([
    env.DB.prepare(
      'INSERT OR IGNORE INTO versus_ratings (category, item) VALUES (?1, ?2), (?1, ?3)'
    ).bind(category, winner, loser),
    env.DB.prepare(
      `INSERT INTO versus_votes (category, a, b, voter, winner, ts) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (category, a, b, voter) DO UPDATE SET winner = excluded.winner, ts = excluded.ts
       WHERE winner != excluded.winner`
    ).bind(category, a, b, voter, winner, now),
    env.DB.prepare(
      `UPDATE versus_ratings SET rating = rating + (CASE WHEN item = ?2 THEN ?4 ELSE -?4 END)
       WHERE category = ?1 AND item IN (?2, ?3) AND changes() > 0`
    ).bind(category, winner, loser, delta),
    env.DB.prepare(
      `UPDATE versus_ratings SET
         wins = (SELECT COUNT(*) FROM versus_votes v WHERE v.category = ?1 AND v.winner = versus_ratings.item),
         losses = (SELECT COUNT(*) FROM versus_votes v
                   WHERE v.category = ?1 AND v.a = versus_ratings.item AND v.winner != versus_ratings.item)
                + (SELECT COUNT(*) FROM versus_votes v
                   WHERE v.category = ?1 AND v.b = versus_ratings.item AND v.winner != versus_ratings.item)
       WHERE category = ?1 AND item IN (?2, ?3)`
    ).bind(category, winner, loser),
    env.DB.prepare(
      'SELECT item, rating FROM versus_ratings WHERE category = ?1 AND item IN (?2, ?3)'
    ).bind(category, winner, loser),
  ]);

  if (Math.random() < 0.02) {
    const minute = Math.floor(now / 60000);
    ctx.waitUntil(env.DB.prepare('DELETE FROM rate_limit WHERE minute < ?1').bind(minute - 10).run());
  }

  const ratings = {};
  for (const r of results[results.length - 1].results) ratings[r.item] = round1(r.rating);
  return json({ ok: true, ratings }, 200, cors);
}

// ---- 월드컵(토너먼트) ----

// 한 판이 끝나면 화면이 우승 항목과 출전 항목을 보낸다. 출전한 항목마다 entries + 1, 우승 항목은 champ + 1.
// 경기마다의 선택은 따로 POST /versus 로 들어와 Elo 에 반영된다.
// 매개변수 수 제한(문장당 100개)에 걸리지 않게 출전 목록은 JSON 배열 하나로 넘겨 json_each 로 푼다.
// (INSERT … SELECT 에 ON CONFLICT 를 붙일 때는 구문 모호성 때문에 WHERE 가 있어야 한다.)
const TOURNAMENT_SQL = `
INSERT INTO worldcup_stats (category, item, champ, entries)
SELECT ?1, value, CASE WHEN value = ?2 THEN 1 ELSE 0 END, 1 FROM json_each(?3) WHERE 1
ON CONFLICT (category, item) DO UPDATE SET champ = champ + excluded.champ, entries = entries + 1`;

async function postTournament(request, env, ctx, cors, keys) {
  const body = await readJson(request);
  if (body === undefined) return json({ error: 'bad_request', reason: 'json' }, 400, cors);
  const user = await getUser(request, env);
  const reason = validateTournament(body, keys, Boolean(user));
  if (reason) return json({ error: 'bad_request', reason }, 400, cors);

  const ipHash = await ipHashOf(request, env);
  if (await rateLimited(env, ipHash, TOURNAMENT_RATE_PER_MINUTE, 'cup')) return json({ error: 'rate_limited' }, 429, cors);

  const { category, champion, entrants } = body;
  await env.DB.prepare(TOURNAMENT_SQL).bind(category, champion, JSON.stringify(entrants)).run();
  return json({ ok: true }, 200, cors);
}

// 두 표를 합친다. 월드컵에만 나온 항목은 Elo 시작값으로.
export function mergeRanking(ratings, cups, category, keys) {
  const items = {};
  const ok = item => keys.has(`${category}/${item}`);
  for (const { item, rating, wins, losses } of ratings) {
    if (ok(item)) items[item] = { rating: round1(rating), wins, losses, champ: 0, entries: 0 };
  }
  for (const { item, champ, entries } of cups) {
    if (!ok(item)) continue;
    const r = items[item] || (items[item] = { rating: ELO_START, wins: 0, losses: 0, champ: 0, entries: 0 });
    r.champ = champ;
    r.entries = entries;
  }
  return items;
}

async function getRanking(url, env, ctx, cors, keys) {
  const category = url.searchParams.get('category');
  if (!category || !categoriesOf(keys).has(category)) return json({ error: 'bad_request', reason: 'category' }, 400, cors);

  // 캐시 열쇠에 v=2: 월드컵 수치가 없는 예전 응답을 다시 쓰지 않게
  return cached(`versus/ranking?v=2&category=${encodeURIComponent(category)}`, RANKING_TTL, ctx, cors, async () => {
    const [ratings, cups] = await env.DB.batch([
      env.DB.prepare('SELECT item, rating, wins, losses FROM versus_ratings WHERE category = ?1').bind(category),
      env.DB.prepare('SELECT item, champ, entries FROM worldcup_stats WHERE category = ?1').bind(category),
    ]);
    return { category, items: mergeRanking(ratings.results, cups.results, category, keys) };
  });
}

// ---- 캐시 ----

// index.js 의 getResults 처럼 caches.default 에 ttl 초 동안 둔다. 성공(200)만 저장한다.
async function cached(path, ttl, ctx, cors, compute) {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.sts2-balance/${path}`);
  const hit = await cache.match(cacheKey);
  if (hit) {
    const res = new Response(hit.body, hit);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  }
  const res = json(await compute(), 200, { 'Cache-Control': `public, max-age=${ttl}` });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}
