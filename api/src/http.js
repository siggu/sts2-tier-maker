// 여러 모듈이 같이 쓰는 HTTP 도우미: JSON 응답, CORS, 해시, 요청 속도 제한.

export function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export function ipHashOf(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return sha256(`${env.IP_SALT || 'sts2-balance'}:${ip}`);
}

// 1분 단위 요청 수 제한. 넘으면 true. bucket 으로 기능마다 따로 센다.
export async function rateLimited(env, ipHash, limit, bucket = '') {
  const minute = Math.floor(Date.now() / 60000);
  const key = bucket ? `${bucket}:${ipHash}` : ipHash;
  const rl = await env.DB.prepare(
    `INSERT INTO rate_limit (ip_hash, minute, n) VALUES (?1, ?2, 1)
     ON CONFLICT (ip_hash, minute) DO UPDATE SET n = n + 1 RETURNING n`
  ).bind(key, minute).first();
  return Boolean(rl && rl.n > limit);
}

export async function readJson(request) {
  try { return await request.json(); } catch { return undefined; }
}
