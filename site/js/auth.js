// 구글 로그인 상태와 API 호출.
// 다른 모듈은 currentUser / authHeaders / onAuthChange / requireLogin / loginEnabled 를 쓴다.
// 로그인: Google Identity Services 버튼 → POST /auth/google → 세션 토큰을 localStorage 에 보관.

import { GOOGLE_CLIENT_ID } from './config.js';
import { t, lang } from './i18n.js';
import { h, toast } from './ui.js';
import { API_BASE, voterId } from './balance.js';

const SESSION_KEY = 'sts2.session.v1';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
// GIS 버튼 언어
const GIS_LOCALE = { ko: 'ko', en: 'en', ja: 'ja', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW' };

function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (s && typeof s.token === 'string' && s.user && typeof s.user.id === 'string') return s;
  } catch { /* 저장소 없음 */ }
  return null;
}
function writeSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* 저장소 없음 */ }
}

let session = loginEnabled() ? readSession() : null;
const listeners = new Set();
function emit() {
  const u = currentUser();
  for (const fn of [...listeners]) {
    try { fn(u); } catch (err) { console.error(err); }
  }
}

// 로그인한 사용자 { id, name, picture, admin } 또는 null
export function currentUser() { return session?.user || null; }
// fetch 에 붙일 헤더: 로그인 상태면 { Authorization: 'Bearer …' }, 아니면 {}
export function authHeaders() { return session ? { Authorization: `Bearer ${session.token}` } : {}; }
// 로그인 상태가 바뀔 때 fn(user) 호출. 해제 함수를 돌려준다.
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
// 로그인 기능이 켜져 있는가 (클라이언트 ID 설정 여부)
export function loginEnabled() { return Boolean(GOOGLE_CLIENT_ID); }

function setSession(s) {
  session = s;
  writeSession(s);
  emit();
}

// 서버가 토큰을 거절했을 때(만료 등): 이 브라우저의 로그인만 푼다.
export function dropSession({ quiet = false } = {}) {
  if (!session) return;
  setSession(null);
  if (!quiet) toast(t('acct.expired'));
}

// 이름을 바꾸는 등 사용자 정보가 바뀌었을 때
export function updateUser(user) {
  if (!session || !user || user.id !== session.user.id) return;
  setSession({ ...session, user: { ...session.user, ...user } });
}

// 다른 탭에서 로그인·로그아웃하면 따라간다.
window.addEventListener('storage', e => {
  if (e.key !== SESSION_KEY || !loginEnabled()) return;
  const next = readSession();
  if ((next?.token || null) === (session?.token || null)) return;
  session = next;
  emit();
});

// ---- API ----

// API 호출. 실패하면 Error(code) 를 던진다: err.status, err.code ('auth', 'rate', 'network' …)
export async function api(path, { method = 'GET', body, keepalive = false, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const withAuth = auth && session;
  if (withAuth) Object.assign(headers, authHeaders());
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method, headers, keepalive,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw apiError(0, 'network');
  }
  let data = null;
  try { data = await res.json(); } catch { /* 본문 없음 */ }
  if (res.status === 401 && withAuth) {
    dropSession();
    // 공개 요청이면 로그인 없이 한 번 더
    if (method === 'GET') return api(path, { method, auth: false });
  }
  if (!res.ok) throw apiError(res.status, data?.error || `http_${res.status}`, data?.reason);
  return data;
}

function apiError(status, code, reason) {
  const err = new Error(code);
  err.status = status;
  err.code = code;
  err.reason = reason;
  return err;
}

// 사용자에게 보여 줄 오류 문구
export function errorText(err) {
  const code = err?.code;
  if (code === 'network') return t('acct.err.network');
  if (code === 'auth') return t('acct.err.auth');
  if (code === 'login_disabled') return t('acct.err.loginDisabled');
  // 올린 이미지가 검열에 걸림 (차단 목록·AI 판정, API.md 이미지 검열)
  if (code === 'blocked') return t('acct.err.blocked');
  if (code === 'storage_full') return t('acct.err.storageFull');
  if (err?.status === 429 && err.reason === 'site_daily') return t('acct.err.siteDaily');
  if (err?.status === 429 && err.reason === 'daily') return t('acct.err.daily');
  if (code === 'rate' || code === 'rate_limited' || err?.status === 429) return t('acct.err.rate');
  if (err?.status === 400 && err.reason === 'empty') return t('gallery.publishEmpty');
  if (err?.status === 404) return t('acct.err.notFound');
  if (err?.status === 403) return t('acct.err.forbidden');
  if (err?.status === 413) return t('acct.err.tooBig');
  return t('acct.err.generic');
}

