// 관리자: 올린 이미지 검토 (검토 대기·신고됨·숨김·차단 목록, 승인·숨김·차단, 상태와 관계없이 이미지 보기).
// 관리자 = ADMIN_SUBS(구글 sub) 또는 ADMIN_USERS(users.id) 에 있는 사람 (auth.js).
// 처리하는 경로면 Response, 아니면 null 을 돌려준다.
import { json } from './http.js';
import { getUser } from './auth.js';
import { reviewImage, REVIEW_ACTIONS } from './moderation.js';

const PAGE_SIZE = 60;
const USER_RE = /^[0-9a-f]{32}$/;
const PURPOSES = ['cup', 'avatar'];
const IMAGE_ID_RE = /^[0-9a-f]{32}$/;
const MAX_CUPS_PER_IMAGE = 5;

// 목록 종류 → WHERE 조각. all = 상태와 관계없이 최근 순. reported = 아직 보이는(ok·pending) 이미지 가운데 신고가 있는 것.
const FILTERS = {
  all: '1 = 1',
  pending: `i.status = 'pending'`,
  reported: `i.status IN ('ok', 'pending') AND i.reports > 0`,
  hidden: `i.status = 'hidden'`,
  blocked: `i.status = 'blocked'`,
};

const ROUTES = [
  ['GET', /^\/admin\/images$/, listImages],
  ['GET', /^\/admin\/uploaders$/, listUploaders],
  ['POST', /^\/admin\/images\/([^/]+)$/, review],
  ['GET', /^\/admin\/img\/([^/]+)$/, adminImage],
];

export async function handleAdmin(request, env, ctx, { url, cors }) {
  let matched = false;
  for (const [method, re, handler] of ROUTES) {
    const m = re.exec(url.pathname);
    if (!m) continue;
    matched = true;
    if (method !== request.method) continue;
    const c = { request, env, ctx, url, cors, send: (body, status = 200) => json(body, status, cors) };
    c.user = await getUser(request, env);
    if (!c.user) return c.send({ error: 'auth' }, 401);
    if (!c.user.admin) return c.send({ error: 'forbidden' }, 403);
    return handler(c, ...m.slice(1));
  }
  return matched ? json({ error: 'method_not_allowed' }, 405, cors) : null;
}

const bad = (c, reason) => c.send({ error: 'bad_request', reason }, 400);
const notFound = c => c.send({ error: 'not_found' }, 404);

function imageOut(r, cups = []) {
  return {
    id: r.id,
    status: r.status,
    reports: r.reports,
    ai: r.ai ?? null,
    type: r.type,
    size: r.size,
    purpose: r.purpose,
    created: r.created,
    user: { id: r.user_id, name: r.u_name ?? null },
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    cups,
  };
}

