// 용어 팝업: 효과 문구 속 카드·인챈트·키워드·버프/디버프 이름에 마우스를 올리거나(데스크톱) 누르면(모바일·클릭)
// 그 용어의 그림·설명을 작은 상자로 보여 준다. 상자 안의 용어도 한 번 더 열 수 있다 (두 단계까지).
//
// 영어 문구에는 수집 스크립트가 <b data-ref="키"> 를 달아 두었다. 번역 문구는 게임 문장이라 표시가 없으므로
// 그 항목이 가리키는 키 목록(item.refs)의 번역 이름을 문구에서 찾아 연결한다.
// 텍스트(설명 HTML)는 수집 스크립트가 이스케이프한 뒤 만든 것이다.

import { h } from './ui.js';
import { t, lang } from './i18n.js';
import { rarityName, typeName } from './data.js';

const MAX_DEPTH = 2; // 문구 속 용어(1) → 상자 속 용어(2)
const OPEN_DELAY = 120;
const CLOSE_DELAY = 220;

let db = null;
const stack = []; // 열린 상자: { anchor, el, depth, pinned }
let openTimer = 0;
let closeTimer = 0;

// el 안의 용어를 팝업 단추로 만든다. refs: 번역 문구에서 찾아 연결할 키 목록.
export function linkRefs(el, database, refs = null, depth = 1) {
  if (!el || !database || depth > MAX_DEPTH) return el;
  db = database;
  install();
  for (const b of el.querySelectorAll('[data-ref]')) decorate(b, depth);
  if (refs?.length && lang !== 'en') {
    for (const key of refs) {
      if (el.querySelector(`.ref[data-ref="${CSS.escape(key)}"]`)) continue;
      const term = db.term(key);
      if (!term?.name) continue;
      const hit = findText(el, term.name);
      if (hit) decorate(hit, depth, key);
    }
  }
  return el;
}

function decorate(node, depth, key = node.dataset.ref) {
  if (!db.term(key)) { node.removeAttribute('data-ref'); return; }
  node.dataset.ref = key;
  node.dataset.depth = String(depth);
  node.classList.add('ref');
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', '0');
  node.setAttribute('aria-haspopup', 'dialog');
}

// 문구에서 name 을 찾아 그 부분을 <b> 로 감싼다. 이미 굵게 쓴 같은 낱말(<b>취약</b>)을 먼저 쓴다.
function findText(el, name) {
  for (const b of el.querySelectorAll('b:not(.ref)')) if (b.textContent.trim() === name) return b;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentElement.closest('.ref') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const i = n.data.indexOf(name);
    if (i === -1) continue;
    const word = n.splitText(i);
    word.splitText(name.length);
    const b = h('b', {}, name);
    word.replaceWith(b);
    return b;
  }
  return null;
}

// ---------------------------------------------------------------- 열고 닫기

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  // 데스크톱: 마우스를 올리면 열고, 벗어나면 닫는다. 눌러 두면(고정) 벗어나도 남는다.
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const ref = e.target.closest?.('.ref');
    if (ref) {
      clearTimeout(closeTimer);
      if (stack.some(s => s.anchor === ref)) return;
      clearTimeout(openTimer);
      openTimer = setTimeout(() => open(ref, false), OPEN_DELAY);
      return;
    }
    if (e.target.closest?.('.ref-pop')) clearTimeout(closeTimer);
  });
  document.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse') return;
    const from = e.target.closest?.('.ref, .ref-pop');
    if (!from || from.contains(e.relatedTarget)) return;
    if (from.classList.contains('ref')) clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeUnpinned, CLOSE_DELAY);
  });
  // 누르면(마우스·터치·키보드) 고정해서 연다. 다시 누르면 닫는다.
  document.addEventListener('click', e => {
    const ref = e.target.closest?.('.ref');
    if (ref) {
      e.preventDefault();
      e.stopPropagation();
      const cur = stack.find(s => s.anchor === ref);
      if (cur?.pinned) closeFrom(stack.indexOf(cur));
      else open(ref, true);
      return;
    }
    if (!e.target.closest?.('.ref-pop')) closeAll();
  }, true);
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('ref')) {
      e.preventDefault();
      open(e.target, true);
    } else if (e.key === 'Escape' && stack.length) {
      // 상세 창보다 먼저: 가장 위 상자만 닫는다
      e.stopPropagation();
      e.preventDefault();
      const top = stack[stack.length - 1];
      closeFrom(stack.length - 1);
      top.anchor.focus?.({ preventScroll: true });
    }
  }, true);
  window.addEventListener('resize', closeAll);
  window.addEventListener('scroll', e => { if (!e.target.closest?.('.ref-pop')) closeAll(); }, true);
}

