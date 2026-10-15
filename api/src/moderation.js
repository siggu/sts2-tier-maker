// 이미지 검열: 정리(image.js) → 차단 목록 → Workers AI 판정 → 저장. 신고·관리자 검토로 상태 바꾸기.
// 사용자 월드컵 그림(cups.js)이 쓰고, 나중에 프로필 사진도 storeModeratedImage 를 그대로 쓴다.
import { inspectImage, imageId, sniffType } from './image.js';

export const MODERATION_TIMEOUT_MS = 8000;
export const REPORTS_TO_HIDE_IMAGE = 3;
export const IMAGE_STATUSES = ['ok', 'pending', 'hidden', 'blocked'];
// /img/:id 로 보내는 상태 (pending 은 보이되 관리자 검토 목록에 뜬다)
export const VISIBLE_STATUSES = ['ok', 'pending'];
export const DEFAULT_MODERATION_MODELS = '@cf/meta/llama-3.2-11b-vision-instruct,@cf/llava-hf/llava-1.5-7b-hf';

const PROMPT = 'You are an image moderator for a Slay the Spire 2 fan site that teenagers use. '
  + 'Answer UNSAFE if the image contains any of: nudity or sexual content, gore or graphic violence (real or realistic blood, injuries, corpses), '
  + 'hate symbols or extremist imagery, illegal drug use, self-harm, or shocking/disgusting content. '
  + 'Fantasy game art, cartoon monsters, card art, memes and mild cartoon fighting are SAFE. '
  + 'Reply with exactly one word: SAFE or UNSAFE.';

export function moderationModels(env) {
  return String(env.MODERATION_MODELS || DEFAULT_MODERATION_MODELS).split(',').map(s => s.trim()).filter(Boolean);
}

const shortModel = m => m.split('/').pop();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const errText = err => clip(String(err?.message || err).replace(/\s+/g, ' '), 80);

// 모델 하나에 묻기 → 'SAFE' | 'UNSAFE'. 답이 둘 다 아니면 오류 (다음 모델로).
// 라마 3.2 비전 모델은 처음 한 번 라이선스 동의('agree')가 필요하다 — 여기서 대신 보내지 않는다 (오류 → 다음 모델).
async function askModel(ai, model, bytes) {
  const image = [...bytes];
  const input = /llava/i.test(model)
    ? { image, prompt: PROMPT, max_tokens: 8 }
    : { messages: [{ role: 'user', content: PROMPT }], image, max_tokens: 8, temperature: 0 };
  const out = await ai.run(model, input);
  const text = String(out?.response ?? out?.description ?? (typeof out === 'string' ? out : '')).toUpperCase();
  if (/\bUNSAFE\b|\bNOT\s+SAFE\b/.test(text)) return 'UNSAFE';
  if (/\bSAFE\b/.test(text)) return 'SAFE';
  throw new Error(`answer: ${clip(text.trim(), 30) || '(empty)'}`);
}

// 모델을 차례로 물어 처음 받은 답을 쓴다. 전체 시간 제한(timeoutMs).
// → { verdict: 'safe' | 'unsafe' | null, note } — null 이면 판정 없음(AI 없음·모두 오류·시간 초과), note 는 images.ai 에 남길 짧은 글.
export async function classifyImage(env, bytes, { timeoutMs = MODERATION_TIMEOUT_MS } = {}) {
  if (!env.AI || typeof env.AI.run !== 'function') return { verdict: null, note: 'no-ai' };
  const errors = [];
  let done = false;
  const attempt = (async () => {
    for (const model of moderationModels(env)) {
      if (done) break;
      try {
        const answer = await askModel(env.AI, model, bytes);
        return { verdict: answer.toLowerCase(), note: `${shortModel(model)}: ${answer}` };
      } catch (err) {
        errors.push(`${shortModel(model)}: ${errText(err)}`);
        console.warn('moderation', model, err?.message || err);
      }
    }
    return { verdict: null, note: errors.join(' / ') || 'no-model' };
  })();
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve({ verdict: null, note: ['timeout', ...errors].join(' / ') }), timeoutMs);
  });
  try {
    const r = await Promise.race([attempt, timeout]);
    return { ...r, note: clip(r.note, 300) };
  } finally {
    done = true;
    clearTimeout(timer);
  }
}

export async function isBlocked(env, hash) {
  return Boolean(await env.DB.prepare('SELECT 1 AS b FROM image_blocklist WHERE hash = ?1').bind(hash).first());
}

