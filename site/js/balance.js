// 밸런스 투표: 내 표는 브라우저에 저장하고, 바뀐 것만 모아 서버로 보낸다.

const override = new URLSearchParams(location.search).get('api');
export const API_BASE = override || 'https://sts2-balance-api.siggu100.workers.dev';

export const VERDICTS = [
  { v: 'nerf', label: '너프 필요', sub: '사기', color: '#e5484d' },
  { v: 'fair', label: '적당함', sub: '밸런스 OK', color: '#b9ae95' },
  { v: 'buff', label: '버프 필요', sub: '약함', color: '#57a7d8' },
];

const MINE_KEY = cat => `sts2bal.v1.${cat}`;
const PENDING_KEY = 'sts2bal.pending';
const VOTER_KEY = 'sts2bal.voter';

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장소 없음 */ }
}

function voterId() {
  let id = read(VOTER_KEY, null);
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    id = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    write(VOTER_KEY, id);
  }
  return id;
}

// 카테고리 안에서 내 표: { 아이템id: 'nerf' | 'fair' | 'buff' }
// 줄 안 순서도 유지하려고 줄별 배열로 저장한다.
export function loadMine(categoryId) {
  const raw = read(MINE_KEY(categoryId), null);
  const rows = { nerf: [], fair: [], buff: [] };
  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(rows)) if (Array.isArray(raw[k])) rows[k] = raw[k];
  }
  return rows;
}

export function saveMine(categoryId, rows) {
  write(MINE_KEY(categoryId), rows);
}

// ---- 서버 동기화 ----

let timer = null;
let listeners = new Set();
export function onSyncStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(status) { for (const fn of listeners) fn(status); }

export function queueVote(itemKey, v) {
  const pending = read(PENDING_KEY, {});
  pending[itemKey] = v;
  write(PENDING_KEY, pending);
  emit('pending');
  clearTimeout(timer);
  timer = setTimeout(flush, 1200);
}

export async function flush() {
  const pending = read(PENDING_KEY, {});
  const entries = Object.entries(pending);
  if (!entries.length) return;
  emit('saving');
  try {
    const res = await fetch(`${API_BASE}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voter: voterId(), votes: entries.slice(0, 300).map(([item, v]) => ({ item, v })) }),
      keepalive: true,
    });
    if (!res.ok && res.status !== 400) throw new Error(String(res.status));
    // 보내는 동안 새로 쌓인 표는 남긴다
    const now = read(PENDING_KEY, {});
    for (const [k, v] of entries.slice(0, 300)) if (now[k] === v) delete now[k];
    write(PENDING_KEY, now);
    emit(Object.keys(now).length ? 'pending' : 'saved');
    if (Object.keys(now).length) timer = setTimeout(flush, 1200);
  } catch {
    emit('offline');
    timer = setTimeout(flush, 15000);
  }
}

window.addEventListener('pagehide', () => { flush(); });

// ---- 결과 ----

const resultCache = new Map();

// { 아이템key: [너프, 적당, 버프] }
export async function fetchResults(categoryId) {
  const hit = resultCache.get(categoryId);
  if (hit && Date.now() - hit.at < 30_000) return hit.items;
  const res = await fetch(`${API_BASE}/balance?category=${encodeURIComponent(categoryId)}`);
  if (!res.ok) throw new Error(`results ${res.status}`);
  const data = await res.json();
  resultCache.set(categoryId, { at: Date.now(), items: data.items });
  return data.items;
}
