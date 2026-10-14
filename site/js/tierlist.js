// 티어 리스트 상태: 저장, 불러오기, 공유 링크 인코딩.

import { t } from './i18n.js';

export const DEFAULT_TIERS = [
  { label: 'S', color: '#e5484d' },
  { label: 'A', color: '#f2884b' },
  { label: 'B', color: '#f5c451' },
  { label: 'C', color: '#9ccc5a' },
  { label: 'D', color: '#57a7d8' },
  { label: 'F', color: '#9a7fd1' },
];

export const PALETTE = [
  '#e5484d', '#f2884b', '#f5c451', '#9ccc5a', '#4cb7a5',
  '#57a7d8', '#7c8fe0', '#9a7fd1', '#d77fb5', '#a8a29e',
];

const KEY = id => `sts2tier.v1.${id}`;

export function freshState(template) {
  return {
    title: t('tier.defaultTitle', { title: template.title }),
    tiers: DEFAULT_TIERS.map(t => ({ ...t, items: [] })),
    updatedAt: 0,
  };
}

// 데이터가 바뀌어 사라진 아이템은 걸러 낸다.
function sanitize(state, template) {
  if (!state || !Array.isArray(state.tiers)) return null;
  const seen = new Set();
  const tiers = state.tiers.slice(0, 20).map(t => ({
    label: String(t.label ?? '').slice(0, 40),
    color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#a8a29e',
    items: (Array.isArray(t.items) ? t.items : []).filter(id => {
      if (!template.byId.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  }));
  if (!tiers.length) return null;
  return {
    title: String(state.title ?? '').slice(0, 80) || t('tier.defaultTitle', { title: template.title }),
    tiers,
    updatedAt: state.updatedAt || 0,
  };
}

export function loadState(template) {
  try {
    const raw = localStorage.getItem(KEY(template.id));
    if (raw) return sanitize(JSON.parse(raw), template) || freshState(template);
  } catch { /* 저장소 없음 */ }
  return freshState(template);
}

export function saveState(template, state) {
  state.updatedAt = Date.now();
  try { localStorage.setItem(KEY(template.id), JSON.stringify(state)); } catch { /* 저장소 없음 */ }
}

export function clearState(template) {
  try { localStorage.removeItem(KEY(template.id)); } catch { /* 저장소 없음 */ }
}

export function savedSummary(template) {
  try {
    const raw = localStorage.getItem(KEY(template.id));
    if (!raw) return null;
    const s = JSON.parse(raw);
    const placed = s.tiers.reduce((n, t) => n + t.items.length, 0);
    return placed ? { placed, updatedAt: s.updatedAt } : null;
  } catch { return null; }
}

export function unranked(template, state) {
  const placed = new Set(state.tiers.flatMap(t => t.items));
  return template.items.filter(i => !placed.has(i.id)).map(i => i.id);
}

// 아이템을 to 티어(-1 = 미배치 영역)의 index 위치로 옮긴다.
export function moveItem(state, id, to, index) {
  for (const t of state.tiers) {
    const i = t.items.indexOf(id);
    if (i !== -1) t.items.splice(i, 1);
  }
  if (to < 0) return;
  const list = state.tiers[to].items;
  list.splice(index == null ? list.length : Math.min(index, list.length), 0, id);
}

// ---- 공유 링크 ----
// 상태를 JSON → deflate → base64url 로 압축해 URL 해시에 싣는다.

function toBase64Url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeShare(state) {
  const compact = { t: state.title, r: state.tiers.map(t => [t.label, t.color.slice(1), t.items]) };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  if (typeof CompressionStream === 'undefined') return 'j' + toBase64Url(bytes);
  return 'z' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
}

export async function decodeShare(code, template) {
  try {
    const kind = code[0];
    let bytes = fromBase64Url(code.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'j') return null;
    const c = JSON.parse(new TextDecoder().decode(bytes));
    return sanitize({ title: c.t, tiers: c.r.map(([label, color, items]) => ({ label, color: `#${color}`, items })) }, template);
  } catch {
    return null;
  }
}
