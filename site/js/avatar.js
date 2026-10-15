// 프로필 사진: 캐릭터 얼굴 5종 중 하나 또는 직접 올린 사진.
// 값: 'face:<캐릭터>' | 'img:<32hex>' (API 의 /img/<id>). 고르지 않았으면 사용자 id 로 정한 얼굴 (api/src/auth.js avatarOf 와 같은 계산).

import { t } from './i18n.js';
import { h, toast } from './ui.js';
import { API_BASE } from './balance.js';
import { currentUser, api, authHeaders, dropSession, errorText, openModal, updateUser } from './auth.js';
import { checkImageSafe, preloadImageCheck } from './nsfw.js';

export const FACES = ['ironclad', 'silent', 'regent', 'necrobinder', 'defect'];
const IMG_REF = /^img:[0-9a-f]{32}$/;
const SIZE = 256;           // 올리는 사진 한 변(px)
const MAX_BYTES = 300 * 1024; // 서버 한도
const MIN_PX = 16;            // 서버가 받는 가장 짧은 변

const isFace = v => typeof v === 'string' && v.startsWith('face:') && FACES.includes(v.slice(5));

export function defaultFace(userId) {
  let n = 0;
  for (const ch of String(userId || '')) n = (n * 31 + ch.charCodeAt(0)) % 9973;
  return `face:${FACES[n % FACES.length]}`;
}

export function avatarRef(user) {
  const v = user?.avatar;
  return isFace(v) || (typeof v === 'string' && IMG_REF.test(v)) ? v : defaultFace(user?.id);
}

const faceUrl = ref => `img/avatars/${ref.slice(5)}.webp`;
export const avatarUrl = ref => (IMG_REF.test(ref) ? `${API_BASE}/img/${ref.slice(4)}` : faceUrl(isFace(ref) ? ref : 'face:ironclad'));

export function avatar(user, cls = '') {
  const ref = avatarRef(user);
  const img = h('img', { class: `acct-av ${cls}`, src: avatarUrl(ref), alt: '', loading: 'lazy', decoding: 'async' });
  // 올린 사진이 지워졌거나 숨겨졌으면 기본 얼굴로
  if (!isFace(ref)) img.addEventListener('error', () => { img.src = faceUrl(defaultFace(user?.id)); }, { once: true });
  return img;
}

function faceName(ref, db) {
  const id = ref.slice(5);
  return db?.categories?.find(c => c.id === 'characters')?.byId?.get(id)?.name || id;
}

// ================================================================ 사진 고르기 창