function open(anchor, pinned) {
  if (!anchor.isConnected) return;
  const depth = Number(anchor.dataset.depth || 1);
  const existing = stack.find(s => s.anchor === anchor);
  if (existing) { existing.pinned ||= pinned; return; }
  // 같은 단계 이상 상자는 닫고 연다 (부모 상자는 둔다)
  closeFrom(stack.findIndex(s => s.depth >= depth));
  const term = db.term(anchor.dataset.ref);
  if (!term) return;
  const el = card(term, depth);
  document.body.append(el);
  place(el, anchor);
  stack.push({ anchor, el, depth, pinned });
  anchor.setAttribute('aria-expanded', 'true');
}

function closeUnpinned() {
  // 마우스가 상자나 그 용어 위에 있으면 남긴다
  const hovered = document.querySelectorAll(':hover');
  const over = [...hovered].some(n => n.classList?.contains('ref-pop') || n.classList?.contains('ref'));
  if (over) return;
  for (let i = stack.length - 1; i >= 0; i--) if (!stack[i].pinned) closeFrom(i);
}

function closeFrom(i) {
  if (i < 0) return;
  for (const s of stack.splice(i)) {
    s.el.remove();
    s.anchor.removeAttribute('aria-expanded');
  }
}

export function closeAll() {
  clearTimeout(openTimer);
  clearTimeout(closeTimer);
  closeFrom(0);
}

// 용어 아래(자리가 없으면 위)에, 화면 안쪽으로
function place(el, anchor) {
  const r = anchor.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  el.style.maxWidth = `${Math.min(320, vw - 16)}px`;
  const box = el.getBoundingClientRect();
  let x = Math.min(Math.max(8, r.left), vw - box.width - 8);
  let y = r.bottom + 6;
  if (y + box.height > vh - 8 && r.top - box.height - 6 > 8) y = r.top - box.height - 6;
  y = Math.max(8, Math.min(y, vh - box.height - 8));
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}

// ---------------------------------------------------------------- 상자 내용

const strip = html => String(html || '').replace(/<span class="up">\([\s\S]*?\)<\/span>/g, '');

function card(term, depth) {
  let img, title, meta, text, refs = null, isCard = false;
  if (term.kind === 'item') {
    const { item, category } = term;
    isCard = category.tile === 'card';
    img = item.img;
    meta = [
      t(`cat.${category.id}`),
      item.rarity && rarityName(item.rarity),
      item.type && typeName(item.type),
      item.cost != null && item.cost !== '' && t('tip.cost', { n: item.cost === -1 ? 'X' : item.cost }),
    ];
    text = strip(item.text);
    refs = item.refs;
    title = item.name;
  } else {
    isCard = term.type === 'card';
    img = term.img;
    meta = [
      t(`ref.type.${term.type}`),
      term.cardType && typeName(term.cardType),
      term.cost != null && term.cost !== '' && term.cost >= 0 && t('tip.cost', { n: term.cost }),
    ];
    text = term.text;
    title = term.name;
  }
  const sub = term.nameEn && term.nameEn !== title ? term.nameEn : null;
  const body = h('div', { class: 'tip-text ref-text', html: text });
  const el = h('div', { class: `ref-pop${isCard ? ' is-card' : ''}`, role: 'dialog', 'aria-label': title, 'data-depth': String(depth) },
    img && h('img', { class: 'ref-img', src: img, alt: '', loading: 'lazy', onerror: e => e.target.remove() }),
    h('div', { class: 'ref-body' },
      h('div', { class: 'tip-title' }, title),
      (sub || meta.some(Boolean)) && h('div', { class: 'tip-meta' }, [sub, ...meta].filter(Boolean).join(' · ')),
      body,
      term.kind === 'term' && term.textEn && h('div', { class: 'ref-note' }, t('ref.englishText'))));
  linkRefs(body, db, refs, depth + 1);
  return el;
}
