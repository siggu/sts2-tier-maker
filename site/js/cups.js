// 사용자가 만드는 월드컵: 목록(#/cups), 만들기(#/cups/new), 소개·진행·순위·댓글(#/cup/<id>), 고치기(#/cup/<id>/edit).
// app.js 가 route 를 부르고, play.js 의 월드컵 고르기 화면이 worldcupSwitch / cupsStrip 을 끼운다.
// 진행은 worldcup.js 엔진, 댓글·신고는 community.js 의 조각을 그대로 쓴다.
//
// 이미지 참조(ref): 'img:<32hex>' (올린 그림, API 의 /img/<id>) | 'game:<카테고리>/<아이템id>' (게임 그림) | null (기본 이미지).
// 기본 이미지는 이 파일이 캔버스로 그린다 (항목 글자를 넣은 금테 카드, 글자마다 색이 정해짐).
// 사용자가 쓴 글(제목·설명·항목 이름·이름)은 늘 글자 노드로 넣는다 (html 금지).

import { h, toast, hideTip } from './ui.js';
import { t } from './i18n.js';
import { API_BASE, voterId } from './balance.js';
import { currentUser, authHeaders, requireLogin, api, errorText, openModal, dropSession } from './auth.js';
import {
  mountWorldCup, sizesFor, sizeLabel, upToLabel, cupMetrics, runStats, RANK_FEW, fmtIndex, fmtProgress, enoughCupData, rankOrder,
} from './worldcup.js';
import { icon, avatar, timeEl, commentsSection, reportDialog } from './community.js';
import { checkImageSafe, preloadImageCheck } from './nsfw.js';

const enc = encodeURIComponent;
// bytes: 서버 한도, target: 저장 공간(D1)을 아끼려고 되도록 맞추는 크기
// minPx: 서버가 받는 가장 짧은 변 (API.md 이미지 검열: 16–1024px)
const LIMITS = { titleMin: 2, title: 60, desc: 300, name: 80, itemsMin: 4, items: 64, bytes: 300 * 1024, target: 100 * 1024, px: 512, minPx: 16 };
const strLen = s => [...String(s ?? '')].length;
const short = (s, n = 24) => { const a = [...String(s || '')]; return a.length > n ? `${a.slice(0, n - 1).join('')}…` : a.join(''); };
const num = v => Math.max(0, Number(v) || 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function readJson(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* 저장소 없음 */ }
}

const isAdmin = () => Boolean(currentUser()?.admin);
const isMine = cup => Boolean(cup?.mine || (currentUser() && cup?.author?.id === currentUser().id));
const canManage = cup => isMine(cup) || isAdmin();

// ================================================================ 아이콘 (community.js 에 없는 것)

const SVG_NS = 'http://www.w3.org/2000/svg';
const PATHS = {
  play: 'M8 5v14l11-7z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  up: 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
  image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  paste: 'M19 2h-4.18C14.4.84 13.3 0 12 0S9.6.84 9.18 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z',
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  trophy: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
};
function ic(name) {
  if (!PATHS[name]) return icon(name);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', `ic ic-${name}`);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', PATHS[name]);
  p.setAttribute('fill', 'currentColor');
  svg.append(p);
  return svg;
}

// ================================================================ 이미지 참조

const IMG_REF = /^img:([0-9a-f]{32})$/;
const GAME_REF = /^game:([a-z0-9-]+)\/([^\s/]+)$/i;

// ref → 그림 주소 (없거나 모르는 ref 는 null → 기본 이미지)
export function refUrl(ref, db) {
  if (typeof ref !== 'string') return null;
  let m = ref.match(IMG_REF);
  if (m) return `${API_BASE}/img/${m[1]}`;
  m = ref.match(GAME_REF);
  if (m && db) {
    const item = db.categories.find(c => c.id === m[1])?.byId.get(m[2]);
    const src = item?.img;
    // 게임 그림은 같은 사이트의 data/img/… 이거나 https 주소만
    if (typeof src === 'string' && (/^https:\/\//.test(src) || /^data\/img\//.test(src))) return src;
  }
  return null;
}
const refKind = ref => (typeof ref === 'string' && IMG_REF.test(ref) ? 'upload' : typeof ref === 'string' && GAME_REF.test(ref) ? 'game' : null);
const gameRef = (cat, item) => `game:${cat.id}/${item.id}`;

// <img> 하나. 못 불러오면 기본 이미지로.
function pic(src, fallback, attrs = {}) {
  const el = h('img', { src: src || fallback, alt: '', decoding: 'async', draggable: 'false', ...attrs });
  if (src && fallback && src !== fallback) el.addEventListener('error', () => { el.src = fallback; }, { once: true });
  return el;
}

// ================================================================ 기본 이미지 (캔버스)

// 첨탑 분위기의 어두운 색 쌍: 글자에 따라 하나가 정해진다
const TONES = [
  ['#5b1d1a', '#170909'], // 붉은 (아이언클래드)
  ['#1f4a2f', '#08140d'], // 초록 (사일런트)
  ['#173f63', '#070f1a'], // 파랑 (디펙트)
  ['#432059', '#110718'], // 보라 (네크로바인더)
  ['#5e3a13', '#160d05'], // 주황 (리젠트)
  ['#16494c', '#061314'], // 청록
  ['#4b1838', '#13060f'], // 자홍
  ['#3a3f4f', '#0c0e14'], // 잿빛
];
function hash(s) {
  let x = 0x811c9dc5;
  for (const ch of String(s)) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; }
  return x >>> 0;
}
const defaultCache = new Map();
let fontFamily = null;
try { document.fonts?.addEventListener?.('loadingdone', () => { defaultCache.clear(); }); } catch { /* 없음 */ }

let fontsWait = null;
// 첫 기본 이미지를 그리기 전에 제목 글꼴을 잠깐 기다린다 (못 받으면 기본 글꼴)
function fontsReady() {
  if (!fontsWait) {
    const load = document.fonts?.load ? document.fonts.load('700 40px "Gowun Batang"', '가A').catch(() => {}) : Promise.resolve();
    fontsWait = Promise.race([load, new Promise(r => setTimeout(r, 1200))]);
  }
  return fontsWait;
}

function diamond(g, x, y, r, ry = r) {
  g.beginPath();
  g.moveTo(x, y - ry);
  g.lineTo(x + r, y);
  g.lineTo(x, y + ry);
  g.lineTo(x - r, y);
  g.closePath();
  g.fill();
}

function wrapLines(g, text, maxW) {
  const lines = [];
  let line = '';
  const long = word => { // 한 낱말이 너무 길면 글자 단위로 끊는다
    let cur = '';
    for (const ch of Array.from(word)) {
      if (cur && g.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch;
    }
    return cur;
  };
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width <= maxW) { line = test; continue; }
    if (line) lines.push(line);
    line = g.measureText(word).width <= maxW ? word : long(word);
  }
  if (line) lines.push(line);
  return lines;
}

function fitText(g, text, maxW, maxH, maxSize, minSize, family) {
  let size = maxSize;
  for (; size > minSize; size = Math.floor(size * 0.9)) {
    g.font = `700 ${size}px ${family}`;
    const lines = wrapLines(g, text, maxW);
    if (lines.length * size * 1.25 <= maxH) return { size, lines };
  }
  size = minSize;
  g.font = `700 ${size}px ${family}`;
  let lines = wrapLines(g, text, maxW);
  const max = Math.max(1, Math.floor(maxH / (size * 1.25)));
  if (lines.length > max) {
    lines = lines.slice(0, max);
    let last = lines[max - 1];
    while (last && g.measureText(`${last}…`).width > maxW) last = Array.from(last).slice(0, -1).join('');
    lines[max - 1] = `${last}…`;
  }
  return { size, lines };
}

// 글자를 넣은 기본 이미지 (data: 주소). 같은 글자·크기는 한 번만 그린다.
export function defaultImage(text, { w = 400, h: H = 400 } = {}) {
  const label = String(text || '').trim() || '?';
  const key = `${w}x${H}|${label}`;
  const hit = defaultCache.get(key);
  if (hit) return hit;
  let url = '';
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = H;
    const g = c.getContext('2d');
    const x = hash(label);
    const [c1, c2] = TONES[x % TONES.length];
    const s = Math.min(w, H);
    const bg = g.createLinearGradient(0, 0, w * 0.45, H);
    bg.addColorStop(0, c1);
    bg.addColorStop(1, c2);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, H);
    const glow = g.createRadialGradient(w / 2, H * 0.45, 0, w / 2, H * 0.45, Math.max(w, H) * 0.7);
    glow.addColorStop(0, 'rgba(255, 205, 130, .17)');
    glow.addColorStop(1, 'rgba(255, 205, 130, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, H);
    // 희미한 마름모 무늬
    g.fillStyle = 'rgba(243, 223, 174, .05)';
    const step = s / 7;
    for (let row = -1, yy = -step; yy < H + step; row++, yy += step) {
      for (let xx = (row % 2 ? step / 2 : 0) - step; xx < w + step; xx += step) diamond(g, xx, yy, step * 0.13);
    }
    // 금테 두 겹 + 모서리 마름모
    const m = s * 0.045;
    const m2 = m + s * 0.028;
    g.strokeStyle = 'rgba(217, 164, 65, .85)';
    g.lineWidth = Math.max(2, s * 0.012);
    g.strokeRect(m, m, w - 2 * m, H - 2 * m);
    g.strokeStyle = 'rgba(217, 164, 65, .32)';
    g.lineWidth = Math.max(1, s * 0.005);
    g.strokeRect(m2, m2, w - 2 * m2, H - 2 * m2);
    g.fillStyle = '#d9a441';
    for (const [px, py] of [[m, m], [w - m, m], [m, H - m], [w - m, H - m]]) diamond(g, px, py, s * 0.028);
    // 위쪽 상징 (사이트 로고 모양의 마름모) 과 양옆 선
    const cy = m2 + s * 0.11;
    const r = s * 0.05;
    g.fillStyle = '#d9a441';
    diamond(g, w / 2, cy, r, r * 1.45);
    g.fillStyle = '#421f12';
    diamond(g, w / 2, cy, r * 0.5, r * 0.8);
    g.strokeStyle = 'rgba(217, 164, 65, .55)';
    g.lineWidth = Math.max(1, s * 0.005);
    g.beginPath();
    g.moveTo(w / 2 - r * 1.8, cy); g.lineTo(w / 2 - r * 1.8 - s * 0.2, cy);
    g.moveTo(w / 2 + r * 1.8, cy); g.lineTo(w / 2 + r * 1.8 + s * 0.2, cy);
    // 아래 장식선
    const by = H - m2 - s * 0.07;
    g.moveTo(w / 2 - s * 0.22, by); g.lineTo(w / 2 - s * 0.04, by);
    g.moveTo(w / 2 + s * 0.04, by); g.lineTo(w / 2 + s * 0.22, by);
    g.stroke();
    g.fillStyle = 'rgba(217, 164, 65, .8)';
    diamond(g, w / 2, by, s * 0.018);
    // 글자
    if (!fontFamily) fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-title').trim() || 'serif';
    const top = cy + r * 1.45 + s * 0.04;
    const bottom = by - s * 0.05;
    const side = m2 + s * 0.06;
    const fit = fitText(g, label, w - 2 * side, bottom - top, Math.round(s * 0.15), Math.max(10, Math.round(s * 0.052)), fontFamily);
    const lh = fit.size * 1.25;
    const start = top + (bottom - top - lh * fit.lines.length) / 2 + lh / 2;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0, 0, 0, .75)';
    g.shadowBlur = s * 0.02;
    g.shadowOffsetY = s * 0.006;
    g.fillStyle = '#f3dfae';
    g.font = `700 ${fit.size}px ${fontFamily}`;
    fit.lines.forEach((ln, i) => g.fillText(ln, w / 2, start + i * lh));
    url = c.toDataURL('image/webp', 0.9);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/png');
  } catch {
    url = '';
  }
  if (defaultCache.size > 400) defaultCache.delete(defaultCache.keys().next().value);
  if (url) defaultCache.set(key, url);
  return url;
}
const COVER = { w: 640, h: 360 };
const defaultCover = title => defaultImage(title, COVER);

