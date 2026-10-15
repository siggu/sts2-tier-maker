// 로그인·내 정보·티어표 동기화·갤러리·댓글·신고.
// 처리하는 경로면 Response, 아니면 null 을 돌려준다.
import { json, ipHashOf, rateLimited } from './http.js';
import { getUser, verifyGoogleIdToken, keyResolverFor, createSession, deleteSession, bearerToken, publicUser, randomHex } from './auth.js';
import { isAnonVoter } from './votes.js';
import { reportImage } from './moderation.js';

const VOTE_NAMES = { 1: 'nerf', 2: 'fair', 3: 'buff' };
const PAGE_SIZE = 20;
const MAX_COMMENTS = 200;
const REPORTS_TO_HIDE = 3;
const MAX_STATE_BYTES = 24 * 1024;
const MAX_BODY_BYTES = 32 * 1024;   // 티어표가 든 요청
const SMALL_BODY_BYTES = 8 * 1024;  // 그 밖의 요청 (구글 ID 토큰 포함)
const POSTS_PER_DAY = 20;
const MAX_USER_TIERS = 300;         // 한 사람이 동기화할 수 있는 티어표 수 (/me 응답 크기를 묶어 둔다)
const LIMITS = { login: 10, profile: 10, tiers: 60, post: 5, react: 60, comment: 5, like: 60, report: 10 }; // 1분당

const TEMPLATE_RE = /^[a-z0-9][A-Za-z0-9.-]{0,79}$/;
const ITEM_ID_RE = /^[A-Za-z0-9._-]{1,80}$/;
const ID_RE = /^[0-9a-f]{24}$/;      // 글·댓글 id (12바이트 hex)
const USER_ID_RE = /^[0-9a-f]{32}$/;
const IMAGE_ID_RE = /^[0-9a-f]{32}$/; // 올린 이미지 id (cups.js)
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
// 갤러리 글 종류. 'balance' 글은 밸런스 투표(너프/적당/버프 3줄, 색 고정)를 티어표와 같은 모양으로 담는다.
const POST_KINDS = ['tier', 'balance'];
export const BALANCE_ROWS = [
  { label: 'nerf', color: '#e5484d' },
  { label: 'fair', color: '#b9ae95' },
  { label: 'buff', color: '#57a7d8' },
];
// 제어 문자와 글자 방향 바꾸기 문자(이름·댓글로 화면을 속이지 못하게). 줄바꿈은 따로 다룬다.
export const UNSAFE_CHARS = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩﻿]/g;

const len = s => [...s].length; // 글자 수 = 코드 포인트 수 (이모지·한글이 1자)

const ROUTES = [
  ['POST', /^\/auth\/google$/, login],
  ['POST', /^\/auth\/logout$/, logout],
  ['GET', /^\/me$/, auth(getMe)],
  ['PATCH', /^\/me$/, auth(patchMe)],
  ['PUT', /^\/me\/tiers\/([^/]+)$/, auth(putTier)],
  ['DELETE', /^\/me\/tiers\/([^/]+)$/, auth(deleteTier)],
  ['GET', /^\/gallery$/, listPosts],
  ['POST', /^\/gallery$/, auth(createPost)],
  ['GET', /^\/gallery\/([^/]+)$/, getPost],
  ['DELETE', /^\/gallery\/([^/]+)$/, auth(deletePost)],
  ['POST', /^\/gallery\/([^/]+)\/react$/, auth(reactPost)],
  ['GET', /^\/gallery\/([^/]+)\/comments$/, listPostComments],
  ['POST', /^\/gallery\/([^/]+)\/comments$/, auth(addPostComment)],
  ['GET', /^\/items\/([^/]+)\/([^/]+)\/comments$/, listItemComments],
  ['POST', /^\/items\/([^/]+)\/([^/]+)\/comments$/, auth(addItemComment)],
  ['DELETE', /^\/comments\/([^/]+)$/, auth(deleteComment)],
  ['POST', /^\/comments\/([^/]+)\/like$/, auth(likeComment)],
  ['POST', /^\/report$/, auth(report)],
];

