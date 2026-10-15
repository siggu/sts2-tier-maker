// 사용자 월드컵(이상형 월드컵 만들기·하기)과 올린 이미지.
// 처리하는 경로면 Response, 아니면 null 을 돌려준다.
import { json, ipHashOf, rateLimited, readJson } from './http.js';
import { getUser, randomHex } from './auth.js';
import { isAnonVoter } from './votes.js';
import { checkBracket, bracketStats } from './bracket.js';
import { UNSAFE_CHARS, listComments, addComment } from './account.js';
import { IMAGE_TYPES, imageTypeOf, imageId } from './image.js';
import { storeModeratedImage, imageCacheKey, VISIBLE_STATUSES } from './moderation.js';

// 이미지 형식 검사는 image.js 로 옮겼다 (예전 이름 그대로 내보낸다)
export { IMAGE_TYPES, imageTypeOf, imageId };

const PAGE_SIZE = 20;
export const MIN_ITEMS = 4;
export const MAX_ITEMS = 64;
const CUPS_PER_DAY = 10;
const IMAGES_PER_DAY = 300;         // 한 사람이 하루에 새로 올릴 수 있는 이미지 (D1 용량 보호)
export const MAX_IMAGE_BYTES = 300 * 1024;
const CUP_BODY_BYTES = 64 * 1024;   // 항목 64개 × (이름 80자 + 참조) 를 넉넉히
const SMALL_BODY_BYTES = 8 * 1024;
const USER_LIMITS = { cupnew: 3, cupedit: 10, cuplike: 60 }; // 사용자당 1분
const IMG_RATE = 20;                // IP 당 1분
const PLAY_RATE = 6;                // IP 당 1분
const SAMPLE_SIZE = 4;
const EDGE_CACHE_SEC = 3600;        // 엣지 캐시에 두는 시간 (숨김·차단이 다른 데이터센터에도 이 안에 닿게)
const VISIBLE_SQL = VISIBLE_STATUSES.map(s => `'${s}'`).join(', ');

const ID_RE = /^[0-9a-f]{24}$/;     // 월드컵 id (12바이트 hex)
const USER_ID_RE = /^[0-9a-f]{32}$/;
const IMAGE_ID_RE = /^[0-9a-f]{32}$/;
const IMG_REF_RE = /^img:([0-9a-f]{32})$/;