// 표지: 직접 고른 표지 → 항목 그림 몇 장 → 제목을 넣은 기본 표지
function coverVisual({ cover, sample, title, itemCount }, db, cls = '') {
  const box = h('div', { class: `cups-cover ${cls}`, 'aria-hidden': 'true' });
  const own = refUrl(cover, db);
  const fallback = defaultCover(title);
  if (own) {
    box.append(pic(own, fallback, { class: refKind(cover) === 'upload' ? 'fit-cover' : 'fit-contain', loading: 'lazy' }));
  } else {
    const pics = (Array.isArray(sample) ? sample : []).map(r => ({ r, url: refUrl(r, db) })).filter(x => x.url);
    const n = pics.length >= 4 ? 4 : pics.length >= 2 ? 2 : pics.length;
    if (!n) box.append(pic(fallback, null, { class: 'fit-cover', loading: 'lazy' }));
    else {
      box.classList.add(`cups-mosaic`, `n${n}`);
      for (const p of pics.slice(0, n)) {
        box.append(h('span', { class: 'cups-cell' }, pic(p.url, defaultImage('?'), { class: refKind(p.r) === 'upload' ? 'fit-cover' : 'fit-contain', loading: 'lazy' })));
      }
    }
  }
  if (itemCount) box.append(h('span', { class: 'cups-cover-badge' }, t('cups.card.items', { n: itemCount })));
  return box;
}

// ================================================================ 사진 줄이기·올리기

function canvasBlob(canvas, type, quality) {
  return new Promise(resolve => {
    try { canvas.toBlob(b => resolve(b), type, quality); } catch { resolve(null); }
  });
}

async function decodeImage(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file); } catch { /* 아래 방법으로 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

// 긴 쪽 512px 이하, webp(안 되면 jpeg). 100KB 이하가 될 때까지 품질·크기를 줄이고,
// 끝내 못 맞추면 300KB(서버 한도) 이하인 것 중 가장 작은 것.
async function shrinkImage(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw Object.assign(new Error('type'), { code: 'img_type' });
  let src;
  try { src = await decodeImage(file); } catch { throw Object.assign(new Error('decode'), { code: 'img_decode' }); }
  const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
  if (!W || !H) throw Object.assign(new Error('decode'), { code: 'img_decode' });
  let scale = Math.min(1, LIMITS.px / Math.max(W, H));
  // 너무 작거나 길쭉해서 짧은 변이 16px 아래가 되는 그림은 서버가 받지 않는다
  if (Math.min(W, H) * scale < LIMITS.minPx) { src.close?.(); throw Object.assign(new Error('dimensions'), { code: 'img_dimensions' }); }
  let best = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const w = Math.max(1, Math.round(W * scale)), hh = Math.max(1, Math.round(H * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = hh;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, hh);
    for (const q of [0.82, 0.7, 0.58]) {
      let blob = await canvasBlob(c, 'image/webp', q);
      if (!blob || blob.type !== 'image/webp') {
        // webp 를 못 만드는 브라우저: 투명한 곳을 어두운 바탕으로 채운 jpeg
        const j = document.createElement('canvas');
        j.width = w; j.height = hh;
        const jg = j.getContext('2d');
        jg.fillStyle = '#15130f';
        jg.fillRect(0, 0, w, hh);
        jg.drawImage(c, 0, 0);
        blob = await canvasBlob(j, 'image/jpeg', q);
      }
      if (!blob) continue;
      if (blob.size <= LIMITS.target) { src.close?.(); return blob; }
      if (blob.size <= LIMITS.bytes && (!best || blob.size < best.size)) best = blob;
    }
    scale *= 0.8;
  }
  src.close?.();
  if (best) return best;
  throw Object.assign(new Error('too_big'), { status: 413, code: 'too_big' });
}

// POST /images (원본 바이트). 올리는 동안 onProgress(0–1). → 'img:<hex>'
function uploadBlob(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/images`);
    for (const [k, v] of Object.entries(authHeaders())) xhr.setRequestHeader(k, v);
    xhr.setRequestHeader('Content-Type', blob.type);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* 본문 없음 */ }
      if (xhr.status >= 200 && xhr.status < 300 && typeof data?.ref === 'string' && IMG_REF.test(data.ref)) { resolve(data.ref); return; }
      if (xhr.status === 401) dropSession();
      reject(Object.assign(new Error(data?.error || 'http'), { status: xhr.status, code: data?.error || `http_${xhr.status}`, reason: data?.reason }));
    };
    xhr.onerror = () => reject(Object.assign(new Error('network'), { status: 0, code: 'network' }));
    xhr.send(blob);
  });
}

// 줄이기 → 브라우저 검사(nsfw.js, 야한 그림이면 올리지 않음) → 올리기. 서버도 다시 검사한다.
async function uploadFile(file, onProgress) {
  const blob = await shrinkImage(file);
  const safe = await checkImageSafe(blob);
  if (!safe.ok) throw Object.assign(new Error('nsfw'), { code: 'img_nsfw' });
  onProgress?.(0.02);
  return uploadBlob(blob, onProgress);
}

function uploadErrorText(err) {
  if (err?.code === 'img_type' || err?.code === 'img_decode') return t('cups.img.unreadable');
  if (err?.code === 'img_nsfw') return t('cups.img.nsfw');
  if (err?.code === 'img_dimensions' || (err?.status === 400 && err.reason === 'dimensions')) return t('cups.img.dimensions');
  if (err?.status === 400 && err.reason === 'animated') return t('cups.img.animated');
  if (err?.status === 413 || err?.code === 'too_big') return t('cups.img.tooBig');
  if (err?.status === 415 || (err?.status === 400 && (err.reason === 'type' || err.reason === 'image'))) return t('cups.img.unreadable');
  if (err?.status === 429 && err.reason === 'daily') return t('cups.img.daily');
  return errorText(err);
}

// 파일 고르기 (한 폼에 숨은 input 하나)
function filePicker() {
  let done = null;
  const input = h('input', {
    type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,image/*', class: 'cups-file', tabindex: '-1', 'aria-hidden': 'true',
    onchange: () => { const files = [...(input.files || [])]; input.value = ''; const d = done; done = null; if (files.length) d?.(files); },
  });
  return {
    input,
    pick({ multiple = false } = {}) {
      preloadImageCheck(); // 파일을 고르는 동안 검사 모델을 받아 둔다
      return new Promise(resolve => {
        done = resolve;
        input.multiple = multiple;
        input.click();
      });
    },
  };
}

// ================================================================ 클립보드 그림 붙여넣기

// paste 이벤트의 그림 파일들 (files 가 비면 items 에서). 글자와 그림이 같이 있으면 그림을 쓴다.
function clipImages(dt) {
  if (!dt) return [];
  const files = [...(dt.files || [])].filter(f => /^image\//.test(f.type));
  if (files.length) return files;
  return [...(dt.items || [])].filter(x => x.kind === 'file' && /^image\//.test(x.type)).map(x => x.getAsFile()).filter(Boolean);
}

// 붙여넣기 단추는 clipboard.read() 가 있는 브라우저에서만 (없으면 Ctrl+V 만)
const canReadClipboard = () => typeof navigator.clipboard?.read === 'function';

// 단추로 붙여넣기: 클립보드의 첫 그림 → File. 그림이 없거나 못 읽으면 알리고 null.
// 누른 동작 안에서 바로 read() 를 불러야 브라우저가 허락한다.
async function readClipboardImage() {
  let items;
  try {
    items = await navigator.clipboard.read();
  } catch {
    toast(t('cups.paste.denied'));
    return null;
  }
  for (const item of items || []) {
    const type = item.types.find(x => /^image\//.test(x));
    if (!type) continue;
    try {
      const blob = await item.getType(type);
      preloadImageCheck();
      return new File([blob], `clipboard.${type.slice(6).replace(/\W.*$/, '') || 'png'}`, { type });
    } catch { /* 다음 것 */ }
  }
  toast(t('cups.paste.none'));
  return null;
}

// 글을 쓰는 칸인지 (붙여넣기를 그 칸에 맡길지)
const TEXT_FIELD = 'textarea, input:not([type=button], [type=checkbox], [type=radio], [type=file], [type=submit], [type=reset], [type=range], [type=color], [type=image])';
const isTextField = el => Boolean(el?.isContentEditable || el?.matches?.(TEXT_FIELD));

// ================================================================ 게임 이미지 고르기 창