export async function handleAccount(request, env, ctx, { url, cors, keys }) {
  let matched = false;
  for (const [method, re, handler] of ROUTES) {
    const m = re.exec(url.pathname);
    if (!m) continue;
    matched = true;
    if (method !== request.method) continue;
    const c = { request, env, ctx, url, cors, keys, send: (body, status = 200) => json(body, status, cors) };
    if (method !== 'GET' && Math.random() < 0.02) ctx?.waitUntil?.(cleanup(env));
    return handler(c, ...m.slice(1));
  }
  return matched ? json({ error: 'method_not_allowed' }, 405, cors) : null;
}

// 오래된 속도 제한 기록과 만료된 세션 정리
function cleanup(env) {
  return env.DB.batch([
    env.DB.prepare('DELETE FROM rate_limit WHERE minute < ?1').bind(Math.floor(Date.now() / 60000) - 10),
    env.DB.prepare('DELETE FROM sessions WHERE expires < ?1').bind(Date.now()),
  ]);
}

// 로그인이 필요한 처리: 세션이 없거나 틀리면 401
function auth(handler) {
  return async (c, ...args) => {
    c.user = await getUser(c.request, c.env);
    if (!c.user) return c.send({ error: 'auth' }, 401);
    return handler(c, ...args);
  };
}

const bad = (c, reason) => c.send({ error: 'bad_request', reason }, 400);
const notFound = c => c.send({ error: 'not_found' }, 404);

async function limited(c, bucket) {
  const key = c.user ? `u:${c.user.id}` : await ipHashOf(c.request, c.env);
  return rateLimited(c.env, key, LIMITS[bucket], bucket);
}

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

const categoriesCache = new WeakMap();
function categoriesOf(keys) {
  if (!categoriesCache.has(keys)) categoriesCache.set(keys, new Set([...keys].map(k => k.split('/')[0])));
  return categoriesCache.get(keys);
}

// 템플릿 id: 사이트 data.js 가 만드는 형식 (예: relics.rarity-ancient.source-Neow). 첫 마디는 알려진 카테고리.
export function isTemplateId(id, keys) {
  return typeof id === 'string' && TEMPLATE_RE.test(id) && categoriesOf(keys).has(id.split('.')[0]);
}

// 보이는 이름: 한 줄, 공백 정리, 2–20자. 틀리면 null.
export function cleanName(name) {
  if (typeof name !== 'string') return null;
  const s = name.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim();
  return len(s) >= 2 && len(s) <= 20 ? s : null;
}

// 댓글 본문: 줄바꿈은 두되 빈 줄은 하나까지, 1–500자. 틀리면 null. HTML 이스케이프는 하지 않는다(화면이 한다).
export function cleanComment(body) {
  if (typeof body !== 'string') return null;
  const s = body.replace(/\r\n?/g, '\n').replace(UNSAFE_CHARS, '').replace(/\n{3,}/g, '\n\n').trim();
  return len(s) >= 1 && len(s) <= 500 ? s : null;
}

// 글 제목: 한 줄, 1–80자
export function cleanTitle(title) {
  if (typeof title !== 'string') return null;
  const s = title.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim();
  return len(s) >= 1 && len(s) <= 80 ? s : null;
}