// 올린 이미지 내용은 바뀌지 않지만(id = 내용 해시) 숨겨지거나 차단될 수 있어 하루만 캐시한다.
// 사이트가 canvas 에 그릴 수 있게 출처 제한 없이 연다.
const IMAGE_HEADERS = {
  'Cache-Control': 'public, max-age=86400',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'",
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const len = s => [...s].length;
const round4 = r => Math.round(r * 10000) / 10000;

const ROUTES = [
  ['POST', /^\/images$/, auth(uploadImage)],
  ['GET', /^\/img\/([^/]+)$/, getImage],
  ['GET', /^\/cups$/, optional(listCups)],
  ['POST', /^\/cups$/, auth(createCup)],
  ['GET', /^\/cups\/([^/]+)$/, optional(getCup)],
  ['PATCH', /^\/cups\/([^/]+)$/, auth(patchCup)],
  ['DELETE', /^\/cups\/([^/]+)$/, auth(deleteCup)],
  ['POST', /^\/cups\/([^/]+)\/play$/, optional(playCup)],
  ['POST', /^\/cups\/([^/]+)\/like$/, auth(likeCup)],
  ['GET', /^\/cups\/([^/]+)\/comments$/, optional(listCupComments)],
  ['POST', /^\/cups\/([^/]+)\/comments$/, auth(addCupComment)],
];

export async function handleCups(request, env, ctx, { url, cors, keys }) {
  let matched = false;
  for (const [method, re, handler] of ROUTES) {
    const m = re.exec(url.pathname);
    if (!m) continue;
    matched = true;
    if (method !== request.method) continue;
    const c = { request, env, ctx, url, cors, keys, send: (body, status = 200) => json(body, status, cors) };
    return handler(c, ...m.slice(1));
  }
  return matched ? json({ error: 'method_not_allowed' }, 405, cors) : null;
}

// 로그인이 필요한 처리: 세션이 없거나 틀리면 401
function auth(handler) {
  return async (c, ...args) => {
    c.user = await getUser(c.request, c.env);
    if (!c.user) return c.send({ error: 'auth' }, 401);
    return handler(c, ...args);
  };
}

// 로그인은 있으면 쓴다 (내 좋아요·숨긴 글 보기·계정 표)
function optional(handler) {
  return async (c, ...args) => {
    c.user = await getUser(c.request, c.env);
    return handler(c, ...args);
  };
}

const bad = (c, reason, extra) => c.send({ error: 'bad_request', reason, ...extra }, 400);
const notFound = c => c.send({ error: 'not_found' }, 404);
const userLimited = (c, bucket) => rateLimited(c.env, `u:${c.user.id}`, USER_LIMITS[bucket], bucket);

// JSON 본문 읽기. 크기를 넘으면 413, 객체가 아니면 400. → { body } | { res }
async function readBody(c, max) {
  if (Number(c.request.headers.get('Content-Length') || 0) > max) return { res: c.send({ error: 'too_large' }, 413) };
  let text;
  try { text = await c.request.text(); } catch { return { res: bad(c, 'json') }; }
  if (new TextEncoder().encode(text).length > max) return { res: c.send({ error: 'too_large' }, 413) };
  let body;
  try { body = JSON.parse(text); } catch { return { res: bad(c, 'json') }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { res: bad(c, 'json') };
  return { body };
}

// ---------- 입력 검사 (테스트에서도 쓴다) ----------

// 한 줄 글: 공백 정리, min–max 자. 틀리면 null.
export function cleanLine(s, min, max) {
  if (typeof s !== 'string') return null;
  const t = s.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim();
  return len(t) >= min && len(t) <= max ? t : null;
}

// 여러 줄 글: 빈 줄은 하나까지, min–max 자. 틀리면 null.
export function cleanText(s, min, max) {
  if (typeof s !== 'string') return null;
  const t = s.replace(/\r\n?/g, '\n').replace(UNSAFE_CHARS, '').replace(/\n{3,}/g, '\n\n').trim();
  return len(t) >= min && len(t) <= max ? t : null;
}

// 이미지 참조 종류: null → 'none', 'img:<32hex>' → 'img', 'game:<keys 의 키>' → 'game', 그 밖 → null.
// (img 참조가 실제로 올라와 있는지는 따로 DB 에서 본다)
export function refKind(ref, keys) {
  if (ref === null) return 'none';
  if (typeof ref !== 'string') return null;
  if (IMG_REF_RE.test(ref)) return 'img';
  if (ref.startsWith('game:') && keys.has(ref.slice(5))) return 'game';
  return null;
}

// 참조들 가운데 올린 이미지 id 만
export function imageIdsOf(refs) {
  const ids = new Set();
  for (const ref of refs) {
    const m = typeof ref === 'string' && IMG_REF_RE.exec(ref);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

// POST /cups 본문 → { cup: { title, description, cover, items: [{ name, img }] } } | { reason, index? }
export function validateCup(body, keys) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { reason: 'json' };
  const title = cleanLine(body.title, 2, 60);
  if (title === null) return { reason: 'title' };
  const description = cleanText(body.description ?? '', 0, 300);
  if (description === null) return { reason: 'description' };
  const cover = body.cover ?? null;
  if (!refKind(cover, keys)) return { reason: 'cover' };
  if (!Array.isArray(body.items) || body.items.length < MIN_ITEMS || body.items.length > MAX_ITEMS) return { reason: 'items' };
  const items = [];
  for (let index = 0; index < body.items.length; index++) {
    const it = body.items[index];
    if (!it || typeof it !== 'object' || Array.isArray(it)) return { reason: 'item', index };
    const name = cleanLine(it.name, 1, 80);
    if (name === null) return { reason: 'name', index };
    const img = it.img ?? null;
    if (!refKind(img, keys)) return { reason: 'img', index };
    items.push({ name, img });
  }
  return { cup: { title, description, cover, items } };
}

// PATCH /cups/:id 본문 → { patch } (준 필드만) | { reason }
export function validateCupPatch(body, keys) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { reason: 'json' };
  const patch = {};
  if (body.title !== undefined) {
    patch.title = cleanLine(body.title, 2, 60);
    if (patch.title === null) return { reason: 'title' };
  }
  if (body.description !== undefined) {
    patch.description = cleanText(body.description ?? '', 0, 300);
    if (patch.description === null) return { reason: 'description' };
  }
  if (body.cover !== undefined) {
    if (!refKind(body.cover, keys)) return { reason: 'cover' };
    patch.cover = body.cover;
  }
  return { patch };
}

// 목록 미리보기: 항목 이미지 참조 최대 4개, 이미지 있는 항목 먼저 (모자라면 null 로 채운다)
export function cupSample(items) {
  const refs = items.map(it => it.img);
  return [...refs.filter(r => r !== null), ...refs.filter(r => r === null)].slice(0, SAMPLE_SIZE);
}

// POST /cups/:id/play 본문 검사. itemIds = 그 월드컵의 항목 id 들. 틀리면 { reason, index? }, 맞으면 null.
// entrants: 서로 다른 항목 2개 이상(항목 수 이하) — 2의 거듭제곱이 아니면 앞의 n − P 경기가 예선, 나머지는 부전승.
// matches: [이긴 id, 진 id] 를 치른 순서대로 entrants − 1 개, 라운드 순서 (bracket.js 의 checkBracket).
// champion 은 마지막 경기의 승자.
export function playError(body, itemIds, loggedIn = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { reason: 'body' };
  const bad = checkBracket(body, id => itemIds.has(id), itemIds.size);
  if (bad) return bad;
  if (!loggedIn && !isAnonVoter(body.voter)) return { reason: 'voter' };
  return null;
}
// 이유만 (문자열 또는 null)
export const validatePlay = (body, itemIds, loggedIn) => playError(body, itemIds, loggedIn)?.reason ?? null;

// 경기 목록 → { 항목id: [이긴 수, 진 수, 진출도] } (출전 항목 모두 포함). 진출도는 bracket.js 의 bracketStats.
export function tallyMatches(entrants, matches) {
  const { items } = bracketStats(entrants, matches);
  return Object.fromEntries(Object.entries(items).map(([id, s]) => [id, [s.w, s.l, s.p]]));
}

// D1 은 BLOB 을 숫자 배열로, node:sqlite 는 Uint8Array 로 돌려준다
const toBytes = v => (v instanceof Uint8Array ? v : new Uint8Array(v));

// ---------- 이미지 ----------

// 형식·크기 검사 → 정리(메타데이터 지우기) → 차단 목록 → AI 검열 → 저장 (moderation.js)
async function uploadImage(c) {
  const { env, request, user } = c;
  if (await rateLimited(env, await ipHashOf(request, env), IMG_RATE, 'img')) return c.send({ error: 'rate_limited' }, 429);
  const type = imageTypeOf(request.headers.get('Content-Type'));
  if (!type) return bad(c, 'type');
  if (Number(request.headers.get('Content-Length') || 0) > MAX_IMAGE_BYTES) return c.send({ error: 'too_large' }, 413);
  let bytes;
  try { bytes = new Uint8Array(await request.arrayBuffer()); } catch { return bad(c, 'image'); }
  if (bytes.length > MAX_IMAGE_BYTES) return c.send({ error: 'too_large' }, 413);

  // 같은 그림은 같은 id: 이미 있으면 그대로 돌려준다 (하루 제한에도 세지 않는다)
  const r = await storeModeratedImage(env, bytes, { userId: user.id, purpose: 'cup', type, dailyLimit: IMAGES_PER_DAY });
  if (r.error === 'bad_request') return bad(c, r.reason);
  if (r.error === 'blocked') return c.send({ error: 'blocked' }, 400);
  if (r.error) return c.send({ error: r.error, reason: r.reason }, 429);
  return c.send({ id: r.id, ref: `img:${r.id}`, status: r.status });
}

// 이미지 응답 헤더: 받은 CORS 에 더해 어느 출처든 읽게(*) 한다. Vary: Origin 은 필요 없다.
function imageResponse(c, body, type) {
  const headers = { ...c.cors, ...IMAGE_HEADERS, 'Content-Type': type, 'Access-Control-Allow-Origin': '*' };
  delete headers.Vary;
  return new Response(body, { status: 200, headers });
}

// ok·pending 만 보낸다 (숨김·차단·없는 이미지는 404). 엣지 캐시 열쇠는 요청 주소 — 숨기거나 차단하면 지운다 (moderation.js).
async function getImage(c, id) {
  if (!IMAGE_ID_RE.test(id)) return notFound(c);
  const cache = typeof caches === 'undefined' ? null : caches.default; // node 시험에는 caches 가 없다
  const cacheKey = imageCacheKey(c.url.origin, id);
  const hit = cache && await cache.match(cacheKey);
  if (hit) return imageResponse(c, hit.body, hit.headers.get('Content-Type'));

  const row = await c.env.DB.prepare(`SELECT type, bytes FROM images WHERE id = ?1 AND status IN (${VISIBLE_SQL})`).bind(id).first();
  if (!row) return notFound(c);
  const bytes = toBytes(row.bytes);
  if (cache) {
    const stored = new Response(bytes, { headers: { ...IMAGE_HEADERS, 'Cache-Control': `public, max-age=${EDGE_CACHE_SEC}`, 'Content-Type': row.type } });
    c.ctx?.waitUntil?.(cache.put(cacheKey, stored));
  }
  return imageResponse(c, bytes, row.type);
}

// 참조 가운데 올라와 있지 않은(또는 숨김·차단된) 이미지 id
async function missingImages(env, ids) {
  if (!ids.length) return new Set();
  const { results } = await env.DB.prepare(`SELECT id FROM images WHERE id IN (SELECT value FROM json_each(?1)) AND status IN (${VISIBLE_SQL})`)
    .bind(JSON.stringify(ids)).all();
  const have = new Set(results.map(r => r.id));
  return new Set(ids.filter(id => !have.has(id)));
}

const refMissing = (ref, missing) => typeof ref === 'string' && ref.startsWith('img:') && missing.has(ref.slice(4));

// ---------- 월드컵 ----------

// ?1 = 보는 사람 id (없으면 '')
const CUP_COLUMNS = `k.id, k.user_id, k.title, k.description, k.cover, k.item_count, k.sample, k.plays, k.likes, k.comments,
  k.hidden, k.created, u.name AS a_name, u.picture AS a_picture,
  EXISTS (SELECT 1 FROM cup_likes l WHERE l.cup_id = k.id AND l.user_id = ?1) AS my_like`;

function parseJson(text, fallback) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function cupOut(r, user) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    cover: r.cover ?? null,
    itemCount: r.item_count,
    plays: r.plays,
    likes: r.likes,
    comments: r.comments,
    author: { id: r.user_id, name: r.a_name, picture: r.a_picture || null },
    created: r.created,
    sample: parseJson(r.sample, []),
    myLike: Boolean(r.my_like),
    hidden: Boolean(r.hidden),
    mine: Boolean(user && user.id === r.user_id),
  };
}