function pickGameImage(db) {
  return new Promise(resolve => {
    let cat = '';
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    const cats = db.categories.filter(c => c.items.some(i => i.img));
    const search = h('input', { type: 'search', class: 'cups-gp-search', placeholder: t('cups.game.search'), 'aria-label': t('cups.game.search'), autocomplete: 'off' });
    const chips = h('div', { class: 'cups-gp-cats', role: 'group', 'aria-label': t('cups.game.cats') });
    const grid = h('div', { class: 'cups-gp-grid' });
    const note = h('p', { class: 'cups-gp-note' });
    const SHOW = 90;

    function drawChips() {
      chips.replaceChildren(...[['', t('cups.game.all')], ...cats.map(c => [c.id, c.name])].map(([id, label]) => h('button', {
        type: 'button', class: `vs-chip${cat === id ? ' on' : ''}`, 'aria-pressed': String(cat === id),
        onclick: () => { cat = id; drawChips(); drawGrid(); },
      }, label)));
    }
    function drawGrid() {
      const q = search.value.trim().toLowerCase();
      const pool = [];
      for (const c of cats) {
        if (cat && c.id !== cat) continue;
        for (const it of c.items) {
          if (!it.img) continue;
          if (q && !String(it.name).toLowerCase().includes(q) && !String(it.nameEn || '').toLowerCase().includes(q)) continue;
          pool.push({ c, it });
        }
      }
      grid.replaceChildren(...pool.slice(0, SHOW).map(({ c, it }) => h('button', {
        type: 'button', class: `cups-gp-item kind-${c.tile}`, title: `${it.name} · ${c.name}`,
        onclick: () => { finish({ ref: gameRef(c, it), name: it.name, url: it.img }); m.close(); },
      }, h('span', { class: 'cups-gp-img' }, h('img', { src: it.img, alt: '', loading: 'lazy', decoding: 'async' })), h('span', { class: 'cups-gp-name' }, it.name))));
      note.textContent = !pool.length ? t('cups.game.none') : pool.length > SHOW ? t('cups.game.more', { n: pool.length - SHOW }) : t('cups.game.count', { n: pool.length });
    }
    search.addEventListener('input', drawGrid);
    drawChips();
    drawGrid();
    const m = openModal({
      title: t('cups.game.title'), className: 'cups-gp-modal',
      body: h('div', { class: 'cups-gp' }, h('label', { class: 'cups-gp-searchbox' }, ic('search'), search), chips, grid, note),
      onClose: () => finish(null),
    });
    search.focus();
  });
}

// ================================================================ 결과 보내기 (판이 끝날 때 한 번, 실패하면 다시)

const PENDING_KEY = 'sts2cup.pending';
let flushing = false;
let flushTimer = null;
let warned = false;

function queuePlay(cupId, payload) {
  const list = readJson(PENDING_KEY, []);
  list.push({ id: cupId, ...payload });
  writeJson(PENDING_KEY, list.slice(-50));
  flushPlays();
}

async function flushPlays() {
  if (flushing) return;
  clearTimeout(flushTimer);
  flushing = true;
  try {
    for (;;) {
      const list = readJson(PENDING_KEY, []);
      if (!Array.isArray(list) || !list.length) { warned = false; return; }
      const p = list[0];
      const body = { champion: p.champion, entrants: p.entrants, matches: p.matches };
      const headers = { 'Content-Type': 'application/json', ...authHeaders() };
      if (!currentUser()) body.voter = voterId();
      let status = 0;
      try {
        const res = await fetch(`${API_BASE}/cups/${enc(p.id)}/play`, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true });
        status = res.status;
      } catch { status = 0; }
      if (status === 401 && headers.Authorization) { dropSession({ quiet: true }); continue; } // 익명으로 다시
      if (status === 0 || status >= 500 || status === 429) {
        if (status !== 429 && !warned) { warned = true; toast(t('cups.play.sendFailed')); }
        flushTimer = setTimeout(flushPlays, status === 429 ? 20_000 : 15_000);
        return;
      }
      // 보냈거나(2xx) 서버가 받지 않는 결과(4xx)는 뺀다
      const now = readJson(PENDING_KEY, []);
      now.shift();
      writeJson(PENDING_KEY, now);
    }
  } finally {
    flushing = false;
  }
}
if (readJson(PENDING_KEY, []).length) setTimeout(flushPlays, 3000);

// ================================================================ 라우팅·다른 화면에 끼우는 조각

let viewToken = 0;

export function route(parts, params, ctx) {
  if (parts[0] === 'cups') {
    if (parts[1] === 'new') viewNew(ctx);
    else if (parts[1]) ctx.notFound();
    else viewList(params, ctx);
    return true;
  }
  if (parts[0] === 'cup' && parts[1]) {
    if (parts[2] === 'edit') viewEdit(parts[1], ctx);
    else if (parts[2]) ctx.notFound();
    else viewCup(parts[1], ctx);
    return true;
  }
  return false;
}

// 월드컵 메뉴 위쪽: 게임 월드컵 | 사용자 월드컵
export function worldcupSwitch(active) {
  const link = (key, href, emoji, label) => h('a', {
    href, class: active === key ? 'on' : null, 'aria-current': active === key ? 'page' : null,
  }, h('span', { class: 'cups-switch-ic', 'aria-hidden': 'true' }, emoji), h('span', {}, label));
  return h('nav', { class: 'cups-switch', 'aria-label': t('cups.switch.aria') },
    link('game', '#/versus', '⚔️', t('cups.switch.game')),
    link('user', '#/cups', '✍️', t('cups.switch.user')));
}

// 월드컵 고르기 화면 아래쪽: 인기 사용자 월드컵 (못 받거나 없으면 숨김)
export function cupsStrip(ctx) {
  const grid = h('div', { class: 'cups-strip', 'aria-busy': 'true' }, skeletonCards(4));
  const sec = h('section', { class: 'block cups-strip-sec' },
    h('div', { class: 'cups-strip-head' },
      h('h2', { class: 'block-title' }, t('cups.strip.title')),
      h('a', { class: 'cups-strip-all', href: '#/cups' }, t('cups.strip.all'), ' ›')),
    grid);
  api('/cups?sort=top').then(data => {
    const cups = (Array.isArray(data?.cups) ? data.cups : []).filter(c => c && !c.hidden);
    if (!cups.length) {
      grid.removeAttribute('aria-busy');
      grid.replaceChildren(h('a', { class: 'cups-strip-empty', href: '#/cups/new' }, ic('plus'), h('span', {}, t('cups.strip.empty'))));
      return;
    }
    grid.removeAttribute('aria-busy');
    grid.replaceChildren(...cups.slice(0, 8).map(c => cupCard(c, ctx.db)));
  }).catch(() => sec.remove());
  return sec;
}

function cupsCrumbs(...items) {
  return h('nav', { class: 'crumbs', 'aria-label': t('crumbs.aria') },
    h('a', { href: '#/versus' }, t('vs.title')),
    [[t('cups.nav'), items.length ? '#/cups' : null], ...items].map(([label, href]) => [
      h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'),
      href ? h('a', { href }, label) : h('span', { 'aria-current': 'page' }, label),
    ]),
  );
}

function errorPage(ctx, err, crumbs) {
  ctx.render(crumbs, h('section', { class: 'empty' },
    h('h2', {}, err?.status === 404 ? t('cups.missing') : t('cups.loadFailed')),
    err?.status !== 404 ? h('p', {}, errorText(err)) : null,
    h('p', { class: 'actions cups-center' },
      err?.status !== 404 ? h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.rerender() }, t('acct.retry')) : null,
      h('a', { class: 'btn', href: '#/cups' }, t('cups.backToList'))),
  ));
}

// ================================================================ 목록 카드

function stat(name, n, label, cls = '') {
  return h('span', { class: `gal-stat ${cls}`, title: label, 'aria-label': `${label} ${n || 0}` }, ic(name), String(n || 0));
}

function cupCard(cup, db) {
  const upTo = upToLabel(num(cup.itemCount));
  return h('a', { class: `cupc${cup.hidden ? ' is-hidden' : ''}`, href: `#/cup/${enc(cup.id)}` },
    coverVisual({ cover: cup.cover, sample: cup.sample, title: cup.title, itemCount: num(cup.itemCount) }, db, 'cupc-cover'),
    h('div', { class: 'cupc-body' },
      h('strong', { class: 'cupc-title' }, cup.title || '?'),
      cup.description ? h('p', { class: 'cupc-desc' }, cup.description) : null,
      h('div', { class: 'cupc-author' },
        avatar(cup.author, 'sm'),
        h('span', { class: 'cupc-name' }, cup.author?.name || '?'),
        h('span', { class: 'gal-dot', 'aria-hidden': 'true' }, '·'),
        timeEl(cup.created)),
      h('div', { class: 'cupc-stats' },
        stat('play', cup.plays, t('cups.stat.plays')),
        stat('heart', cup.likes, t('cups.stat.likes'), cup.myLike ? 'on' : ''),
        stat('chat', cup.comments, t('comments.title')),
        upTo ? h('span', { class: 'cupc-size' }, upTo) : null,
        cup.hidden ? h('span', { class: 'gal-hidden-badge' }, t('gallery.hiddenBadge')) : null,
        isMine(cup) ? h('span', { class: 'cupc-mine' }, t('cups.card.mine')) : null),
    ),
  );
}

function skeletonCards(n) {
  return Array.from({ length: n }, () => h('div', { class: 'cupc skeleton', 'aria-hidden': 'true' },
    h('div', { class: 'cups-cover' }), h('div', { class: 'cupc-body' }, h('span', { class: 'sk-line' }), h('span', { class: 'sk-line short' }))));
}

// ================================================================ 목록 (#/cups)

const listHref = ({ sort, author } = {}) => {
  const q = new URLSearchParams();
  if (sort === 'new') q.set('sort', 'new');
  if (author) q.set('author', author);
  const qs = q.toString();
  return `#/cups${qs ? `?${qs}` : ''}`;
};