// 티어표 state 형식 검사 → { state } (알려진 필드만 남긴 사본) | { reason }
export function normalizeState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return { reason: 'state' };
  if (typeof s.title !== 'string' || len(s.title) > 80) return { reason: 'state.title' };
  if (!Array.isArray(s.tiers) || s.tiers.length < 1 || s.tiers.length > 20) return { reason: 'state.tiers' };
  const tiers = [];
  for (const t of s.tiers) {
    if (!t || typeof t !== 'object') return { reason: 'state.tiers' };
    if (typeof t.label !== 'string' || len(t.label) > 40) return { reason: 'state.label' };
    if (typeof t.color !== 'string' || !COLOR_RE.test(t.color)) return { reason: 'state.color' };
    if (!Array.isArray(t.items) || !t.items.every(id => typeof id === 'string' && ITEM_ID_RE.test(id))) return { reason: 'state.items' };
    tiers.push({ label: t.label, color: t.color, items: t.items });
  }
  if (s.updatedAt !== undefined && !Number.isFinite(s.updatedAt)) return { reason: 'state.updatedAt' };
  const state = { title: s.title, tiers, updatedAt: s.updatedAt ?? 0 };
  if (new TextEncoder().encode(JSON.stringify(state)).length > MAX_STATE_BYTES) return { reason: 'state.size' };
  return { state };
}

// 밸런스 투표 글의 state 검사: 정확히 nerf/fair/buff 3줄(정해진 색), 항목은 겹치지 않고 그 카테고리에 있는 것.
// normalizeState 를 통과한 state 를 받는다. → { state } | { reason }
export function normalizeBalanceState(state, category, keys) {
  if (state.tiers.length !== BALANCE_ROWS.length) return { reason: 'state.tiers' };
  const seen = new Set();
  for (let i = 0; i < BALANCE_ROWS.length; i++) {
    const t = state.tiers[i];
    if (t.label !== BALANCE_ROWS[i].label) return { reason: 'state.label' };
    if (t.color.toLowerCase() !== BALANCE_ROWS[i].color) return { reason: 'state.color' };
    for (const id of t.items) {
      if (seen.has(id) || !keys.has(`${category}/${id}`)) return { reason: 'state.items' };
      seen.add(id);
    }
  }
  return { state: { ...state, tiers: state.tiers.map((t, i) => ({ ...t, color: BALANCE_ROWS[i].color })) } };
}

// 구글 이름 앞부분으로 처음 이름을 정한다. 너무 짧으면 무작위 이름.
function initialName(payload) {
  const raw = typeof payload.name === 'string' ? payload.name : '';
  const s = raw.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim();
  const cut = [...s].slice(0, 20).join('').trim();
  return len(cut) >= 2 ? cut : `player-${randomHex(2)}`;
}

function cleanPicture(url) {
  return typeof url === 'string' && url.length <= 500 && /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
}

function parseState(text) {
  try { return JSON.parse(text); } catch { return null; }
}

// ---------- 로그인·내 정보 ----------