// 이미지를 쓰는 월드컵 (표지·항목), 이미지마다 최대 5개
async function cupsUsing(env, ids) {
  const out = new Map(ids.map(id => [id, []]));
  if (!ids.length) return out;
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT substr(u.ref, 5) AS image, k.id, k.title FROM (
       SELECT img AS ref, cup_id FROM cup_items WHERE img IN (SELECT 'img:' || value FROM json_each(?1))
       UNION SELECT cover AS ref, id AS cup_id FROM cups WHERE cover IN (SELECT 'img:' || value FROM json_each(?1))
     ) u JOIN cups k ON k.id = u.cup_id ORDER BY k.created DESC`
  ).bind(JSON.stringify(ids)).all();
  for (const r of results) {
    const list = out.get(r.image);
    if (list && list.length < MAX_CUPS_PER_IMAGE) list.push({ id: r.id, title: r.title });
  }
  return out;
}

const SELECT = `SELECT i.id, i.user_id, i.type, i.size, i.created, i.status, i.reports, i.ai, i.purpose, i.reviewed_by, i.reviewed_at,
    u.name AS u_name
  FROM images i LEFT JOIN users u ON u.id = i.user_id`;

// 기간·사용자·용도 조건 → { where: [...], params: [...] } | { reason }. params 자리표시자는 ?1 부터.
function scopeOf(q) {
  const where = [];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `?${params.length}`)); };
  for (const [key, op] of [['from', '>='], ['to', '<']]) {
    const v = q.get(key);
    if (v === null || v === '') continue;
    if (!/^\d{1,15}$/.test(v)) return { reason: key };
    add(`i.created ${op} ?`, Number(v));
  }
  const user = q.get('user');
  if (user) {
    if (!USER_RE.test(user)) return { reason: 'user' };
    add('i.user_id = ?', user);
  }
  const purpose = q.get('purpose');
  if (purpose) {
    if (!PURPOSES.includes(purpose)) return { reason: 'purpose' };
    add('i.purpose = ?', purpose);
  }
  return { where, params };
}

// GET /admin/images?status=all|pending|reported|hidden|blocked&from=&to=&user=&purpose=&cursor=created:id
// → { images, next, counts? } (최신순 60개씩). counts = 같은 기간·사용자·용도 안에서 상태별 수 (첫 쪽에만).
async function listImages(c) {
  const q = c.url.searchParams;
  const status = q.get('status') || 'all';
  if (!Object.hasOwn(FILTERS, status)) return bad(c, 'status');
  const scope = scopeOf(q);
  if (scope.reason) return bad(c, scope.reason);
  const params = [...scope.params];
  const where = [FILTERS[status], ...scope.where];
  const cursor = q.get('cursor');
  if (cursor) {
    const m = /^(\d{1,15}):([0-9a-f]{32})$/.exec(cursor);
    if (!m) return bad(c, 'cursor');
    params.push(Number(m[1]), m[2]);
    where.push(`(i.created, i.id) < (?${params.length - 1}, ?${params.length})`);
  }
  const { results } = await c.env.DB.prepare(
    `${SELECT} WHERE ${where.join(' AND ')}
     ORDER BY i.created DESC, i.id DESC LIMIT ${PAGE_SIZE + 1}`
  ).bind(...params).all();
  const rows = results.slice(0, PAGE_SIZE);
  const next = results.length > PAGE_SIZE ? `${rows[rows.length - 1].created}:${rows[rows.length - 1].id}` : null;
  const cups = await cupsUsing(c.env, rows.map(r => r.id));
  const out = { images: rows.map(r => imageOut(r, cups.get(r.id))), next };
  if (!cursor) {
    const scopeSql = scope.where.length ? `WHERE ${scope.where.join(' AND ')}` : '';
    const n = await c.env.DB.prepare(
      `SELECT COUNT(*) AS all_n,
         COALESCE(SUM(${FILTERS.pending}), 0) AS pending, COALESCE(SUM(${FILTERS.reported}), 0) AS reported,
         COALESCE(SUM(${FILTERS.hidden}), 0) AS hidden, COALESCE(SUM(${FILTERS.blocked}), 0) AS blocked
       FROM images i ${scopeSql}`
    ).bind(...scope.params).first();
    out.counts = { all: n.all_n, pending: n.pending, reported: n.reported, hidden: n.hidden, blocked: n.blocked };
    if (q.get('user')) {
      const u = await c.env.DB.prepare('SELECT id, name FROM users WHERE id = ?1').bind(q.get('user')).first();
      out.user = u ? { id: u.id, name: u.name } : { id: q.get('user'), name: null };
    }
  }
  return c.send(out);
}

// GET /admin/uploaders?q=이름 → { users: [{ id, name, images, last }] } — 이미지를 올린 사람을 이름으로 찾기 (최근에 올린 순 10명)
async function listUploaders(c) {
  const name = String(c.url.searchParams.get('q') || '').trim().slice(0, 40);
  const like = `%${name.replace(/[\\%_]/g, ch => `\\${ch}`)}%`;
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.name, COUNT(*) AS images, MAX(i.created) AS last
     FROM images i JOIN users u ON u.id = i.user_id
     WHERE u.name LIKE ?1 ESCAPE '\\' OR u.id = ?2
     GROUP BY u.id ORDER BY last DESC LIMIT 10`
  ).bind(like, name).all();
  return c.send({ users: results.map(r => ({ id: r.id, name: r.name, images: r.images, last: r.last })) });
}

// POST /admin/images/:id { action: 'approve' | 'hide' | 'block' } → { image }
async function review(c, id) {
  if (!IMAGE_ID_RE.test(id)) return notFound(c);
  let body;
  try { body = await c.request.json(); } catch { return bad(c, 'json'); }
  if (!body || !REVIEW_ACTIONS.includes(body.action)) return bad(c, 'action');
  if (!(await reviewImage(c.env, { id, action: body.action, adminId: c.user.id, origin: c.url.origin }))) return notFound(c);
  const row = await c.env.DB.prepare(`${SELECT} WHERE i.id = ?1`).bind(id).first();
  const cups = await cupsUsing(c.env, [id]);
  return c.send({ image: imageOut(row, cups.get(id)) });
}

// GET /admin/img/:id — 상태와 관계없이 바이트를 보낸다. 캐시하지 않는다.
// (관리자 화면은 Authorization 헤더를 붙여 fetch 하고 blob 주소로 그린다)
async function adminImage(c, id) {
  if (!IMAGE_ID_RE.test(id)) return notFound(c);
  const row = await c.env.DB.prepare('SELECT type, bytes FROM images WHERE id = ?1').bind(id).first();
  if (!row) return notFound(c);
  const bytes = row.bytes instanceof Uint8Array ? row.bytes : new Uint8Array(row.bytes);
  return new Response(bytes, {
    status: 200,
    headers: {
      ...c.cors,
      'Content-Type': row.type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