// 숨겨진 월드컵은 작성자와 관리자에게만 보인다
const canSee = (row, user) => !row.hidden || (user && (user.admin || user.id === row.user_id));
const canModify = (row, user) => user.admin || user.id === row.user_id;

async function findCup(c, id) {
  if (!ID_RE.test(id)) return null;
  const row = await c.env.DB.prepare(
    `SELECT ${CUP_COLUMNS} FROM cups k JOIN users u ON u.id = k.user_id WHERE k.id = ?2`
  ).bind(c.user?.id ?? '', id).first();
  return row && canSee(row, c.user) ? row : null;
}

async function createCup(c) {
  const { env, user } = c;
  if (await userLimited(c, 'cupnew')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, CUP_BODY_BYTES);
  if (res) return res;
  const { cup, reason, index } = validateCup(body, c.keys);
  if (!cup) return bad(c, reason, index === undefined ? undefined : { index });

  const now = Date.now();
  const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM cups WHERE user_id = ?1 AND created > ?2')
    .bind(user.id, now - 86400000).first();
  if (today.n >= CUPS_PER_DAY) return c.send({ error: 'rate_limited', reason: 'daily' }, 429);

  // 올린 이미지 참조는 실제로 있어야 한다
  const missing = await missingImages(env, imageIdsOf([cup.cover, ...cup.items.map(it => it.img)]));
  if (refMissing(cup.cover, missing)) return bad(c, 'cover');
  const lost = cup.items.findIndex(it => refMissing(it.img, missing));
  if (lost >= 0) return bad(c, 'img', { index: lost });

  const id = randomHex(12);
  const sample = cupSample(cup.items);
  // 항목은 JSON 배열 하나로 넘겨 json_each 로 푼다 (문장당 매개변수 100개 제한). 항목 id = 'i' + 순서(1부터).
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO cups (id, user_id, title, description, cover, item_count, sample, created)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(id, user.id, cup.title, cup.description, cup.cover, cup.items.length, JSON.stringify(sample), now),
    env.DB.prepare(
      `INSERT INTO cup_items (cup_id, id, pos, name, img)
       SELECT ?1, 'i' || (key + 1), key + 1, json_extract(value, '$.name'), json_extract(value, '$.img') FROM json_each(?2)`
    ).bind(id, JSON.stringify(cup.items)),
  ]);
  return c.send({
    cup: cupOut({
      id, user_id: user.id, title: cup.title, description: cup.description, cover: cup.cover, item_count: cup.items.length,
      sample: JSON.stringify(sample), plays: 0, likes: 0, comments: 0, hidden: 0, created: now,
      a_name: user.name, a_picture: user.picture, my_like: 0,
    }, user),
  });
}

