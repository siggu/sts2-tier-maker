// 공용 UI 조각: 타일, 툴팁, 토스트, 보드.

import { enableDrag } from './dnd.js';
import { rarityKo, typeKo } from './data.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}


export function tile(item, template, extra = {}) {
  const el = h('div', {
    class: `tile tile-${template.tile}${item.img ? '' : ' no-img'}`,
    'data-id': item.id,
    tabindex: '0',
    role: 'button',
    'aria-label': item.name,
    ...extra,
  });
  if (item.img) {
    el.append(h('img', { src: item.img, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }));
  } else {
    el.append(h('span', { class: 'tile-name' }, item.name));
  }
  return el;
}

// ---- 툴팁 ----

const tipEl = () => document.getElementById('tooltip');
let tipFor = null;

export function attachTooltips(root, lookup) {
  root.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' || document.body.classList.contains('is-dragging')) return;
    const t = e.target.closest('.tile');
    if (!t || t === tipFor) return;
    const item = lookup(t.dataset.id);
    if (item) showTip(t, item);
  });
  root.addEventListener('pointerout', e => {
    const t = e.target.closest('.tile');
    if (t && !t.contains(e.relatedTarget)) hideTip();
  });
}

export function itemDetails(item) {
  const meta = [
    item.nameEn,
    item.groupName,
    item.rarity && rarityKo(item.rarity),
    item.type && typeKo(item.type),
    item.cost != null && item.cost !== '' && `코스트 ${item.cost}`,
  ].filter(Boolean).join(' · ');
  return [
    h('div', { class: 'tip-title' }, item.name),
    meta && h('div', { class: 'tip-meta' }, meta),
    // text 는 수집 스크립트가 이스케이프한 뒤 만든 HTML 이다.
    item.text && h('div', { class: 'tip-text', html: item.text }),
  ];
}

export function showTip(anchor, item) {
  const tip = tipEl();
  tipFor = anchor;
  tip.replaceChildren(...itemDetails(item));
  tip.hidden = false;
  const r = anchor.getBoundingClientRect();
  const tr = tip.getBoundingClientRect();
  let x = r.right + 10;
  if (x + tr.width > innerWidth - 8) x = r.left - tr.width - 10;
  if (x < 8) x = Math.min(innerWidth - tr.width - 8, Math.max(8, r.left));
  let y = r.top;
  if (y + tr.height > innerHeight - 8) y = innerHeight - tr.height - 8;
  tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(8, y))}px)`;
}

export function hideTip() {
  tipFor = null;
  tipEl().hidden = true;
}

// ---- 토스트 ----

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---- 보드 ----
// rows: [{ label, color, items: [id], sub? }]
// 줄 index -1 은 아래쪽 미배치 영역(pool).

export function board({ template, rows, pool, onMove, onRowMenu, decorate, readonly = false, poolTitle = '배치하지 않은 항목' }) {
  const root = h('div', { class: `board${readonly ? ' readonly' : ''}` });
  let selected = null;
  const lookup = id => template.byId.get(id);

  const rowEls = rows.map((row, ri) => {
    const label = h('div', { class: 'row-label', style: { '--tier': row.color } },
      h('span', { class: 'row-label-text' }, row.label),
      row.sub && h('span', { class: 'row-label-sub' }, row.sub),
    );
    if (onRowMenu && !readonly) {
      label.classList.add('editable');
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      label.setAttribute('aria-label', `${row.label} 줄 편집`);
      label.addEventListener('click', () => onRowMenu(ri, label));
    }
    const items = h('div', { class: 'zone-items' }, row.items.map(id => {
      const item = lookup(id);
      if (!item) return null;
      const t = tile(item, template);
      decorate?.(t, item, ri);
      return t;
    }));
    return h('div', { class: 'row', 'data-zone': String(ri), style: { '--tier': row.color } }, label, items);
  });

  const rowsEl = h('div', { class: 'rows' }, rowEls);
  root.append(rowsEl);

  let poolEl = null;
  if (pool) {
    poolEl = h('section', { class: 'pool', 'data-zone': '-1' },
      h('div', { class: 'pool-head' },
        h('h3', {}, poolTitle, ' ', h('span', { class: 'count' }, pool.items.length)),
        pool.controls || null,
      ),
      h('div', { class: 'zone-items' }, pool.items.map(id => {
        const item = lookup(id);
        if (!item) return null;
        const t = tile(item, template);
        decorate?.(t, item, -1);
        return t;
      })),
    );
    root.append(poolEl);
  }

  attachTooltips(root, lookup);
  if (readonly) return root;

  const hint = h('div', { class: 'select-hint', hidden: true });
  root.append(hint);

  function select(id, el) {
    root.querySelectorAll('.tile.selected').forEach(t => t.classList.remove('selected'));
    selected = id;
    if (!id) { hint.hidden = true; return; }
    el.classList.add('selected');
    el.focus({ preventScroll: true });
    const item = lookup(id);
    hint.replaceChildren(
      h('div', { class: 'select-hint-body' }, ...itemDetails(item)),
      h('div', { class: 'select-hint-help' }, '놓을 줄을 탭하세요 · 키보드 1~', rows.length, ' / 0 = 빼기'),
      h('button', { class: 'btn ghost small', onclick: () => select(null) }, '취소'),
    );
    hint.hidden = false;
  }

  enableDrag(root, {
    onDragStart: () => { hideTip(); select(null); },
    onDrop: (id, zone, index) => onMove(id, Number(zone.dataset.zone), index),
    onTap: (id, el) => {
      if (selected === id) select(null);
      else select(id, el);
    },
  });

  root.addEventListener('click', e => {
    if (!selected || e.target.closest('.tile') || e.target.closest('.row-label.editable') || e.target.closest('.select-hint') || e.target.closest('.pool-head')) return;
    const zone = e.target.closest('[data-zone]');
    if (!zone) return;
    const id = selected;
    select(null);
    onMove(id, Number(zone.dataset.zone), null);
  });

  root.addEventListener('keydown', e => {
    const t = e.target.closest('.tile');
    if (t && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (selected === t.dataset.id) select(null); else select(t.dataset.id, t);
      return;
    }
    if (!selected) return;
    if (e.key === 'Escape') { select(null); return; }
    const n = Number(e.key);
    if (Number.isInteger(n) && e.key.length === 1) {
      const to = n === 0 ? -1 : n - 1;
      if (to < rows.length) {
        const id = selected;
        select(null);
        onMove(id, to, null);
      }
    }
  });

  return root;
}