async function login(c) {
  const { env } = c;
  if (!env.GOOGLE_CLIENT_ID) return c.send({ error: 'login_disabled' }, 503);
  if (await limited(c, 'login')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  if (typeof body.credential !== 'string') return bad(c, 'credential');

  const result = await verifyGoogleIdToken(body.credential, { clientId: env.GOOGLE_CLIENT_ID, getKey: keyResolverFor(env, c.url) });
  if (!result.ok) return c.send({ error: 'auth', reason: result.reason }, 401);
  const p = result.payload;
  const now = Date.now();

  // 처음이면 만들고, 있으면 사진만 새로 (이름은 본인이 바꿨을 수 있어 그대로 둔다)
  const row = await env.DB.prepare(
    `INSERT INTO users (id, google_sub, name, picture, created) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (google_sub) DO UPDATE SET picture = excluded.picture
     RETURNING id, google_sub, name, picture`
  ).bind(randomHex(16), p.sub, initialName(p), cleanPicture(p.picture), now).first();

  // 이 브라우저의 익명 표를 계정으로 옮긴다. 계정에 이미 있는 항목은 계정 표를 남긴다.
  if (isAnonVoter(body.voter)) {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT OR IGNORE INTO balance_votes (item, voter, ip_hash, v, ts)
         SELECT item, ?1, ip_hash, v, ts FROM balance_votes WHERE voter = ?2`
      ).bind(`u_${row.id}`, body.voter),
      env.DB.prepare('DELETE FROM balance_votes WHERE voter = ?1').bind(body.voter),
    ]);
  }

  const token = await createSession(env, row.id, now);
  return c.send({ token, user: publicUser(row, env) });
}

async function logout(c) {
  const token = bearerToken(c.request);
  if (token) await deleteSession(c.env, token);
  return c.send({ ok: true });
}

async function getMe(c) {
  const { env, user } = c;
  const [votes, tiers] = await env.DB.batch([
    env.DB.prepare('SELECT item, v FROM balance_votes WHERE voter = ?1').bind(`u_${user.id}`),
    env.DB.prepare('SELECT template, state, updated_at FROM user_tiers WHERE user_id = ?1').bind(user.id),
  ]);
  const out = { user, votes: {}, tiers: {} };
  for (const r of votes.results) if (VOTE_NAMES[r.v]) out.votes[r.item] = VOTE_NAMES[r.v];
  for (const r of tiers.results) out.tiers[r.template] = { state: parseState(r.state), updatedAt: r.updated_at };
  return c.send(out);
}

async function patchMe(c) {
  if (await limited(c, 'profile')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  const name = cleanName(body.name);
  if (!name) return bad(c, 'name');
  await c.env.DB.prepare('UPDATE users SET name = ?1 WHERE id = ?2').bind(name, c.user.id).run();
  return c.send({ user: { ...c.user, name } });
}

async function putTier(c, template) {
  const { env, user } = c;
  if (!isTemplateId(template, c.keys)) return bad(c, 'template');
  if (await limited(c, 'tiers')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, MAX_BODY_BYTES);
  if (res) return res;
  const updatedAt = Date.now();
  const { state, reason } = normalizeState(body.state);
  if (!state) return reason === 'state.size' ? c.send({ error: 'too_large' }, 413) : bad(c, reason);
  state.updatedAt = updatedAt; // 기기 사이 비교는 서버 시각으로

  const count = await env.DB.prepare(
    `SELECT COUNT(*) AS n, SUM(template = ?2) AS mine FROM user_tiers WHERE user_id = ?1`
  ).bind(user.id, template).first();
  if (!count.mine && count.n >= MAX_USER_TIERS) return bad(c, 'too_many_tiers');

  await env.DB.prepare(
    `INSERT INTO user_tiers (user_id, template, state, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (user_id, template) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`
  ).bind(user.id, template, JSON.stringify(state), updatedAt).run();
  return c.send({ ok: true, updatedAt });
}

async function deleteTier(c, template) {
  if (!isTemplateId(template, c.keys)) return bad(c, 'template');
  await c.env.DB.prepare('DELETE FROM user_tiers WHERE user_id = ?1 AND template = ?2').bind(c.user.id, template).run();
  return c.send({ ok: true });
}

// ---------- 갤러리 ----------

const POST_COLUMNS = `p.id, p.user_id, p.kind, p.template, p.title, p.state, p.created, p.likes, p.dislikes, p.comments, p.hidden,
  u.name AS a_name, u.picture AS a_picture`;

function postOut(r) {
  return {
    id: r.id,
    kind: r.kind || 'tier',
    template: r.template,
    title: r.title,
    state: parseState(r.state),
    author: { id: r.user_id, name: r.a_name, picture: r.a_picture || null },
    created: r.created,
    likes: r.likes,
    dislikes: r.dislikes,
    comments: r.comments,
    myReaction: r.my || 0,
    hidden: Boolean(r.hidden),
  };
}

// 숨겨진 글·댓글은 작성자와 관리자에게만 보인다
const canSee = (row, user) => !row.hidden || (user && (user.admin || user.id === row.user_id));
const canModify = (row, user) => user.admin || user.id === row.user_id;

async function findPost(c, id) {
  if (!ID_RE.test(id)) return null;
  const me = c.user?.id ?? '';
  const row = await c.env.DB.prepare(
    `SELECT ${POST_COLUMNS}, COALESCE(r.v, 0) AS my FROM posts p JOIN users u ON u.id = p.user_id
     LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = ?2 WHERE p.id = ?1`
  ).bind(id, me).first();
  return row && canSee(row, c.user) ? row : null;
}

async function createPost(c) {
  const { env, user } = c;
  if (await limited(c, 'post')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, MAX_BODY_BYTES);
  if (res) return res;
  const kind = body.kind ?? 'tier';
  if (!POST_KINDS.includes(kind)) return bad(c, 'kind');
  if (!isTemplateId(body.template, c.keys)) return bad(c, 'template');
  const title = cleanTitle(body.title);
  if (!title) return bad(c, 'title');
  let { state, reason } = normalizeState(body.state);
  if (state && kind === 'balance') ({ state, reason } = normalizeBalanceState(state, body.template.split('.')[0], c.keys));
  if (!state) return reason === 'state.size' ? c.send({ error: 'too_large' }, 413) : bad(c, reason);
  if (!state.tiers.some(t => t.items.length)) return bad(c, 'empty');

  const now = Date.now();
  const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM posts WHERE user_id = ?1 AND created > ?2')
    .bind(user.id, now - 86400000).first();
  if (today.n >= POSTS_PER_DAY) return c.send({ error: 'rate_limited', reason: 'daily' }, 429);

  const id = randomHex(12);
  state.updatedAt = now;
  await env.DB.prepare(
    `INSERT INTO posts (id, user_id, kind, template, title, state, created) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(id, user.id, kind, body.template, title, JSON.stringify(state), now).run();
  return c.send({
    post: {
      id, kind, template: body.template, title, state, author: { id: user.id, name: user.name, picture: user.picture },
      created: now, likes: 0, dislikes: 0, comments: 0, myReaction: 0, hidden: false,
    },
  });
}

// cursor 는 마지막 글의 정렬 키: new → 'created:id', top → 'score:created:id'
// kind 를 주지 않으면 티어표만 (kind 를 모르는 예전 화면이 밸런스 글을 티어표로 그리지 않게).
async function listPosts(c) {
  const { env, url } = c;
  c.user = await getUser(c.request, env);
  const q = url.searchParams;
  const template = q.get('template') || null;
  const author = q.get('author') || null;
  const sort = q.get('sort') || 'new';
  const cursor = q.get('cursor') || null;
  const kind = q.get('kind') || 'tier';
  if (!POST_KINDS.includes(kind)) return bad(c, 'kind');
  if (template && !isTemplateId(template, c.keys)) return bad(c, 'template');
  if (author && !USER_ID_RE.test(author)) return bad(c, 'author');
  if (sort !== 'new' && sort !== 'top') return bad(c, 'sort');

  // WHERE 는 고정된 조각만 이어 붙이고 값은 모두 bind 로 넘긴다
  const where = ['p.kind = ?'];
  const params = [c.user?.id ?? '', kind];
  if (template) { where.push('p.template = ?'); params.push(template); }
  if (author) { where.push('p.user_id = ?'); params.push(author); }
  if (!c.user?.admin) { where.push('(p.hidden = 0 OR p.user_id = ?)'); params.push(c.user?.id ?? ''); }
  if (cursor) {
    const m = sort === 'new' ? /^(\d{1,15}):([0-9a-f]{24})$/.exec(cursor) : /^(-?\d{1,9}):(\d{1,15}):([0-9a-f]{24})$/.exec(cursor);
    if (!m) return bad(c, 'cursor');
    if (sort === 'new') {
      where.push('(p.created < ? OR (p.created = ? AND p.id < ?))');
      params.push(Number(m[1]), Number(m[1]), m[2]);
    } else {
      where.push('(p.likes - p.dislikes < ? OR (p.likes - p.dislikes = ? AND (p.created < ? OR (p.created = ? AND p.id < ?))))');
      params.push(Number(m[1]), Number(m[1]), Number(m[2]), Number(m[2]), m[3]);
    }
  }
  const order = sort === 'new' ? 'p.created DESC, p.id DESC' : '(p.likes - p.dislikes) DESC, p.created DESC, p.id DESC';
  const { results } = await env.DB.prepare(
    `SELECT ${POST_COLUMNS}, COALESCE(r.v, 0) AS my FROM posts p JOIN users u ON u.id = p.user_id
     LEFT JOIN reactions r ON r.post_id = p.id AND r.user_id = ?
     WHERE ${where.join(' AND ')}
     ORDER BY ${order} LIMIT ${PAGE_SIZE + 1}`
  ).bind(...params).all();

  const rows = results.slice(0, PAGE_SIZE);
  let next = null;
  if (results.length > PAGE_SIZE) {
    const last = rows[rows.length - 1];
    next = sort === 'new' ? `${last.created}:${last.id}` : `${last.likes - last.dislikes}:${last.created}:${last.id}`;
  }
  return c.send({ posts: rows.map(postOut), next });
}

async function getPost(c, id) {
  c.user = await getUser(c.request, c.env);
  const row = await findPost(c, id);
  return row ? c.send({ post: postOut(row) }) : notFound(c);
}

async function deletePost(c, id) {
  const { env } = c;
  const row = await findPost(c, id);
  if (!row) return notFound(c);
  if (!canModify(row, c.user)) return c.send({ error: 'forbidden' }, 403);
  const target = `post:${id}`;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE target = ?1)').bind(target),
    env.DB.prepare(`DELETE FROM reports WHERE kind = 'comment' AND target_id IN (SELECT id FROM comments WHERE target = ?1)`).bind(target),
    env.DB.prepare('DELETE FROM comments WHERE target = ?1').bind(target),
    env.DB.prepare('DELETE FROM reactions WHERE post_id = ?1').bind(id),
    env.DB.prepare(`DELETE FROM reports WHERE kind = 'post' AND target_id = ?1`).bind(id),
    env.DB.prepare('DELETE FROM posts WHERE id = ?1').bind(id),
  ]);
  return c.send({ ok: true });
}