// cursor 는 마지막 월드컵의 정렬 키: new → 'created:id', top → 'likes:plays:created:id'
async function listCups(c) {
  const { env, url, user } = c;
  const q = url.searchParams;
  const sort = q.get('sort') || 'new';
  const author = q.get('author') || null;
  const cursor = q.get('cursor') || null;
  if (sort !== 'new' && sort !== 'top') return bad(c, 'sort');
  if (author && !USER_ID_RE.test(author)) return bad(c, 'author');

  // WHERE 는 고정된 조각만 이어 붙이고 값은 모두 bind 로 넘긴다
  const params = [user?.id ?? ''];
  const p = v => `?${params.push(v)}`;
  const where = [];
  if (author) where.push(`k.user_id = ${p(author)}`);
  if (!user?.admin) where.push(`(k.hidden = 0 OR k.user_id = ${p(user?.id ?? '')})`);
  if (cursor) {
    const m = sort === 'new'
      ? /^(\d{1,15}):([0-9a-f]{24})$/.exec(cursor)
      : /^(\d{1,9}):(\d{1,12}):(\d{1,15}):([0-9a-f]{24})$/.exec(cursor);
    if (!m) return bad(c, 'cursor');
    // 마지막 값(id)만 문자열, 나머지는 수. 행 값 비교로 '정렬 순서상 이 뒤' 를 고른다.
    const vals = m.slice(1).map((v, i, all) => (i === all.length - 1 ? v : Number(v)));
    const cols = sort === 'new' ? '(k.created, k.id)' : '(k.likes, k.plays, k.created, k.id)';
    where.push(`${cols} < (${vals.map(p).join(', ')})`);
  }
  const order = sort === 'new' ? 'k.created DESC, k.id DESC' : 'k.likes DESC, k.plays DESC, k.created DESC, k.id DESC';
  const { results } = await env.DB.prepare(
    `SELECT ${CUP_COLUMNS} FROM cups k JOIN users u ON u.id = k.user_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ${order} LIMIT ${PAGE_SIZE + 1}`
  ).bind(...params).all();

  const rows = results.slice(0, PAGE_SIZE);
  let next = null;
  if (results.length > PAGE_SIZE) {
    const last = rows[rows.length - 1];
    next = sort === 'new' ? `${last.created}:${last.id}` : `${last.likes}:${last.plays}:${last.created}:${last.id}`;
  }
  return c.send({ cups: rows.map(r => cupOut(r, user)), next });
}