export function avatarDialog(db) {
  const user = currentUser();
  if (!user) return;
  const current = avatarRef(user);
  let selected = current;
  let own = IMG_REF.test(current) ? current : null; // 올린 사진(이번 창에서 올렸거나 지금 쓰는 것)
  let busy = false;

  const preview = h('img', { class: 'acct-av av-pick-preview', alt: '' });
  const previewName = h('strong', { class: 'av-pick-name' });
  const faces = h('div', { class: 'av-pick-grid', role: 'radiogroup', 'aria-label': t('acct.avatarFaces') });
  const ownBox = h('div', { class: 'av-pick-own' });
  const status = h('p', { class: 'acct-help av-pick-status', 'aria-live': 'polite' });
  const save = h('button', { class: 'btn primary', type: 'button', onclick: submit }, t('acct.save'));
  const input = h('input', {
    type: 'file', accept: 'image/png,image/jpeg,image/webp,image/*', class: 'av-pick-file', tabindex: '-1', 'aria-hidden': 'true',
    onchange: () => { const file = input.files?.[0]; input.value = ''; if (file) upload(file); },
  });
  const uploadBtn = h('button', { class: 'btn small', type: 'button', onclick: () => { if (!busy) input.click(); } }, t('acct.avatarUpload'));
  // 클립보드의 그림: 창이 열려 있는 동안 Ctrl+V(⌘V), 또는 붙여넣기 단추(navigator.clipboard.read 가 되는 브라우저만)
  const pasteBtn = navigator.clipboard?.read ? h('button', { class: 'btn small', type: 'button', onclick: pasteFromButton }, t('acct.avatarPaste')) : null;
  const onPaste = e => {
    const file = [...(e.clipboardData?.files || [])].find(f => /^image\//.test(f.type));
    if (!file || busy) return;
    e.preventDefault();
    upload(file);
  };
  document.addEventListener('paste', onPaste);
  preloadImageCheck();

  const option = (ref, label) => h('button', {
    class: `av-pick-opt${ref === selected ? ' on' : ''}`, type: 'button', role: 'radio',
    'aria-checked': String(ref === selected), 'aria-label': label, title: label,
    onclick: () => { selected = ref; draw(); },
  }, h('img', { src: avatarUrl(ref), alt: '', decoding: 'async' }));

  function draw() {
    preview.src = avatarUrl(selected);
    previewName.textContent = isFace(selected) ? faceName(selected, db) : t('acct.avatarOwn');
    faces.replaceChildren(...FACES.map(f => {
      const ref = `face:${f}`;
      const btn = option(ref, faceName(ref, db));
      if (ref === defaultFace(user.id)) btn.append(h('span', { class: 'av-pick-badge' }, t('acct.avatarDefault')));
      return btn;
    }));
    ownBox.replaceChildren(...[own && option(own, t('acct.avatarOwn')), uploadBtn, pasteBtn, input].filter(Boolean));
    save.disabled = busy || selected === current;
    if (pasteBtn) pasteBtn.disabled = busy;
  }

  async function pasteFromButton() {
    if (busy) return;
    let file = null;
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find(x => x.startsWith('image/'));
        if (type) { const blob = await item.getType(type); file = new File([blob], 'clipboard', { type }); break; }
      }
    } catch {
      status.classList.add('error');
      status.textContent = t('acct.avatarPasteDenied');
      return;
    }
    if (!file) {
      status.classList.add('error');
      status.textContent = t('acct.avatarPasteEmpty');
      return;
    }
    upload(file);
  }

  async function upload(file) {
    busy = true;
    uploadBtn.disabled = true;
    status.classList.remove('error');
    status.textContent = t('acct.avatarUploading', { p: 0 });
    draw();
    try {
      const blob = await squareImage(file);
      // 브라우저 검사(야한 그림이면 올리지 않음). 서버도 다시 검사한다.
      if (!(await checkImageSafe(blob)).ok) throw Object.assign(new Error('nsfw'), { code: 'img_nsfw' });
      own = await uploadBlob(blob, p => { status.textContent = t('acct.avatarUploading', { p: Math.round(p * 100) }); });
      selected = own;
      status.textContent = '';
    } catch (err) {
      status.classList.add('error');
      status.textContent = uploadErrorText(err);
    } finally {
      busy = false;
      uploadBtn.disabled = false;
      draw();
    }
  }

  async function submit() {
    if (busy || selected === current) return;
    busy = true;
    save.disabled = true;
    try {
      const res = await api('/me', { method: 'PATCH', body: { avatar: selected } });
      updateUser(res?.user || { ...user, avatar: selected });
      toast(t('acct.avatarSaved'));
      m.close();
    } catch (err) {
      toast(errorText(err));
    } finally {
      busy = false;
      if (!m.closed) draw();
    }
  }

  const body = h('div', { class: 'av-pick' },
    h('div', { class: 'av-pick-head' }, preview, previewName),
    h('h3', { class: 'av-pick-sub' }, t('acct.avatarFaces')),
    faces,
    h('h3', { class: 'av-pick-sub' }, t('acct.avatarOwn')),
    ownBox,
    h('p', { class: 'acct-help' }, t('acct.avatarHelp')),
    status,
    h('div', { class: 'acct-form-actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => m.close() }, t('acct.cancel')),
      save),
  );
  const m = openModal({ title: t('acct.avatarTitle'), body, className: 'acct-small av-pick-modal', onClose: () => { m.closed = true; document.removeEventListener('paste', onPaste); } });
  draw();
  faces.querySelector('[aria-checked="true"]')?.focus();
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
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

// 가운데를 정사각형으로 잘라 256px webp(안 되면 어두운 바탕 jpeg)로.
async function squareImage(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw Object.assign(new Error('type'), { code: 'img_type' });
  let src;
  try { src = await decodeImage(file); } catch { throw Object.assign(new Error('decode'), { code: 'img_decode' }); }
  const W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
  if (!W || !H) throw Object.assign(new Error('decode'), { code: 'img_decode' });
  const side = Math.min(W, H);
  if (side < MIN_PX) { src.close?.(); throw Object.assign(new Error('dimensions'), { code: 'img_dimensions' }); }
  const out = Math.min(SIZE, side);
  const c = document.createElement('canvas');
  c.width = c.height = out;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2834';
  g.fillRect(0, 0, out, out);
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, (W - side) / 2, (H - side) / 2, side, side, 0, 0, out, out);
  src.close?.();
  for (const q of [0.85, 0.7, 0.55]) {
    let blob = await canvasBlob(c, 'image/webp', q);
    if (!blob || blob.type !== 'image/webp') blob = await canvasBlob(c, 'image/jpeg', q);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw Object.assign(new Error('too_big'), { status: 413, code: 'too_big' });
}

// POST /images (원본 바이트). 올리는 동안 onProgress(0–1). → 'img:<hex>'
function uploadBlob(blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/images?purpose=avatar`);
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