function viewList(params, ctx) {
  const token = ++viewToken;
  const sort = params.get('sort') === 'new' ? 'new' : 'top';
  const author = params.get('author') || '';
  const me = currentUser();
  const mineView = Boolean(author && me && author === me.id);
  const heading = h('h1', {}, mineView ? t('cups.mine') : author ? t('cups.byAuthor') : t('cups.title'));
  const grid = h('div', { class: 'cups-grid', 'aria-busy': 'true' }, skeletonCards(6));
  const more = h('div', { class: 'gal-more' });
  const sortBtn = (key, label) => h('button', {
    type: 'button', class: sort === key ? 'on' : null, 'aria-pressed': String(sort === key),
    onclick: () => { if (sort !== key) location.replace(listHref({ sort: key, author })); },
  }, label);
  const authorChip = author ? h('span', { class: 'gal-filter-chip' },
    h('span', { class: 'gal-author-name' }, mineView ? t('cups.mineShort') : t('cups.byAuthor')),
    h('a', { href: listHref({ sort }), 'aria-label': t('cups.clearAuthor') }, '×')) : null;

  ctx.render(
    cupsCrumbs(...(author ? [[heading.textContent]] : [])),
    h('header', { class: 'page-head cups-head' },
      h('div', { class: 'cups-head-text' },
        heading,
        h('p', {}, t('cups.lead'))),
      h('div', { class: 'cups-head-actions' },
        h('a', { class: 'btn primary', href: '#/cups/new' }, ic('plus'), t('cups.make')),
        me && !mineView ? h('a', { class: 'btn', href: listHref({ author: me.id }) }, t('cups.mine')) : null),
    ),
    worldcupSwitch('user'),
    h('div', { class: 'gal-controls cups-controls' },
      h('div', { class: 'seg', role: 'group', 'aria-label': t('cups.sort') },
        sortBtn('top', t('cups.sortTop')), sortBtn('new', t('cups.sortNew'))),
      authorChip),
    grid,
    more,
  );

  let cursor = null;
  let first = true;
  async function load() {
    more.replaceChildren();
    const q = new URLSearchParams({ sort });
    if (cursor) q.set('cursor', cursor);
    if (author) q.set('author', author);
    let data;
    try {
      data = await api(`/cups?${q}`);
    } catch (err) {
      if (token !== viewToken) return;
      grid.removeAttribute('aria-busy');
      const retry = h('button', { class: 'btn', type: 'button', onclick: () => { if (first) grid.replaceChildren(...skeletonCards(3)); load(); } }, t('acct.retry'));
      if (first) grid.replaceChildren(h('section', { class: 'empty gal-empty' }, h('h2', {}, t('cups.loadFailed')), h('p', {}, errorText(err)), h('p', {}, retry)));
      else more.replaceChildren(h('p', { class: 'muted' }, errorText(err)), retry);
      return;
    }
    if (token !== viewToken) return;
    await fontsReady();
    if (token !== viewToken) return;
    grid.removeAttribute('aria-busy');
    const cups = Array.isArray(data?.cups) ? data.cups.filter(Boolean) : [];
    if (first) {
      grid.replaceChildren();
      if (author && !mineView && cups[0]?.author?.name) {
        heading.textContent = t('cups.byName', { name: cups[0].author.name });
        authorChip?.querySelector('.gal-author-name')?.replaceChildren(cups[0].author.name);
      }
      if (!cups.length) {
        grid.replaceChildren(h('section', { class: 'empty gal-empty' },
          h('h2', {}, mineView ? t('cups.emptyMine') : t('cups.empty')),
          h('p', {}, t('cups.emptyBody')),
          h('p', {}, h('a', { class: 'btn primary', href: '#/cups/new' }, t('cups.make')))));
      }
    }
    first = false;
    grid.append(...cups.map(c => cupCard(c, ctx.db)));
    cursor = data?.next || null;
    if (cursor) more.replaceChildren(h('button', { class: 'btn', type: 'button', onclick: e => { e.currentTarget.disabled = true; load(); } }, t('gallery.more')));
  }
  load();
}

// ================================================================ 표지 고르기 (만들기·고치기)

// state: { cover, coverBusy }, title(), samples() → 자동 표지 미리보기
function coverEditor({ state, db, files, title, samples, onChange }) {
  const box = h('div', { class: 'cups-cover-edit' });
  function draw() {
    const auto = !state.cover;
    box.replaceChildren(
      h('div', { class: 'cups-cover-prev' },
        coverVisual({ cover: state.cover, sample: samples(), title: title() || t('cups.new.titlePh') }, db),
        state.coverBusy != null ? h('span', { class: 'cups-busy' }, h('span', { class: 'cups-spin', 'aria-hidden': 'true' }), `${Math.round(state.coverBusy * 100)}%`) : null),
      h('div', { class: 'cups-cover-side' },
        h('p', { class: 'cups-help' }, auto ? t('cups.cover.auto') : refKind(state.cover) === 'game' ? t('cups.cover.game') : t('cups.cover.upload')),
        h('div', { class: 'cups-img-actions' },
          h('button', { class: 'btn small', type: 'button', disabled: state.coverBusy != null, onclick: upload }, ic('upload'), t('cups.img.upload')),
          canReadClipboard() ? h('button', { class: 'btn small', type: 'button', disabled: state.coverBusy != null, onclick: paste }, ic('paste'), t('cups.img.pasteShort')) : null,
          h('button', { class: 'btn small', type: 'button', onclick: pickGame }, ic('image'), t('cups.img.game')),
          auto ? null : h('button', { class: 'btn ghost small', type: 'button', onclick: () => { state.cover = null; onChange(); draw(); } }, t('cups.cover.reset')))),
    );
  }
  async function upload() {
    const [file] = await files.pick();
    if (file) await uploadCover(file);
  }
  async function paste() {
    const file = await readClipboardImage();
    if (file) await uploadCover(file);
  }
  async function uploadCover(file) {
    if (state.coverBusy != null) return;
    state.coverBusy = 0;
    draw();
    try {
      state.cover = await uploadFile(file, p => { state.coverBusy = p; const b = box.querySelector('.cups-busy'); if (b) b.lastChild.textContent = `${Math.round(p * 100)}%`; });
      onChange();
    } catch (err) {
      toast(uploadErrorText(err));
    }
    state.coverBusy = null;
    draw();
  }
  async function pickGame() {
    const got = await pickGameImage(db);
    if (!got) return;
    state.cover = got.ref;
    onChange();
    draw();
  }
  draw();
  return { el: box, draw };
}

function field(label, control, counter, help) {
  return h('label', { class: 'cups-field' },
    h('span', { class: 'cups-field-head' }, h('span', { class: 'cups-field-label' }, label), counter),
    control,
    help || null);
}

// ================================================================ 만들기 (#/cups/new)

const DRAFT_KEY = 'sts2cup.draft';

function loginGate(ctx, titleKey, bodyKey) {
  ctx.render(
    cupsCrumbs([t(titleKey)]),
    h('section', { class: 'empty cups-gate' },
      h('div', { class: 'cups-gate-ic', 'aria-hidden': 'true' }, '✍️'),
      h('h2', {}, t(titleKey)),
      h('p', {}, t(bodyKey)),
      h('p', { class: 'actions cups-center' },
        h('button', { class: 'btn primary', type: 'button', onclick: async () => { if (await requireLogin(t('cups.reason.create'))) ctx.rerender(); } }, t('acct.login')),
        h('a', { class: 'btn ghost', href: '#/cups' }, t('cups.backToList'))),
    ),
  );
}

let rowSeq = 0;
const newRow = (name = '', img = null) => ({ k: ++rowSeq, name, img, busy: null });