async function getCup(c, id) {
  const row = await findCup(c, id);
  if (!row) return notFound(c);
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, img, champ, entries, wins, losses, expected, progress, tracked, tracked_champ FROM cup_items WHERE cup_id = ?1 ORDER BY pos'
  ).bind(id).all();
  const items = results.map(r => ({
    id: r.id, name: r.name, img: r.img ?? null, champ: r.champ, entries: r.entries, wins: r.wins, losses: r.losses,
    expected: round4(r.expected || 0), progress: round4(r.progress || 0), tracked: r.tracked || 0, trackedChamp: r.tracked_champ || 0,
  }));
  return c.send({ cup: cupOut(row, c.user), items });
}

async function patchCup(c, id) {
  const { env } = c;
  if (await userLimited(c, 'cupedit')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  const row = await findCup(c, id);
  if (!row) return notFound(c);
  if (!canModify(row, c.user)) return c.send({ error: 'forbidden' }, 403);
  const { patch, reason } = validateCupPatch(body, c.keys);
  if (!patch) return bad(c, reason);
  if (patch.cover !== undefined && (await missingImages(env, imageIdsOf([patch.cover]))).size) return bad(c, 'cover');

  // 바꿀 열 이름은 고정된 목록에서만 고른다
  const cols = ['title', 'description', 'cover'].filter(k => patch[k] !== undefined);
  if (cols.length) {
    await env.DB.prepare(`UPDATE cups SET ${cols.map((k, i) => `${k} = ?${i + 2}`).join(', ')} WHERE id = ?1`)
      .bind(id, ...cols.map(k => patch[k])).run();
  }
  return c.send({ cup: cupOut({ ...row, ...patch }, c.user) });
}

async function deleteCup(c, id) {
  const { env } = c;
  const row = await findCup(c, id);
  if (!row) return notFound(c);
  if (!canModify(row, c.user)) return c.send({ error: 'forbidden' }, 403);
  const target = `cup:${id}`;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE target = ?1)').bind(target),
    env.DB.prepare(`DELETE FROM reports WHERE kind = 'comment' AND target_id IN (SELECT id FROM comments WHERE target = ?1)`).bind(target),
    env.DB.prepare('DELETE FROM comments WHERE target = ?1').bind(target),
    env.DB.prepare('DELETE FROM cup_likes WHERE cup_id = ?1').bind(id),
    env.DB.prepare('DELETE FROM cup_items WHERE cup_id = ?1').bind(id),
    env.DB.prepare(`DELETE FROM reports WHERE kind = 'cup' AND target_id = ?1`).bind(id),
    env.DB.prepare('DELETE FROM cups WHERE id = ?1').bind(id),
  ]);
  return c.send({ ok: true });
}