// 이미지를 검사·정리하고 검열을 거쳐 저장한다.
//   type: Content-Type 에서 고른 형식 (없으면 파일 앞부분으로 알아낸다)
//   dailyLimit: 한 사람이 하루에 새로 올릴 수 있는 수 (AI 를 부르기 전에 센다)
// → { id, status: 'ok' | 'pending' }
//   | { error: 'bad_request', reason: 'image' | 'animated' | 'dimensions' }
//   | { error: 'blocked' }                       (차단 목록, 숨김·차단된 이미지, AI 가 UNSAFE)
//   | { error: 'rate_limited', reason: 'daily' }
export async function storeModeratedImage(env, bytes, { userId, purpose = 'cup', type = null, dailyLimit = Infinity, timeoutMs, now = Date.now() } = {}) {
  const info = inspectImage(bytes, type || sniffType(bytes));
  if (!info.ok) return { error: 'bad_request', reason: info.reason };
  const id = await imageId(info.bytes);
  if (await isBlocked(env, id)) return { error: 'blocked' };

  // 같은 그림이 이미 있으면 그대로 (하루 제한에도 세지 않고 AI 도 다시 부르지 않는다)
  const known = await env.DB.prepare('SELECT status FROM images WHERE id = ?1').bind(id).first();
  if (known) return VISIBLE_STATUSES.includes(known.status) ? { id, status: known.status } : { error: 'blocked' };

  if (Number.isFinite(dailyLimit)) {
    const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM images WHERE user_id = ?1 AND created > ?2')
      .bind(userId, now - 86400000).first();
    if (today.n >= dailyLimit) return { error: 'rate_limited', reason: 'daily' };
  }

  const { verdict, note } = await classifyImage(env, info.bytes, { timeoutMs });
  if (verdict === 'unsafe') {
    // 바이트는 저장하지 않고 해시만 남긴다
    await env.DB.prepare('INSERT OR IGNORE INTO image_blocklist (hash, created, reason) VALUES (?1, ?2, ?3)')
      .bind(id, now, clip(`ai ${note}`, 200)).run();
    return { error: 'blocked' };
  }
  const status = verdict === 'safe' ? 'ok' : 'pending';
  await env.DB.prepare(
    `INSERT OR IGNORE INTO images (id, user_id, type, bytes, size, created, status, ai, purpose)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  ).bind(id, userId, info.type, info.bytes, info.bytes.length, now, status, note, purpose).run();
  const row = await env.DB.prepare('SELECT status FROM images WHERE id = ?1').bind(id).first();
  return { id, status: row?.status ?? status };
}

// ---------- 엣지 캐시 ----------
// /img/:id 는 엣지 캐시(caches.default)에 요청 주소 그대로 둔다. 숨기거나 차단하면 지운다.
// (Cache API 는 데이터센터마다 따로라 지우기는 이 데이터센터에만 닿는다. 그래서 캐시에는 짧게(1시간) 둔다 — cups.js)
export const imageCacheKey = (origin, id) => `${origin}/img/${id}`;

export async function purgeImageCache(origin, id) {
  if (typeof caches === 'undefined' || !origin) return; // node 시험에는 caches 가 없다
  try {
    await caches.default.delete(imageCacheKey(origin, id));
  } catch (err) {
    console.warn('cache delete', id, err?.message || err);
  }
}

// ---------- 신고 ----------
// 한 사람이 한 번. REPORTS_TO_HIDE_IMAGE 명이면 'hidden'. → { ok, hidden } | { error: 'not_found' }
export async function reportImage(env, { id, userId, reason = null, origin, now = Date.now() }) {
  const row = await env.DB.prepare('SELECT status FROM images WHERE id = ?1').bind(id).first();
  if (!row || !VISIBLE_STATUSES.includes(row.status)) return { error: 'not_found' };
  const count = `(SELECT COUNT(*) FROM reports WHERE kind = 'image' AND target_id = ?1)`;
  const [, updated] = await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO reports (kind, target_id, user_id, reason, created) VALUES ('image', ?1, ?2, ?3, ?4)`)
      .bind(id, userId, reason, now),
    env.DB.prepare(
      `UPDATE images SET reports = ${count},
         status = CASE WHEN status IN ('ok', 'pending') AND ${count} >= ?2 THEN 'hidden' ELSE status END
       WHERE id = ?1 RETURNING status`
    ).bind(id, REPORTS_TO_HIDE_IMAGE),
  ]);
  const hidden = updated.results[0]?.status === 'hidden';
  if (hidden) await purgeImageCache(origin, id);
  return { ok: true, hidden };
}

// ---------- 관리자 검토 ----------
const ACTIONS = { approve: 'ok', hide: 'hidden', block: 'blocked' };
export const REVIEW_ACTIONS = Object.keys(ACTIONS);

// approve: 'ok' 로 되돌리고 신고를 비운다(다시 3명이 신고해야 숨겨진다), 차단 목록에서도 뺀다.
// hide: 'hidden'. block: 'blocked' + 차단 목록(같은 파일 다시 올리기 금지).
// → true | false (없는 이미지)
export async function reviewImage(env, { id, action, adminId, origin, now = Date.now() }) {
  const status = ACTIONS[action];
  if (!status) throw new Error(`unknown action ${action}`);
  const update = env.DB.prepare(
    `UPDATE images SET status = ?2, reviewed_by = ?3, reviewed_at = ?4${action === 'approve' ? ', reports = 0' : ''}
     WHERE id = ?1 RETURNING id`
  ).bind(id, status, adminId, now);
  const stmts = [update];
  if (action === 'approve') {
    stmts.push(
      env.DB.prepare(`DELETE FROM reports WHERE kind = 'image' AND target_id = ?1`).bind(id),
      env.DB.prepare('DELETE FROM image_blocklist WHERE hash = ?1').bind(id),
    );
  } else if (action === 'block') {
    stmts.push(env.DB.prepare(
      `INSERT OR IGNORE INTO image_blocklist (hash, created, reason)
       SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM images WHERE id = ?1)`
    ).bind(id, now, `admin ${adminId}`));
  }
  const [res] = await env.DB.batch(stmts);
  if (!res.results.length) return false;
  if (status !== 'ok') await purgeImageCache(origin, id);
  return true;
}