function viewNew(ctx) {
  ++viewToken;
  if (!currentUser()) { loginGate(ctx, 'cups.new.title', 'cups.new.loginBody'); return; }
  const db = ctx.db;
  const files = filePicker();
  const draft = readJson(DRAFT_KEY);
  const restored = Boolean(draft && (draft.title || draft.description || draft.cover || draft.items?.some(i => i?.name || i?.img)));
  const st = {
    title: restored ? String(draft.title || '') : '',
    description: restored ? String(draft.description || '') : '',
    cover: restored && refKind(draft.cover) ? draft.cover : null,
    coverBusy: null,
    items: restored && Array.isArray(draft.items)
      ? draft.items.slice(0, LIMITS.items).map(i => newRow(String(i?.name || '').slice(0, 200), refKind(i?.img) ? i.img : null))
      : [],
  };
  while (st.items.length < LIMITS.itemsMin) st.items.push(newRow());
  let tried = false;
  let submitting = false;

  // ---- 임시 저장 (바뀔 때마다, 올리는 중인 그림은 빼고)
  function saveDraft() {
    const items = st.items.map(r => ({ name: r.name, img: r.img }));
    const empty = !st.title.trim() && !st.description.trim() && !st.cover && !items.some(i => i.name.trim() || i.img);
    writeJson(DRAFT_KEY, empty ? null : { v: 1, title: st.title, description: st.description, cover: st.cover, items, at: Date.now() });
  }

  // ---- 검사
  const filled = () => st.items.filter(r => r.name.trim() || r.img);
  function validate() {
    const errs = [];
    const bad = new Set();
    const tl = strLen(st.title.trim());
    if (tl < LIMITS.titleMin || tl > LIMITS.title) errs.push({ field: 'title', msg: t('cups.err.title', { min: LIMITS.titleMin, max: LIMITS.title }) });
    if (strLen(st.description) > LIMITS.desc) errs.push({ field: 'desc', msg: t('cups.err.desc', { max: LIMITS.desc }) });
    const rows = filled();
    const seen = new Map();
    rows.forEach(r => {
      const n = st.items.indexOf(r) + 1;
      const name = r.name.trim();
      if (!name) { bad.add(r.k); errs.push({ field: 'items', msg: t('cups.err.noName', { n }) }); return; }
      if (strLen(name) > LIMITS.name) { bad.add(r.k); errs.push({ field: 'items', msg: t('cups.err.long', { n, max: LIMITS.name }) }); }
      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) { bad.add(r.k); bad.add(seen.get(key).k); errs.push({ field: 'items', msg: t('cups.err.dup', { name }) }); } else seen.set(key, r);
    });
    const named = rows.filter(r => r.name.trim()).length;
    if (named < LIMITS.itemsMin) errs.push({ field: 'items', msg: t('cups.err.few', { min: LIMITS.itemsMin, n: named }) });
    if (rows.length > LIMITS.items) errs.push({ field: 'items', msg: t('cups.err.many', { max: LIMITS.items }) });
    if (st.coverBusy != null || st.items.some(r => r.busy != null)) errs.push({ field: 'upload', msg: t('cups.err.uploading') });
    return { errs, bad };
  }

  // ---- 기본 정보
  const titleCount = h('span', { class: 'cups-count' });
  const descCount = h('span', { class: 'cups-count' });
  const titleInput = h('input', {
    type: 'text', class: 'cups-input', value: st.title, maxlength: String(LIMITS.title), placeholder: t('cups.new.titlePh'),
    autocomplete: 'off', enterkeyhint: 'next',
    oninput: () => { st.title = titleInput.value; changed(); cover.draw(); },
  });
  const descInput = h('textarea', {
    class: 'cups-input', rows: '3', maxlength: String(LIMITS.desc), placeholder: t('cups.new.descPh'),
    oninput: () => { st.description = descInput.value; changed(); },
  });
  descInput.value = st.description;

  const cover = coverEditor({
    state: st, db, files,
    title: () => st.title.trim(),
    samples: () => filled().map(r => r.img).filter(r => refUrl(r, db)).slice(0, 4),
    onChange: () => changed(),
  });

  // ---- 항목
  const list = h('ol', { class: 'cups-rows' });
  const itemCount = h('span', { class: 'cups-items-count' });
  const errorBox = h('div', { class: 'cups-errors', role: 'alert' });
  const addInput = h('input', {
    type: 'text', class: 'cups-input', maxlength: String(LIMITS.name), placeholder: t('cups.items.addPh'), 'aria-label': t('cups.items.addPh'),
    autocomplete: 'off', enterkeyhint: 'done',
    onkeydown: e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addFromInput(); } },
    onpaste: e => onPaste(e, null),
  });

  function rowThumb(r) {
    const url = refUrl(r.img, db);
    const fallback = r.name.trim() ? defaultImage(r.name.trim()) : null;
    const inner = url ? pic(url, fallback, { class: refKind(r.img) === 'upload' ? 'fit-cover' : 'fit-contain' })
      : fallback ? pic(fallback, null, { class: 'fit-cover' }) : h('span', { class: 'cups-thumb-empty' }, ic('image'));
    return [
      inner,
      !url && fallback ? h('span', { class: 'cups-thumb-tag' }, t('cups.item.default')) : null,
      r.busy != null ? h('span', { class: 'cups-busy' }, h('span', { class: 'cups-spin', 'aria-hidden': 'true' }), h('span', { class: 'cups-busy-pct' }, `${Math.round(r.busy * 100)}%`)) : null,
    ].filter(Boolean);
  }

  function rowEl(r, i, bad) {
    const thumb = h('button', {
      type: 'button', class: `cups-thumb${r.img ? ' has-img' : ''}`, 'aria-label': t('cups.item.imgAria', { n: i + 1 }), 'aria-haspopup': 'menu',
      disabled: r.busy != null,
      onclick: () => imageMenu(r, thumb),
    }, rowThumb(r));
    // 사진을 끌어다 놓아도 올린다
    thumb.addEventListener('dragover', e => { if ([...(e.dataTransfer?.items || [])].some(x => x.kind === 'file')) { e.preventDefault(); thumb.classList.add('drop'); } });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('drop'));
    thumb.addEventListener('drop', e => {
      e.preventDefault();
      thumb.classList.remove('drop');
      const file = [...(e.dataTransfer?.files || [])].find(f => /^image\//.test(f.type));
      if (file) uploadInto(r, file);
    });
    let thumbTimer = null;
    const input = h('input', {
      type: 'text', class: 'cups-input cups-row-name', value: r.name, maxlength: String(LIMITS.name),
      placeholder: t('cups.item.namePh', { n: i + 1 }), 'aria-label': t('cups.item.nameAria', { n: i + 1 }), autocomplete: 'off',
      'aria-invalid': bad.has(r.k) ? 'true' : null,
      oninput: () => {
        r.name = input.value;
        changed();
        clearTimeout(thumbTimer);
        if (!r.img) thumbTimer = setTimeout(() => thumb.replaceChildren(...rowThumb(r)), 250);
      },
      onkeydown: e => {
        if (e.key === 'Enter' && !e.isComposing) {
          e.preventDefault();
          const next = list.querySelectorAll('.cups-row-name')[i + 1];
          if (next) next.focus(); else addInput.focus();
        }
      },
      onpaste: e => onPaste(e, r),
    });
    const last = i === st.items.length - 1;
    return h('li', { class: `cups-row${bad.has(r.k) ? ' bad' : ''}`, 'data-k': String(r.k) },
      h('span', { class: 'cups-row-no', 'aria-hidden': 'true' }, String(i + 1)),
      thumb,
      input,
      h('span', { class: 'cups-row-move' },
        h('button', { type: 'button', class: 'cups-icon-btn', disabled: i === 0, 'aria-label': t('cups.item.up', { n: i + 1 }), onclick: () => move(i, -1) }, ic('up')),
        h('button', { type: 'button', class: 'cups-icon-btn', disabled: last, 'aria-label': t('cups.item.down', { n: i + 1 }), onclick: () => move(i, 1) }, ic('down'))),
      h('button', { type: 'button', class: 'cups-icon-btn cups-row-del', 'aria-label': t('cups.item.remove', { n: i + 1 }), onclick: () => remove(i) }, ic('close')),
    );
  }

  function drawRows(focusK) {
    const { bad } = tried ? validate() : { bad: new Set() };
    // 이름 칸에 글을 쓰는 중이면 다시 그린 뒤에도 그 칸·커서를 그대로 둔다 (그림이 다 올라가 다시 그릴 때 등)
    const act = document.activeElement;
    const keep = !focusK && act?.classList.contains('cups-row-name') && list.contains(act)
      ? { k: act.closest('[data-k]')?.dataset.k, from: act.selectionStart, to: act.selectionEnd } : null;
    list.replaceChildren(...st.items.map((r, i) => rowEl(r, i, bad)));
    if (focusK) list.querySelector(`[data-k="${focusK}"] .cups-row-name`)?.focus();
    else if (keep?.k) {
      const el = list.querySelector(`[data-k="${keep.k}"] .cups-row-name`);
      if (el) {
        el.focus({ preventScroll: true });
        try { el.setSelectionRange(keep.from, keep.to); } catch { /* 없음 */ }
      }
    }
    drawCount();
  }

  function drawCount() {
    const n = filled().length;
    itemCount.textContent = t('cups.items.count', { n, max: LIMITS.items });
    itemCount.className = `cups-items-count ${n < LIMITS.itemsMin ? 'low' : n > LIMITS.items ? 'over' : 'ok'}`;
    const sizes = sizesFor(st.items.filter(r => r.name.trim()).length);
    sizeNote.textContent = sizes.length
      ? t('cups.items.sizes', { sizes: sizes.map(sizeLabel).join(' · ') })
      : t('cups.items.needMore', { n: Math.max(0, LIMITS.itemsMin - st.items.filter(r => r.name.trim()).length) });
  }
  const sizeNote = h('span', { class: 'cups-size-note' });

  function drawErrors() {
    if (!tried) { errorBox.replaceChildren(); return; }
    const { errs, bad } = validate();
    errorBox.replaceChildren(...(errs.length ? [h('ul', {}, [...new Set(errs.map(e => e.msg))].map(m => h('li', {}, m)))] : []));
    titleInput.setAttribute('aria-invalid', String(errs.some(e => e.field === 'title')));
    for (const li of list.children) {
      const k = Number(li.dataset.k);
      li.classList.toggle('bad', bad.has(k));
      li.querySelector('.cups-row-name')?.setAttribute('aria-invalid', String(bad.has(k)));
    }
  }

  function changed() {
    saveDraft();
    titleCount.textContent = `${strLen(st.title)}/${LIMITS.title}`;
    descCount.textContent = `${strLen(st.description)}/${LIMITS.desc}`;
    drawCount();
    drawErrors();
  }

  // 그림 붙여 넣기 (Ctrl+V): 이름 칸이면 그 항목에, 새 항목 칸이면 그림마다 새 항목.
  // 클립보드에 글자와 그림이 같이 있으면 그림을 쓴다. 이름은 그대로 둔다 (붙여 넣은 그림은 보통 'image.png').
  function pasteImages(e, row) {
    const imgs = clipImages(e.clipboardData);
    if (!imgs.length) return false;
    e.preventDefault();
    if (!row) { addImageRows(imgs, false); return true; }
    if (!st.items.includes(row)) return true;
    if (row.busy != null) { toast(t('cups.err.uploading')); return true; }
    const [first, ...rest] = imgs;
    uploadInto(row, first, false);
    if (rest.length) addImageRows(rest, false);
    return true;
  }

  // 여러 줄 붙여 넣기 → 줄마다 항목
  function onPaste(e, row) {
    if (pasteImages(e, row)) return;
    const text = e.clipboardData?.getData('text') || '';
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const total = lines.length;
    const blank = r => !r.name.trim() && !r.img && r.busy == null;
    let placed = 0;
    // 붙여 넣은 줄 다음부터 차례로: 빈 줄이면 채우고, 아니면 그 자리에 새 줄을 끼운다 (순서 유지)
    let pos = row ? st.items.indexOf(row) : st.items.findIndex(blank);
    if (pos < 0) pos = st.items.length;
    if (row) {
      if (blank(row)) { row.name = lines.shift().slice(0, LIMITS.name); placed++; }
      pos++;
    }
    const room = LIMITS.items - st.items.filter(r => !blank(r)).length;
    const take = lines.slice(0, Math.max(0, room));
    for (const line of take) {
      const name = line.slice(0, LIMITS.name);
      if (pos < st.items.length && blank(st.items[pos])) st.items[pos].name = name;
      else st.items.splice(pos, 0, newRow(name));
      pos++;
    }
    // 넘치는 빈 줄은 정리
    while (st.items.length > LIMITS.items) {
      const idx = st.items.findLastIndex(blank);
      if (idx < 0) break;
      st.items.splice(idx, 1);
    }
    placed += take.length;
    if (total > placed) toast(t('cups.toast.capped', { n: total - placed, max: LIMITS.items }));
    else toast(t('cups.toast.pasted', { n: placed }));
    if (!row) addInput.value = '';
    drawRows();
    changed();
  }

  function addFromInput() {
    const name = addInput.value.trim();
    if (!name) return;
    if (filled().length >= LIMITS.items) { toast(t('cups.toast.full', { max: LIMITS.items })); return; }
    const blank = st.items.find(r => !r.name.trim() && !r.img);
    if (blank) blank.name = name.slice(0, LIMITS.name);
    else st.items.push(newRow(name.slice(0, LIMITS.name)));
    addInput.value = '';
    drawRows();
    changed();
    addInput.focus();
    list.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }

  function addBlank() {
    if (st.items.length >= LIMITS.items) { toast(t('cups.toast.full', { max: LIMITS.items })); return; }
    const r = newRow();
    st.items.push(r);
    drawRows(r.k);
    changed();
  }

  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= st.items.length) return;
    [st.items[i], st.items[j]] = [st.items[j], st.items[i]];
    drawRows();
    changed();
    // 옮긴 줄의 같은 단추에 초점을 둔다
    const btn = list.children[j]?.querySelectorAll('.cups-row-move button')[d < 0 ? 0 : 1];
    (btn && !btn.disabled ? btn : list.children[j]?.querySelector('.cups-row-name'))?.focus();
  }

  function remove(i) {
    st.items.splice(i, 1);
    drawRows();
    changed();
    list.children[Math.min(i, st.items.length - 1)]?.querySelector('.cups-row-name')?.focus();
  }

  // 열린 그림 메뉴 { r, close } (메뉴가 열린 채 Ctrl+V 하면 그 항목에 넣는다)
  let openMenu = null;
  function imageMenu(r, anchor) {
    let close = () => {};
    const item = (icName, label, fn, cls = '') => h('button', { type: 'button', class: `acct-menu-item ${cls}`, role: 'menuitem', onclick: () => { close(); fn(); } }, ic(icName), h('span', {}, label));
    const menu = h('div', { class: 'acct-menu cups-img-menu', role: 'menu' },
      item('upload', t('cups.img.upload'), async () => { const [file] = await files.pick(); if (file) uploadInto(r, file); }),
      canReadClipboard() ? item('paste', t('cups.img.paste'), async () => {
        const file = await readClipboardImage();
        if (file && st.items.includes(r) && r.busy == null) uploadInto(r, file, false);
      }) : null,
      item('image', t('cups.img.game'), async () => {
        const got = await pickGameImage(db);
        if (!got || !st.items.includes(r)) return;
        r.img = got.ref;
        if (!r.name.trim()) r.name = got.name.slice(0, LIMITS.name);
        drawRows();
        changed();
        cover.draw();
      }),
      r.img ? item('close', t('cups.img.remove'), () => { r.img = null; drawRows(); changed(); cover.draw(); }, 'danger') : null,
    );
    const open = { r, close: () => close() };
    openMenu = open;
    close = ctx.popover(anchor, menu, () => { if (openMenu === open) openMenu = null; });
    menu.querySelector('button')?.focus();
  }

  // named: 이름이 비어 있으면 파일 이름을 넣는다 (붙여 넣은 그림은 false)
  async function uploadInto(r, file, named = true) {
    r.busy = 0;
    drawRows();
    changed();
    const setPct = p => {
      r.busy = p;
      const el = list.querySelector(`[data-k="${r.k}"] .cups-busy-pct`);
      if (el) el.textContent = `${Math.round(p * 100)}%`;
    };
    try {
      const ref = await uploadFile(file, setPct);
      r.img = ref;
      if (named && !r.name.trim()) r.name = fileLabel(file);
    } catch (err) {
      toast(uploadErrorText(err));
    }
    r.busy = null;
    if (!list.isConnected) { saveDraft(); return; }
    drawRows();
    changed();
    cover.draw();
  }

  // 사진 여러 장 → 사진마다 항목 하나 (빈 줄부터 채운다)
  // named: 이름은 파일 이름 (기기에서 고른 사진) | false: 이름 없이 (붙여 넣은 그림, 첫 항목의 이름 칸으로 간다)
  async function addImageRows(picked, named = true) {
    if (!picked.length) return;
    const blank = r => !r.name.trim() && !r.img && r.busy == null;
    const room = LIMITS.items - st.items.filter(r => !blank(r)).length;
    if (room <= 0) { toast(t('cups.toast.full', { max: LIMITS.items })); return; }
    const use = picked.slice(0, room);
    if (picked.length > use.length) toast(t('cups.toast.capped', { n: picked.length - use.length, max: LIMITS.items }));
    const rows = use.map(f => {
      const name = named ? fileLabel(f) : '';
      let r = st.items.find(blank);
      if (r) r.name = name;
      else st.items.push(r = newRow(name));
      r.busy = 0; // 차례를 기다리는 동안에도 '올리는 중' (빈 줄로 다시 잡히지 않게)
      return r;
    });
    drawRows(named ? undefined : rows[0].k);
    changed();
    // 하나씩 차례로 올린다
    for (let i = 0; i < rows.length; i++) {
      if (st.items.includes(rows[i])) await uploadInto(rows[i], use[i], named);
      else rows[i].busy = null;
    }
  }
  const addFromImages = async () => addImageRows(await files.pick({ multiple: true }));
  const addFromClipboard = async () => { const file = await readClipboardImage(); if (file) addImageRows([file], false); };

  // 편집 화면 어디서든 (글 칸이 아닌 곳) Ctrl+V 로 그림을 붙여 넣으면 새 항목. 화면을 떠나면 뗀다.
  function onDocPaste(e) {
    if (e.defaultPrevented || !form.isConnected) return;
    const el = e.target instanceof Element ? e.target : null;
    if (openMenu && el?.closest('.cups-img-menu')) { // 그림 메뉴가 열린 항목에
      const { r, close } = openMenu;
      if (pasteImages(e, r)) close();
      return;
    }
    if (document.body.classList.contains('modal-open') || el?.closest('[role="dialog"]')) return; // 다른 창
    if (isTextField(el)) return; // 제목·설명 등은 원래대로 (항목 칸은 저마다 onpaste 가 먼저 처리)
    pasteImages(e, null);
  }
  document.addEventListener('paste', onDocPaste);
  ctx.addCleanup(() => document.removeEventListener('paste', onDocPaste));

  // ---- 만들기
  const submitBtn = h('button', { class: 'btn primary cups-submit', type: 'submit' }, t('cups.new.submit'));
  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    tried = true;
    drawRows();
    drawErrors();
    const { errs } = validate();
    if (errs.length) {
      const firstBad = errs.some(x => x.field === 'title') ? titleInput : list.querySelector('.cups-row.bad .cups-row-name') || errorBox;
      firstBad.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      if (firstBad.focus) firstBad.focus({ preventScroll: true });
      return;
    }
    if (!(await requireLogin(t('cups.reason.create')))) return;
    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = t('cups.new.submitting');
    try {
      const body = {
        title: st.title.trim().replace(/\s+/g, ' '),
        description: st.description.trim(),
        cover: st.cover || null,
        items: filled().map(r => ({ name: r.name.trim().replace(/\s+/g, ' '), img: r.img || null })),
      };
      const res = await postCup(body);
      const id = res?.cup?.id;
      writeJson(DRAFT_KEY, null);
      toast(t('cups.new.done'));
      location.hash = id ? `#/cup/${enc(id)}` : listHref({ author: currentUser()?.id, sort: 'new' });
    } catch (err) {
      toast(createErrorText(err));
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t('cups.new.submit');
    }
  }

  function startOver() {
    if (!confirm(t('cups.draft.clearConfirm'))) return;
    writeJson(DRAFT_KEY, null);
    ctx.rerender();
  }

  const draftNote = restored ? h('div', { class: 'cups-draft' },
    h('span', {}, t('cups.draft.restored')), ' ', draft.at ? timeEl(draft.at) : null,
    h('button', { class: 'btn ghost small', type: 'button', onclick: startOver }, t('cups.draft.clear'))) : null;

  const form = h('form', { class: 'cups-form', novalidate: true, onsubmit: submit },
    h('section', { class: 'cups-panel' },
      h('h2', { class: 'cups-panel-title' }, h('span', { class: 'cups-step' }, '1'), t('cups.new.basic')),
      field(t('cups.new.titleLabel'), titleInput, titleCount, h('span', { class: 'cups-help' }, t('cups.new.titleHelp'))),
      field(t('cups.new.descLabel'), descInput, descCount),
    ),
    h('section', { class: 'cups-panel' },
      h('h2', { class: 'cups-panel-title' }, h('span', { class: 'cups-step' }, '2'), t('cups.new.items'), itemCount),
      h('p', { class: 'cups-help' }, t('cups.items.help')),
      h('p', { class: 'cups-help cups-help-sub' }, sizeNote),
      list,
      h('div', { class: 'cups-add' },
        addInput,
        h('button', { class: 'btn', type: 'button', onclick: addFromInput }, ic('plus'), t('cups.items.add'))),
      h('div', { class: 'cups-add-more' },
        h('button', { class: 'btn ghost small', type: 'button', onclick: addBlank }, ic('plus'), t('cups.items.addBlank')),
        h('button', { class: 'btn ghost small', type: 'button', onclick: addFromImages }, ic('upload'), t('cups.items.addImages')),
        canReadClipboard() ? h('button', { class: 'btn ghost small', type: 'button', onclick: addFromClipboard }, ic('paste'), t('cups.items.addPaste')) : null),
      h('p', { class: 'cups-help cups-paste-tip' }, t('cups.items.pasteTip')),
    ),
    h('section', { class: 'cups-panel' },
      h('h2', { class: 'cups-panel-title' }, h('span', { class: 'cups-step' }, '3'), t('cups.new.cover')),
      cover.el,
    ),
    h('div', { class: 'cups-submit-bar' },
      errorBox,
      h('p', { class: 'cups-help' }, t('cups.new.fixedNote')),
      h('div', { class: 'actions' },
        h('a', { class: 'btn ghost', href: '#/cups' }, t('acct.cancel')),
        submitBtn)),
    files.input,
  );

  ctx.render(
    cupsCrumbs([t('cups.new.title')]),
    h('header', { class: 'page-head cups-head' },
      h('div', { class: 'cups-head-text' },
        h('h1', {}, t('cups.new.title')),
        h('p', {}, t('cups.new.lead')))),
    draftNote,
    form,
  );
  drawRows();
  changed();
}