// 한 판이 끝나면 화면이 출전 항목·경기 결과·우승 항목을 보낸다. 투표자는 저장하지 않는다 (/versus/tournament 처럼).
// 출전 항목마다 entries + 1, 우승 항목 champ + 1, 경기마다 wins/losses, 그리고 대진 크기를 반영한 수치
// expected + 1/n, progress + 진출도, tracked + 1, tracked_champ + 우승 (bracket.js, play.js 의 TOURNAMENT_SQL 과 같은 뜻).
// 승패·진출도는 JSON 객체 하나로 넘긴다.
const PLAY_SQL = `
UPDATE cup_items SET entries = entries + 1, champ = champ + (id = ?2),
  wins = wins + json_extract(?3, '$.' || id || '[0]'), losses = losses + json_extract(?3, '$.' || id || '[1]'),
  progress = progress + json_extract(?3, '$.' || id || '[2]'), expected = expected + ?4,
  tracked = tracked + 1, tracked_champ = tracked_champ + (id = ?2)
WHERE cup_id = ?1 AND id IN (SELECT key FROM json_each(?3))`;

async function playCup(c, id) {
  const { env, request, user } = c;
  const body = await readJson(request);
  if (body === undefined) return bad(c, 'json');
  const row = await findCup(c, id);
  if (!row) return notFound(c);
  const { results } = await env.DB.prepare('SELECT id FROM cup_items WHERE cup_id = ?1').bind(id).all();
  const err = playError(body, new Set(results.map(r => r.id)), Boolean(user));
  // 세션이 만료됐는데 voter 없이 보냈다면 다시 로그인하라고 알린다 (/balance 와 같다)
  if (err?.reason === 'voter' && request.headers.has('Authorization')) return c.send({ error: 'auth' }, 401);
  if (err) return bad(c, err.reason, err.index === undefined ? undefined : { index: err.index });
  if (await rateLimited(env, await ipHashOf(request, env), PLAY_RATE, 'cupplay')) return c.send({ error: 'rate_limited' }, 429);

  const tally = tallyMatches(body.entrants, body.matches);
  await env.DB.batch([
    env.DB.prepare('UPDATE cups SET plays = plays + 1 WHERE id = ?1').bind(id),
    env.DB.prepare(PLAY_SQL).bind(id, body.champion, JSON.stringify(tally), 1 / body.entrants.length),
  ]);
  return c.send({ ok: true });
}

