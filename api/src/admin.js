// 관리자: 올린 이미지 검토 (검토 대기·신고됨·숨김·차단 목록, 승인·숨김·차단, 상태와 관계없이 이미지 보기).
// 관리자 = ADMIN_SUBS(구글 sub) 또는 ADMIN_USERS(users.id) 에 있는 사람 (auth.js).
// 처리하는 경로면 Response, 아니면 null 을 돌려준다.
import { json } from './http.js';
import { getUser } from './auth.js';
import { reviewImage, REVIEW_ACTIONS } from './moderation.js';

const PAGE_SIZE = 30;
const IMAGE_ID_RE = /^[0-9a-f]{32}$/;
const MAX_CUPS_PER_IMAGE = 5;

// 목록 종류 → WHERE 조각. reported = 아직 보이는(ok·pending) 이미지 가운데 신고가 있는 것.
const FILTERS = {
  pending: `i.status = 'pending'`,
  reported: `i.status IN ('ok', 'pending') AND i.reports > 0`,
  hidden: `i.status = 'hidden'`,
  blocked: `i.status = 'blocked'`,
};

const ROUTES = [
  ['GET', /^\/admin\/images$/, listImages],
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

// GET /admin/images?status=pending|reported|hidden|blocked&cursor=created:id → { images, next } (최신순, 30개씩)
async function listImages(c) {
  const q = c.url.searchParams;
  const status = q.get('status') || 'pending';
  if (!Object.hasOwn(FILTERS, status)) return bad(c, 'status');
  const params = [];
  const where = [FILTERS[status]];
  const cursor = q.get('cursor');
  if (cursor) {
    const m = /^(\d{1,15}):([0-9a-f]{32})$/.exec(cursor);
    if (!m) return bad(c, 'cursor');
    params.push(Number(m[1]), m[2]);
    where.push('(i.created, i.id) < (?1, ?2)');
  }
  const { results } = await c.env.DB.prepare(
    `${SELECT} WHERE ${where.join(' AND ')}
     ORDER BY i.created DESC, i.id DESC LIMIT ${PAGE_SIZE + 1}`
  ).bind(...params).all();
  const rows = results.slice(0, PAGE_SIZE);
  const next = results.length > PAGE_SIZE ? `${rows[rows.length - 1].created}:${rows[rows.length - 1].id}` : null;
  const cups = await cupsUsing(c.env, rows.map(r => r.id));
  return c.send({ images: rows.map(r => imageOut(r, cups.get(r.id))), next });
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