// POST /cups. auth.js 의 api() 와 같되, 항목 오류의 index 를 오류에 남긴다.
async function postCup(body) {
  let res;
  try {
    res = await fetch(`${API_BASE}/cups`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
  } catch {
    throw Object.assign(new Error('network'), { status: 0, code: 'network' });
  }
  let data = null;
  try { data = await res.json(); } catch { /* 본문 없음 */ }
  if (res.status === 401) dropSession();
  if (!res.ok) throw Object.assign(new Error(data?.error || 'http'), { status: res.status, code: data?.error || `http_${res.status}`, reason: data?.reason, index: data?.index });
  return data;
}

// POST /cups 오류 → 문구. 항목 오류는 index(0부터)로 몇 번째인지 알려 준다.
function createErrorText(err) {
  if (err?.status === 429 && err.reason === 'daily') return t('cups.err.daily');
  if (err?.status === 400) {
    const n = Number.isInteger(err.index) ? err.index + 1 : null;
    if (err.reason === 'title') return t('cups.err.title', { min: LIMITS.titleMin, max: LIMITS.title });
    if (err.reason === 'description') return t('cups.err.desc', { max: LIMITS.desc });
    if (err.reason === 'cover') return t('cups.err.badCover');
    if (err.reason === 'items') return t('cups.err.few', { min: LIMITS.itemsMin, n: '?' });
    if (n && err.reason === 'img') return t('cups.err.badImg', { n });
    if (n && (err.reason === 'name' || err.reason === 'item')) return t('cups.err.badName', { n });
  }
  return errorText(err);
}

const fileLabel = f => String(f?.name || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, LIMITS.name) || t('cups.item.untitled');

// ================================================================ 월드컵 하나 (#/cup/<id>)

// 순위 정렬: 'index'(우승 지수) | 'progress'(평균 진출도) | 'win'(승률) | 'titles'(우승 횟수).
// 고른 적이 없으면 대진 크기를 반영한 판이 충분할 때 우승 지수, 아니면 승률. (예전 열쇠의 'cup' 은 없어진 정렬이라 새 열쇠)
const RANK_SORT_KEY = 'sts2cup.rankSort2';
const RANK_SORTS = ['index', 'progress', 'win', 'titles'];
let lastCupTab = { id: null, tab: 'play' };

async function viewCup(id, ctx) {
  const token = ++viewToken;
  const db = ctx.db;
  ctx.render(cupsCrumbs(['…']), h('section', { class: 'empty' }, h('p', {}, t('acct.loading'))));
  let data;
  try {
    [data] = await Promise.all([api(`/cups/${enc(id)}`), fontsReady()]);
    if (!data?.cup) throw Object.assign(new Error('missing'), { status: 404 });
  } catch (err) {
    if (token !== viewToken) return;
    errorPage(ctx, err, cupsCrumbs([t('cups.missingShort')]));
    return;
  }
  if (token !== viewToken) return;

  const cup = data.cup;
  const items = (Array.isArray(data.items) ? data.items : []).filter(it => it && it.id != null).map(it => {
    const name = String(it.name ?? '');
    const fallback = defaultImage(name);
    return {
      id: it.id, name, ref: it.img, fallback,
      img: refUrl(it.img, db) || fallback,
      upload: refKind(it.img) === 'upload',
      champ: num(it.champ), entries: num(it.entries), wins: num(it.wins), losses: num(it.losses),
      expected: num(it.expected), progress: num(it.progress), tracked: num(it.tracked), trackedChamp: num(it.trackedChamp),
    };
  });
  let tab = lastCupTab.id === cup.id ? lastCupTab.tab : 'play';
  const savedSort = readJson(RANK_SORT_KEY, null);
  let rankSort = RANK_SORTS.includes(savedSort) ? savedSort : null; // null = 데이터를 보고 정한다
  let engine = null;
  ctx.addCleanup(() => engine?.destroy());
  let likeBusy = false;

  // ---- 소개
  const likeBtn = h('button', { type: 'button', class: 'cups-like', onclick: like });
  function drawLike() {
    likeBtn.replaceChildren(icon('heart'), h('span', {}, t('cups.like')), h('b', {}, String(num(cup.likes))));
    likeBtn.classList.toggle('on', Boolean(cup.myLike));
    likeBtn.setAttribute('aria-pressed', String(Boolean(cup.myLike)));
  }
  const statsEl = h('div', { class: 'cups-stats' });
  function drawStats() {
    statsEl.replaceChildren(
      h('span', {}, ic('list'), t('cups.card.items', { n: items.length })),
      h('span', {}, ic('play'), t('cups.stat.playsN', { n: num(cup.plays) })),
      h('span', {}, icon('chat'), t('cups.stat.commentsN', { n: num(cup.comments) })),
    );
  }

  async function like() {
    if (likeBusy) return;
    const wasIn = Boolean(currentUser());
    if (!(await requireLogin(t('cups.reason.like')))) return;
    likeBusy = true;
    try {
      if (!wasIn) {
        const fresh = (await api(`/cups/${enc(cup.id)}`).catch(() => null))?.cup;
        if (fresh) Object.assign(cup, { likes: fresh.likes, myLike: fresh.myLike });
      }
      const prev = { likes: num(cup.likes), myLike: Boolean(cup.myLike) };
      const on = !prev.myLike;
      cup.myLike = on;
      cup.likes = prev.likes + (on ? 1 : -1);
      drawLike();
      try {
        const res = await api(`/cups/${enc(cup.id)}/like`, { method: 'POST', body: { on } });
        if (res) { cup.likes = res.likes ?? cup.likes; cup.myLike = res.myLike ?? on; }
      } catch (err) {
        Object.assign(cup, prev);
        toast(errorText(err));
      }
      drawLike();
    } finally {
      likeBusy = false;
    }
  }

  async function share() {
    const url = `${location.origin}${location.pathname}${location.search}#/cup/${enc(cup.id)}`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: cup.title, url }); return; }
      await navigator.clipboard.writeText(url);
      toast(t('share.copied'));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      prompt(t('share.copyPrompt'), url);
    }
  }

  async function remove() {
    if (!confirm(t('cups.deleteConfirm'))) return;
    try {
      await api(`/cups/${enc(cup.id)}`, { method: 'DELETE' });
      toast(t('cups.deleted'));
      location.hash = isMine(cup) ? listHref({ author: currentUser()?.id }) : '#/cups';
    } catch (err) { toast(errorText(err)); }
  }

  const author = cup.author || {};
  const intro = h('header', { class: 'cups-intro' },
    coverVisual({ cover: cup.cover, sample: cup.sample || items.map(i => i.ref).filter(r => refUrl(r, db)).slice(0, 4), title: cup.title }, db, 'cups-intro-cover'),
    h('div', { class: 'cups-intro-main' },
      h('h1', { class: 'cups-intro-title' }, cup.title || '?'),
      cup.description ? h('p', { class: 'cups-intro-desc' }, cup.description) : null,
      h('div', { class: 'gal-post-meta cups-intro-meta' },
        avatar(author),
        author.id ? h('a', { class: 'gal-post-author', href: listHref({ author: author.id }) }, author.name || '?') : h('span', { class: 'gal-post-author' }, author.name || '?'),
        h('span', { class: 'gal-dot', 'aria-hidden': 'true' }, '·'),
        timeEl(cup.created),
        cup.hidden ? h('span', { class: 'gal-hidden-badge' }, t('gallery.hiddenBadge')) : null),
      statsEl,
      h('div', { class: 'cups-intro-actions' },
        likeBtn,
        h('button', { class: 'btn small', type: 'button', onclick: share }, ic('link'), t('cups.share')),
        canManage(cup) ? h('a', { class: 'btn small', href: `#/cup/${enc(cup.id)}/edit` }, icon('edit'), t('cups.edit')) : null,
        canManage(cup) ? h('button', { class: 'btn danger small', type: 'button', onclick: remove }, icon('trash'), t('acct.delete')) : null,
        !isMine(cup) ? h('button', { class: 'btn ghost small', type: 'button', onclick: () => reportDialog('cup', cup.id, 'cup', t('cups.reportLead')) }, icon('flag'), t('acct.report')) : null),
    ),
  );

  // ---- 탭: 하기 | 순위
  const tabs = h('div', { class: 'seg vs-tabs cups-tabs', role: 'tablist', 'aria-label': t('vs.tabAria') });
  const body = h('div', { class: 'cups-body' });
  function setTab(k) {
    if (tab === k) return;
    tab = k;
    lastCupTab = { id: cup.id, tab };
    drawTabs();
    drawBody();
  }
  function drawTabs() {
    tabs.replaceChildren(...[['play', t('vs.tab.play')], ['rank', t('vs.tab.rank')]].map(([k, label]) => h('button', {
      type: 'button', role: 'tab', class: tab === k ? 'on' : null, 'aria-selected': String(tab === k), onclick: () => setTab(k),
    }, label)));
  }

  // 판이 끝나면: 결과 보내기(한 번) + 화면의 수 고치기
  function onFinish({ champion, entrants, matches }) {
    queuePlay(cup.id, { champion: champion.id, entrants, matches });
    const byId = new Map(items.map(i => [i.id, i]));
    // 서버와 같은 계산 (bracket.js 의 runStats): 승패, 출전, 우승, 기대 우승 1/n, 진출도
    const { expected, items: stats } = runStats(entrants, matches);
    for (const eid of entrants) {
      const it = byId.get(eid);
      if (!it) continue;
      const won = eid === champion.id ? 1 : 0;
      it.entries++; it.champ += won; it.tracked++; it.trackedChamp += won;
      it.wins += stats[eid].w; it.losses += stats[eid].l;
      it.expected += expected; it.progress += stats[eid].p;
    }
    cup.plays = num(cup.plays) + 1;
    drawStats();
  }

  function drawPlay() {
    engine = mountWorldCup({
      storeKey: `sts2cup.run.${cup.id}`,
      title: cup.title,
      question: cup.title,
      items: items.map(i => ({ id: i.id, name: i.name, img: i.img })),
      kind: 'custom',
      imgFallback: it => defaultImage(it.name),
      mini: it => h('span', { class: 'cup-mini cups-mini' }, pic(it.img, defaultImage(it.name), { loading: 'lazy' })),
      onFinish,
      onRank: () => setTab('rank'),
    });
    return engine.el;
  }

  function drawRank() {
    const all = items.filter(i => i.entries > 0 || i.wins + i.losses > 0).map(i => ({
      i, m: cupMetrics(i), winRate: i.wins + i.losses ? i.wins / (i.wins + i.losses) : null,
    }));
    if (!all.length) {
      return h('div', { class: 'empty cups-rank-empty' },
        h('p', {}, t('cups.rank.empty')),
        h('p', {}, h('button', { class: 'btn primary', type: 'button', onclick: () => setTab('play') }, t('vs.tab.play'))));
    }
    // 고른 정렬이 없거나, 지수·진출도인데 그런 판이 하나도 없으면 데이터를 보고 정한다
    let sort = rankSort;
    if (!sort || ((sort === 'index' || sort === 'progress') && !all.some(r => r.m.tracked > 0))) {
      sort = enoughCupData(all.map(r => r.i)) ? 'index' : 'win';
    }
    const cupSort = sort === 'index' || sort === 'progress';
    for (const r of all) {
      const n = r.i.wins + r.i.losses;
      r.few = cupSort ? r.m.tracked < RANK_FEW : sort === 'win' ? n < RANK_FEW : r.i.entries < RANK_FEW;
    }
    const value = { index: r => r.m.index, progress: r => r.m.progress, win: r => r.winRate, titles: r => r.i.champ }[sort];
    const tie = (a, b) => b.i.champ - a.i.champ || (b.winRate ?? 0) - (a.winRate ?? 0) || b.i.wins - a.i.wins || b.i.entries - a.i.entries;
    const { top, few } = rankOrder(all, value, tie, cupSort);
    const rows = [...top, ...few];
    const maxIndex = Math.max(1, ...top.map(r => r.m.index ?? 0));
    const maxChamp = Math.max(1, ...rows.map(r => r.i.champ));
    const label = k => (k === 'win' ? t('cups.rank.byWin') : t(`wc.rank.${k}`));
    const sortSeg = h('div', { class: 'seg vs-rank-sort', role: 'group', 'aria-label': t('vs.rank.sort') },
      RANK_SORTS.map(k => h('button', {
        type: 'button', class: sort === k ? 'on' : null, 'aria-pressed': String(sort === k),
        onclick: () => { if (sort !== k) { rankSort = k; writeJson(RANK_SORT_KEY, k); drawBody(); } },
      }, label(k))));
    const unplayed = items.length - all.length;
    const help = sort === 'win' ? t('cups.rank.help') : t(`wc.rank.help.${sort}`);
    return h('section', { class: 'cups-rank-wrap' },
      h('div', { class: 'vs-rank-head' },
        h('p', { class: 'vs-rank-status' }, t('cups.rank.summary', { plays: num(cup.plays), n: all.length })),
        sortSeg),
      h('ol', { class: 'vs-rank cups-rank' }, rows.map((r, idx) => {
        const n = r.i.wins + r.i.losses;
        const pc = pct(r.i.champ, r.i.entries);
        const pw = pct(r.i.wins, n);
        const bar = sort === 'index' ? (r.m.index ?? 0) / maxIndex * 100
          : sort === 'progress' ? (r.m.progress ?? 0) * 100
            : sort === 'titles' ? r.i.champ / maxChamp * 100 : pw;
        const shown = sort === 'index' ? fmtIndex(r.m.index) : sort === 'progress' ? fmtProgress(r.m.progress)
          : sort === 'titles' ? String(r.i.champ) : (n ? `${pw}%` : '—');
        const stats = r.m.tracked > 0 ? t('wc.rank.stats', { i: fmtIndex(r.m.index), p: fmtProgress(r.m.progress) }) : null;
        return [
          cupSort && few.length && r === few[0] ? h('li', { class: 'vs-rank-few-sep', 'aria-hidden': 'true' }, t('wc.rank.fewSep', { n: RANK_FEW })) : null,
          h('li', { class: `vs-rank-row cups-rank-row${r.few ? ' few' : ''}` },
            h('span', { class: `vs-rank-no${idx < 3 && !r.few ? ` top top${idx + 1}` : ''}` }, String(idx + 1)),
            h('span', { class: 'cups-rank-img' }, pic(r.i.img, r.i.fallback, { class: r.i.upload ? 'fit-cover' : 'fit-contain', loading: 'lazy' })),
            h('span', { class: 'vs-rank-main' },
              h('span', { class: 'vs-rank-name' }, r.i.name),
              h('span', { class: `vs-rank-bar${sort !== 'win' ? ' is-cup' : ''}`, 'aria-hidden': 'true' },
                h('span', { style: { width: `${Math.max(0, Math.min(100, Math.round(bar)))}%` } })),
              h('span', { class: 'vs-rank-sub' },
                h('span', { class: `vs-rank-cup${r.i.champ ? ' has' : ''}` }, r.i.champ ? '🏆 ' : null, t('cups.rank.cup', { c: r.i.champ, e: r.i.entries, p: pc })),
                h('br'),
                n ? t('cups.rank.win', { w: r.i.wins, l: r.i.losses, p: pw }) : t('vs.rank.noGames'),
                stats ? [h('br'), stats] : null),
              imageReportButton(r.i)),
            h('span', { class: `vs-rank-rating${shown === '—' ? ' is-none' : ''}`, title: label(sort) }, shown),
          ),
        ];
      })),
      h('p', { class: 'help vs-rank-help' },
        help,
        cupSort ? ` ${t('wc.rank.few', { n: RANK_FEW })} ${t('wc.rank.since')}` : '',
        unplayed > 0 ? ` ${t('cups.rank.unplayed', { n: unplayed })}` : ''),
    );
  }

  // 올린 이미지 신고 (남의 월드컵에서만). 3명이 신고하면 그 이미지는 숨겨지고 기본 이미지로 보인다.
  function imageReportButton(it) {
    if (!it.upload || isMine(cup)) return null;
    return h('button', {
      class: 'cups-img-report', type: 'button',
      onclick: () => reportDialog('image', it.ref.slice(4), 'image', t('cups.reportImageLead', { name: short(it.name, 30) })),
    }, icon('flag'), t('cups.reportImage'));
  }

  function drawBody() {
    hideTip();
    engine?.destroy();
    engine = null;
    body.replaceChildren(tab === 'rank' ? drawRank() : drawPlay());
  }

  const comments = commentsSection({
    listPath: `/cups/${enc(cup.id)}/comments`,
    postPath: `/cups/${enc(cup.id)}/comments`,
    count: num(cup.comments),
    formFirst: false,
    onCount: n => { cup.comments = n; drawStats(); },
  });

  drawLike();
  drawStats();
  drawTabs();
  ctx.render(
    cupsCrumbs([short(cup.title)]),
    intro,
    h('div', { class: 'vs-controls cups-controls' }, tabs),
    body,
    comments,
  );
  drawBody();
}