// ---- 창(모달) ----
// 상세 창(z 70) 위에도 뜬다. Esc·바깥 클릭으로 닫힌다. { el, close } 를 돌려준다.
export function openModal({ title, body, className = '', onClose, labelledBy } = {}) {
  const restore = document.activeElement;
  const titleId = `m-${Math.random().toString(36).slice(2, 8)}`;
  const panel = h('div', {
    class: `acct-modal ${className}`, role: 'dialog', 'aria-modal': 'true',
    'aria-labelledby': labelledBy || titleId, tabindex: '-1',
  },
    h('button', { class: 'acct-modal-close', type: 'button', 'aria-label': t('acct.close'), onclick: () => close() }, '×'),
    title && h('h2', { class: 'acct-modal-title', id: titleId }, title),
    body,
  );
  const backdrop = h('div', { class: 'acct-modal-backdrop', onclick: e => { if (e.target === backdrop) close(); } }, panel);
  // 상세 창의 Esc 처리보다 먼저 받아서 이 창만 닫는다.
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
  };
  window.addEventListener('keydown', onKey, true);
  const hadModal = document.body.classList.contains('modal-open');
  document.body.append(backdrop);
  document.body.classList.add('modal-open');
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('hashchange', close);
    backdrop.remove();
    if (!hadModal) document.body.classList.remove('modal-open');
    onClose?.();
    restore?.focus?.({ preventScroll: true });
  }
  window.addEventListener('hashchange', close);
  const first = panel.querySelector('input, textarea, button:not(.acct-modal-close)');
  (first || panel).focus({ preventScroll: true });
  return { el: panel, close };
}

// ---- Google Identity Services ----

let gisLoading = null;
let gisReady = false;
let pending = null; // 로그인 창: { close, resolve, setStatus }

function loadGis() {
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) { resolve(); return; }
      const s = document.createElement('script');
      s.src = GIS_SRC;
      s.async = true;
      s.onload = () => (window.google?.accounts?.id ? resolve() : reject(new Error('gis')));
      s.onerror = () => { gisLoading = null; s.remove(); reject(new Error('gis')); };
      document.head.append(s);
    });
  }
  return gisLoading.then(() => {
    if (gisReady) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      itp_support: true,
      use_fedcm_for_prompt: true,
    });
    gisReady = true;
  });
}

// 로그인 버튼에 마우스를 올리면 미리 불러 둔다.
export function preloadLogin() {
  if (loginEnabled()) loadGis().catch(() => {});
}

async function onCredential(resp) {
  const credential = resp?.credential;
  if (!credential) return;
  pending?.setStatus(t('acct.signingIn'));
  try {
    const data = await api('/auth/google', { method: 'POST', body: { credential, voter: voterId() }, auth: false });
    if (!data?.token || !data?.user?.id) throw apiError(500, 'bad_response');
    setSession({ token: data.token, user: data.user });
    toast(t('acct.welcome', { name: data.user.name }));
    const p = pending;
    pending = null;
    p?.resolve(true);
    p?.close();
  } catch (err) {
    pending?.setStatus(errorText(err), true);
  }
}

// 로그인 창을 띄운다. 로그인하면 true, 닫으면 false.
export function openLogin(reason) {
  if (currentUser()) return Promise.resolve(true);
  if (!loginEnabled()) { toast(t('acct.err.loginDisabled')); return Promise.resolve(false); }
  if (pending) { pending.close(); }
  return new Promise(resolve => {
    const slot = h('div', { class: 'acct-gbtn' }, h('span', { class: 'acct-loading' }, t('acct.loadingGoogle')));
    const status = h('p', { class: 'acct-status', role: 'status', 'aria-live': 'polite' });
    const body = h('div', { class: 'acct-login' },
      reason && h('p', { class: 'acct-reason' }, reason),
      h('ul', { class: 'acct-perks' },
        h('li', {}, t('acct.perk.sync')),
        h('li', {}, t('acct.perk.gallery')),
        h('li', {}, t('acct.perk.comments')),
      ),
      slot,
      status,
      h('p', { class: 'acct-privacy' }, t('acct.privacy')),
    );
    let done = false;
    const m = openModal({
      title: t('acct.loginTitle'), body, className: 'acct-login-modal',
      onClose: () => { if (pending?.resolve === finish) pending = null; finish(false); },
    });
    function finish(v) { if (!done) { done = true; resolve(v); } }
    pending = {
      close: m.close,
      resolve: finish,
      setStatus: (msg, isError = false) => { status.textContent = msg; status.classList.toggle('error', isError); },
    };
    loadGis().then(() => {
      slot.replaceChildren();
      const width = Math.min(320, Math.max(200, slot.clientWidth || 280));
      window.google.accounts.id.renderButton(slot, {
        type: 'standard', theme: 'filled_black', size: 'large', text: 'signin_with',
        shape: 'pill', logo_alignment: 'left', width, locale: GIS_LOCALE[lang] || 'en',
      });
    }).catch(() => {
      slot.replaceChildren(h('p', { class: 'acct-status error' }, t('acct.err.gis')));
    });
  });
}

// 로그인이 필요한 동작 전에: 로그인 창을 띄우고, 로그인하면 true
export async function requireLogin(reason) {
  if (currentUser()) return true;
  return openLogin(reason);
}

export async function logout() {
  if (!session) return;
  const headers = authHeaders();
  setSession(null);
  try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch { /* 무시 */ }
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers, keepalive: true });
  } catch { /* 세션은 서버에서 만료된다 */ }
  toast(t('acct.loggedOut'));
}

// 페이지를 열 때: 저장된 토큰이 아직 유효한지 확인하고 내 정보(투표·티어표)를 받는다.
// 유효하면 GET /me 응답, 로그아웃 상태이거나 서버에 닿지 못하면 null.
export async function fetchMe() {
  if (!session) return null;
  try {
    const me = await api('/me');
    if (!session) return null; // 401 로 풀림
    if (me?.user) updateUser(me.user);
    return me;
  } catch {
    return null;
  }
}
