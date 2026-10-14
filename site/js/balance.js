// 밸런스 투표: 끌어다 놓은 내용은 브라우저에 임시 저장(초안)하고,
// '투표 완료'를 누르면 마지막으로 제출한 것과 달라진 표만 서버로 보낸다.

import { t } from './i18n.js';
import { authHeaders, dropSession } from './auth.js';

const override = new URLSearchParams(location.search).get('api');
export const API_BASE = override || 'https://sts2-balance-api.siggu100.workers.dev';

export const VERDICTS = [
  { v: 'nerf', label: t('verdict.nerf'), sub: t('verdict.nerf.sub'), color: '#e5484d' },
  { v: 'fair', label: t('verdict.fair'), sub: t('verdict.fair.sub'), color: '#b9ae95' },
  { v: 'buff', label: t('verdict.buff'), sub: t('verdict.buff.sub'), color: '#57a7d8' },
];

// 종류마다 '사기/약함'의 뜻이 달라서 보조 설명만 바꾼다. 집계는 모두 nerf/fair/buff 3단계.
const VERDICT_SUBS = {
  characters: 'strength',
  ancients: 'blessing',
  monsters: 'difficulty',
  elites: 'difficulty',
  bosses: 'difficulty',
  curses: 'harshness',
};

export function verdictsFor(categoryId) {
  const kind = VERDICT_SUBS[categoryId];
  return kind ? VERDICTS.map(v => ({ ...v, sub: t(`verdict.${v.v}.${kind}`) })) : VERDICTS;
}

const MINE_KEY = cat => `sts2bal.v1.${cat}`;
const SUBMITTED_KEY = cat => `sts2bal.v1.submitted.${cat}`;
const PENDING_KEY = 'sts2bal.pending';
const VOTER_KEY = 'sts2bal.voter';

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장소 없음 */ }
}

export function voterId() {
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

// 줄별 배열 → { 아이템id: 판정 }
export function verdictMap(rows) {
  const map = {};
  for (const [v, ids] of Object.entries(rows)) for (const id of ids) map[id] = v;
  return map;
}

// 마지막으로 제출한 표. 제출 버튼이 생기기 전에는 놓는 즉시 보냈으므로,
// 기록이 없으면 지금 초안을 이미 제출한 것으로 본다.
export function loadSubmitted(categoryId) {
  const saved = read(SUBMITTED_KEY(categoryId), null);
  if (saved && typeof saved === 'object') return saved;
  const legacy = verdictMap(loadMine(categoryId));
  write(SUBMITTED_KEY(categoryId), legacy);
  return legacy;
}

// 초안과 제출본이 다른 아이템: [{ id, v }] (v 가 null 이면 표 취소)
export function unsubmittedChanges(categoryId, rows, ids) {
  const draft = verdictMap(rows);
  const submitted = loadSubmitted(categoryId);
  const out = [];
  for (const id of ids) {
    const a = draft[id] ?? null, b = submitted[id] ?? null;
    if (a !== b) out.push({ id, v: a });
  }
  return out;
}

// 바뀐 표를 보내고 제출본을 갱신한다. 서버에 닿지 못해도 대기열에 남아 자동으로 다시 보낸다.
export async function submitChanges(categoryId, changes, keyOf) {
  if (!changes.length) return true;
  for (const { id, v } of changes) queueVote(keyOf(id), v, { auto: false });
  const submitted = loadSubmitted(categoryId);
  for (const { id, v } of changes) {
    if (v) submitted[id] = v; else delete submitted[id];
  }
  write(SUBMITTED_KEY(categoryId), submitted);
  return flush();
}

// ---- 서버 동기화 ----

let timer = null;
let listeners = new Set();
export function onSyncStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(status) { for (const fn of listeners) fn(status); }

function queueVote(itemKey, v, { auto = true } = {}) {
  const pending = read(PENDING_KEY, {});
  pending[itemKey] = v;
  write(PENDING_KEY, pending);
  emit('pending');
  clearTimeout(timer);
  if (auto) timer = setTimeout(flush, 1200);
}

// 대기열을 보낸다. 모두 보냈으면 true.
export async function flush() {
  clearTimeout(timer);
  const pending = read(PENDING_KEY, {});
  const entries = Object.entries(pending);
  if (!entries.length) return true;
  emit('saving');
  try {
    const res = await fetch(`${API_BASE}/balance`, {
      method: 'POST',
      // 로그인 상태면 서버가 voter 대신 계정으로 기록한다.
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ voter: voterId(), votes: entries.slice(0, 300).map(([item, v]) => ({ item, v })) }),
      keepalive: true,
    });
    // 세션이 만료됐으면 로그인을 풀고 익명으로 다시 보낸다.
    if (res.status === 401) { dropSession(); throw new Error('auth'); }
    if (!res.ok && res.status !== 400) throw new Error(String(res.status));
    // 보내는 동안 새로 쌓인 표는 남긴다
    const now = read(PENDING_KEY, {});
    for (const [k, v] of entries.slice(0, 300)) if (now[k] === v) delete now[k];
    write(PENDING_KEY, now);
    emit(Object.keys(now).length ? 'pending' : 'saved');
    if (Object.keys(now).length) { timer = setTimeout(flush, 1200); return false; }
    return true;
  } catch {
    emit('offline');
    timer = setTimeout(flush, 15000);
    return false;
  }
}

// 예전에 보내지 못한 표가 남아 있으면 페이지를 열 때 다시 보낸다.
if (Object.keys(read(PENDING_KEY, {})).length) setTimeout(flush, 2000);

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