// ================================================================ 고치기 (#/cup/<id>/edit)

async function viewEdit(id, ctx) {
  const token = ++viewToken;
  const db = ctx.db;
  if (!currentUser()) { loginGate(ctx, 'cups.edit.title', 'cups.edit.loginBody'); return; }
  ctx.render(cupsCrumbs(['…']), h('section', { class: 'empty' }, h('p', {}, t('acct.loading'))));
  let data;
  try {
    [data] = await Promise.all([api(`/cups/${enc(id)}`), fontsReady()]);
    if (!data?.cup) throw Object.assign(new Error('missing'), { status: 404 });
  } catch (err) {
    if (token !== viewToken) return;
    errorPage(ctx, err, cupsCrumbs([t('cups.missingShort')]));
    return;
  }
  if (token !== viewToken) return;
  const cup = data.cup;
  const items = Array.isArray(data.items) ? data.items : [];
  const back = `#/cup/${enc(cup.id)}`;
  const crumbs = cupsCrumbs([short(cup.title), back], [t('cups.edit.title')]);
  if (!canManage(cup)) {
    ctx.render(crumbs, h('section', { class: 'empty' }, h('h2', {}, t('acct.err.forbidden')), h('p', {}, h('a', { class: 'btn', href: back }, t('cups.backToCup')))));
    return;
  }
  const files = filePicker();
  const st = { title: String(cup.title || ''), description: String(cup.description || ''), cover: refKind(cup.cover) ? cup.cover : null, coverBusy: null };
  let tried = false;
  const titleCount = h('span', { class: 'cups-count' });
  const descCount = h('span', { class: 'cups-count' });
  const errorBox = h('div', { class: 'cups-errors', role: 'alert' });
  const titleInput = h('input', { type: 'text', class: 'cups-input', value: st.title, maxlength: String(LIMITS.title), autocomplete: 'off', oninput: () => { st.title = titleInput.value; update(); cover.draw(); } });
  const descInput = h('textarea', { class: 'cups-input', rows: '3', maxlength: String(LIMITS.desc), oninput: () => { st.description = descInput.value; update(); } });
  descInput.value = st.description;
  const cover = coverEditor({
    state: st, db, files,
    title: () => st.title.trim(),
    samples: () => (Array.isArray(cup.sample) ? cup.sample : items.map(i => i.img).filter(r => refUrl(r, db)).slice(0, 4)),
    onChange: () => update(),
  });
  function errors() {
    const out = [];
    const tl = strLen(st.title.trim());
    if (tl < LIMITS.titleMin || tl > LIMITS.title) out.push(t('cups.err.title', { min: LIMITS.titleMin, max: LIMITS.title }));
    if (strLen(st.description) > LIMITS.desc) out.push(t('cups.err.desc', { max: LIMITS.desc }));
    if (st.coverBusy != null) out.push(t('cups.err.uploading'));
    return out;
  }
  function update() {
    titleCount.textContent = `${strLen(st.title)}/${LIMITS.title}`;
    descCount.textContent = `${strLen(st.description)}/${LIMITS.desc}`;
    const errs = tried ? errors() : [];
    errorBox.replaceChildren(...(errs.length ? [h('ul', {}, errs.map(m => h('li', {}, m)))] : []));
    titleInput.setAttribute('aria-invalid', String(errs.length > 0 && strLen(st.title.trim()) < LIMITS.titleMin));
  }
  const save = h('button', { class: 'btn primary', type: 'submit' }, t('acct.save'));
  async function submit(e) {
    e.preventDefault();
    tried = true;
    update();
    if (errors().length) { titleInput.focus(); return; }
    const patch = {};
    const title = st.title.trim().replace(/\s+/g, ' ');
    const description = st.description.trim();
    if (title !== cup.title) patch.title = title;
    if (description !== (cup.description || '')) patch.description = description;
    if ((st.cover || null) !== (cup.cover || null)) patch.cover = st.cover || null;
    if (!Object.keys(patch).length) { location.hash = back; return; }
    save.disabled = true;
    try {
      await api(`/cups/${enc(cup.id)}`, { method: 'PATCH', body: patch });
      toast(t('cups.edit.saved'));
      location.hash = back;
    } catch (err) {
      toast(errorText(err));
      save.disabled = false;
    }
  }
  ctx.render(
    crumbs,
    h('header', { class: 'page-head cups-head' }, h('div', { class: 'cups-head-text' }, h('h1', {}, t('cups.edit.title')), h('p', {}, cup.title))),
    h('form', { class: 'cups-form', novalidate: true, onsubmit: submit },
      h('section', { class: 'cups-panel' },
        h('h2', { class: 'cups-panel-title' }, t('cups.new.basic')),
        field(t('cups.new.titleLabel'), titleInput, titleCount),
        field(t('cups.new.descLabel'), descInput, descCount)),
      h('section', { class: 'cups-panel' },
        h('h2', { class: 'cups-panel-title' }, t('cups.new.cover')),
        cover.el),
      h('section', { class: 'cups-panel' },
        h('h2', { class: 'cups-panel-title' }, t('cups.new.items'), h('span', { class: 'cups-items-count ok' }, t('cups.card.items', { n: items.length }))),
        h('p', { class: 'cups-fixed' }, h('span', { 'aria-hidden': 'true' }, '🔒 '), t('cups.edit.itemsFixed')),
        h('ul', { class: 'cups-fixed-list' }, items.map(it => {
          const name = String(it.name ?? '');
          return h('li', {},
            h('span', { class: 'cups-fixed-img' }, pic(refUrl(it.img, db) || defaultImage(name), defaultImage(name), { class: refKind(it.img) === 'upload' ? 'fit-cover' : 'fit-contain', loading: 'lazy' })),
            h('span', { class: 'cups-fixed-name' }, name));
        }))),
      h('div', { class: 'cups-submit-bar' },
        errorBox,
        h('div', { class: 'actions' },
          h('a', { class: 'btn ghost', href: back }, t('acct.cancel')),
          save)),
      files.input,
    ),
  );
  update();
}