async function reactPost(c, id) {
  const { env, user } = c;
  if (await limited(c, 'react')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  const v = body.v;
  if (v !== 1 && v !== -1 && v !== 0) return bad(c, 'v');
  if (!(await findPost(c, id))) return notFound(c);

  // 수는 reactions 에서 다시 세어 어긋나지 않게 한다
  const [, counted] = await env.DB.batch([
    v === 0
      ? env.DB.prepare('DELETE FROM reactions WHERE post_id = ?1 AND user_id = ?2').bind(id, user.id)
      : env.DB.prepare(
        `INSERT INTO reactions (post_id, user_id, v) VALUES (?1, ?2, ?3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET v = excluded.v`
      ).bind(id, user.id, v),
    env.DB.prepare(
      `UPDATE posts SET likes = (SELECT COUNT(*) FROM reactions WHERE post_id = ?1 AND v = 1),
         dislikes = (SELECT COUNT(*) FROM reactions WHERE post_id = ?1 AND v = -1)
       WHERE id = ?1 RETURNING likes, dislikes`
    ).bind(id),
  ]);
  const { likes, dislikes } = counted.results[0];
  return c.send({ likes, dislikes, myReaction: v });
}

// ---------- 댓글 ----------

// 댓글 수 = 지워지지도 숨겨지지도 않은 댓글. 수를 들고 있는 대상(글·사용자 월드컵)이면 다시 세는 문장, 아니면 null.
const COUNTED_TARGETS = { post: 'posts', cup: 'cups' };
function recountComments(env, target) {
  const i = target.indexOf(':');
  const table = COUNTED_TARGETS[target.slice(0, i)];
  if (!table) return null;
  return env.DB.prepare(
    `UPDATE ${table} SET comments = (SELECT COUNT(*) FROM comments WHERE target = ?2 AND deleted = 0 AND hidden = 0) WHERE id = ?1`
  ).bind(target.slice(i + 1), target);
}

function commentOut(r, user) {
  return {
    id: r.id,
    body: r.body,
    author: { id: r.user_id, name: r.a_name, picture: r.a_picture || null },
    created: r.created,
    likes: r.likes,
    myLike: Boolean(r.my_like),
    mine: Boolean(user && user.id === r.user_id),
    vote: VOTE_NAMES[r.vote] ?? null,
    hidden: Boolean(r.hidden),
  };
}

// item 이 있으면 작성자가 그 항목에 낸 밸런스 표(vote)를 같이 읽는다. cups.js 도 쓴다.
export async function listComments(c, target, { item = null, order }) {
  const me = c.user?.id ?? '';
  const visible = c.user?.admin ? '' : 'AND (c.hidden = 0 OR c.user_id = ?3)';
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.body, c.user_id, c.created, c.likes, c.hidden, u.name AS a_name, u.picture AS a_picture,
       EXISTS (SELECT 1 FROM comment_likes l WHERE l.comment_id = c.id AND l.user_id = ?3) AS my_like,
       ${item ? 'bv.v' : 'NULL'} AS vote
     FROM comments c JOIN users u ON u.id = c.user_id
     ${item ? `LEFT JOIN balance_votes bv ON bv.item = ?2 AND bv.voter = 'u_' || c.user_id` : ''}
     WHERE c.target = ?1 AND c.deleted = 0 ${visible}
     ORDER BY ${order} LIMIT ${MAX_COMMENTS}`
  ).bind(target, item ?? '', me).all();
  return c.send({ comments: results.map(r => commentOut(r, c.user)) });
}

export async function addComment(c, target, item = null) {
  const { env, user } = c;
  if (await limited(c, 'comment')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  const text = cleanComment(body.body);
  if (!text) return bad(c, 'body');

  const id = randomHex(12);
  const now = Date.now();
  const stmts = [
    env.DB.prepare('INSERT INTO comments (id, target, user_id, body, created) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(id, target, user.id, text, now),
  ];
  const recount = recountComments(env, target);
  if (recount) stmts.push(recount);
  await env.DB.batch(stmts);

  let vote = null;
  if (item) {
    const row = await env.DB.prepare('SELECT v FROM balance_votes WHERE item = ?1 AND voter = ?2').bind(item, `u_${user.id}`).first();
    vote = row?.v ?? null;
  }
  const row = { id, body: text, user_id: user.id, a_name: user.name, a_picture: user.picture, created: now, likes: 0, my_like: 0, vote, hidden: 0 };
  return c.send({ comment: commentOut(row, user) });
}

async function listPostComments(c, id) {
  c.user = await getUser(c.request, c.env);
  if (!(await findPost(c, id))) return notFound(c);
  return listComments(c, `post:${id}`, { order: 'c.created ASC, c.rowid ASC' });
}

async function addPostComment(c, id) {
  if (!(await findPost(c, id))) return notFound(c);
  return addComment(c, `post:${id}`);
}

function itemKey(c, category, id) {
  const key = `${category}/${id}`;
  return c.keys.has(key) ? key : null;
}

async function listItemComments(c, category, id) {
  c.user = await getUser(c.request, c.env);
  const item = itemKey(c, category, id);
  if (!item) return notFound(c);
  const sort = c.url.searchParams.get('sort') || 'new';
  if (sort !== 'new' && sort !== 'top') return bad(c, 'sort');
  const order = sort === 'top' ? 'c.likes DESC, c.created DESC, c.rowid DESC' : 'c.created DESC, c.rowid DESC';
  return listComments(c, `item:${item}`, { item, order });
}

async function addItemComment(c, category, id) {
  const item = itemKey(c, category, id);
  if (!item) return notFound(c);
  return addComment(c, `item:${item}`, item);
}

async function findComment(c, id) {
  if (!ID_RE.test(id)) return null;
  const row = await c.env.DB.prepare('SELECT id, target, user_id, hidden FROM comments WHERE id = ?1 AND deleted = 0').bind(id).first();
  return row && canSee(row, c.user) ? row : null;
}

async function deleteComment(c, id) {
  const { env } = c;
  const row = await findComment(c, id);
  if (!row) return notFound(c);
  if (!canModify(row, c.user)) return c.send({ error: 'forbidden' }, 403);
  const stmts = [env.DB.prepare(`UPDATE comments SET body = '', deleted = 1 WHERE id = ?1`).bind(id)];
  const recount = recountComments(env, row.target);
  if (recount) stmts.push(recount);
  await env.DB.batch(stmts);
  return c.send({ ok: true });
}

async function likeComment(c, id) {
  const { env, user } = c;
  if (await limited(c, 'like')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  if (typeof body.on !== 'boolean') return bad(c, 'on');
  if (!(await findComment(c, id))) return notFound(c);

  const [, counted] = await env.DB.batch([
    body.on
      ? env.DB.prepare('INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?1, ?2)').bind(id, user.id)
      : env.DB.prepare('DELETE FROM comment_likes WHERE comment_id = ?1 AND user_id = ?2').bind(id, user.id),
    env.DB.prepare(
      'UPDATE comments SET likes = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = ?1) WHERE id = ?1 RETURNING likes'
    ).bind(id),
  ]);
  return c.send({ likes: counted.results[0].likes, myLike: body.on });
}

// ---------- 신고 ----------

// 신고할 수 있는 것과 그 표. 'cup' 은 사용자 월드컵 (cups.js, 0005).
// 'image' 는 올린 이미지 (id 32자리 hex) — 3명이 신고하면 images.status = 'hidden' (moderation.js).
const REPORT_TABLES = { post: 'posts', comment: 'comments', cup: 'cups', image: 'images' };

async function findCupRow(c, id) {
  const row = await c.env.DB.prepare('SELECT id, user_id, hidden FROM cups WHERE id = ?1').bind(id).first();
  return row && canSee(row, c.user) ? row : null;
}

async function report(c) {
  const { env, user } = c;
  if (await limited(c, 'report')) return c.send({ error: 'rate_limited' }, 429);
  const { body, res } = await readBody(c, SMALL_BODY_BYTES);
  if (res) return res;
  const { kind, id } = body;
  if (!Object.hasOwn(REPORT_TABLES, kind)) return bad(c, 'kind');
  if (typeof id !== 'string' || !(kind === 'image' ? IMAGE_ID_RE : ID_RE).test(id)) return bad(c, 'id');
  let reason = null;
  if (body.reason !== undefined && body.reason !== null && body.reason !== '') {
    reason = typeof body.reason === 'string' ? body.reason.replace(UNSAFE_CHARS, '').trim() : '';
    if (!reason || len(reason) > 200) return bad(c, 'reason');
  }

  if (kind === 'image') {
    const r = await reportImage(env, { id, userId: user.id, reason, origin: c.url.origin });
    return r.error ? notFound(c) : c.send({ ok: true });
  }

  const row = kind === 'post' ? await findPost(c, id) : kind === 'cup' ? await findCupRow(c, id) : await findComment(c, id);
  if (!row) return notFound(c);

  // 신고를 넣고, 같은 대상 신고가 REPORTS_TO_HIDE 건이면 숨긴다 (한 batch 라 동시에 와도 수가 맞다)
  const table = REPORT_TABLES[kind];
  const stmts = [
    env.DB.prepare('INSERT OR IGNORE INTO reports (kind, target_id, user_id, reason, created) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(kind, id, user.id, reason, Date.now()),
    env.DB.prepare(
      `UPDATE ${table} SET hidden = 1 WHERE id = ?1 AND hidden = 0
       AND (SELECT COUNT(*) FROM reports WHERE kind = ?2 AND target_id = ?1) >= ?3`
    ).bind(id, kind, REPORTS_TO_HIDE),
  ];
  const recount = kind === 'comment' && recountComments(env, row.target);
  if (recount) stmts.push(recount);
  await env.DB.batch(stmts);
  return c.send({ ok: true });
}