async function likeCup(c, id) {
  const { env, user } = c;
  if (await userLimited(c, 'cuplike')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  if (typeof body.on !== 'boolean') return bad(c, 'on');
  if (!(await findCup(c, id))) return notFound(c);

  // 수는 cup_likes 에서 다시 세어 어긋나지 않게 한다
  const [, counted] = await env.DB.batch([
    body.on
      ? env.DB.prepare('INSERT OR IGNORE INTO cup_likes (cup_id, user_id) VALUES (?1, ?2)').bind(id, user.id)
      : env.DB.prepare('DELETE FROM cup_likes WHERE cup_id = ?1 AND user_id = ?2').bind(id, user.id),
    env.DB.prepare('UPDATE cups SET likes = (SELECT COUNT(*) FROM cup_likes WHERE cup_id = ?1) WHERE id = ?1 RETURNING likes').bind(id),
  ]);
  return c.send({ likes: counted.results[0].likes, myLike: body.on });
}

// 댓글은 갤러리 글 댓글과 같은 모양·제한 (account.js). cups.comments 는 account.js 가 다시 센다.
async function listCupComments(c, id) {
  if (!(await findCup(c, id))) return notFound(c);
  return listComments(c, `cup:${id}`, { order: 'c.created ASC, c.rowid ASC' });
}

async function addCupComment(c, id) {
  if (!(await findCup(c, id))) return notFound(c);
  return addComment(c, `cup:${id}`);
}
