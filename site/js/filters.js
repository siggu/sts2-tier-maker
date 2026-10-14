// 미배치 영역 필터: 검색어, 그룹(캐릭터), 희귀도, 종류.

import { h } from './ui.js';
import { rarityKo, typeKo } from './data.js';

const RARITY_ORDER = ['basic', 'starter', 'common', 'uncommon', 'rare', 'shop', 'event', 'ancient', 'special', 'boss', 'status', 'curse'];

function uniq(values, order) {
  const set = [...new Set(values.filter(Boolean))];
  return order ? set.sort((a, b) => order.indexOf(a) - order.indexOf(b)) : set;
}

export function poolControls(template, filter, onChange) {
  const groups = template.category.groups.filter(g => template.items.some(i => i.group === g.id));
  const rarities = uniq(template.items.map(i => i.rarity), RARITY_ORDER);
  const types = uniq(template.items.map(i => i.type));

  const select = (key, label, options) => options.length > 1 && h('label', { class: 'filter-select' },
    h('span', { class: 'sr-only' }, label),
    h('select', { onchange: e => { filter[key] = e.target.value; onChange(); } },
      h('option', { value: '' }, `${label}: 전체`),
      options.map(([v, text]) => h('option', { value: v, selected: filter[key] === v }, text)),
    ),
  );

  return h('div', { class: 'filters' },
    h('input', {
      type: 'search', class: 'filter-search', placeholder: '이름 검색', value: filter.q || '',
      'aria-label': '이름 검색',
      oninput: e => { filter.q = e.target.value; onChange(); },
    }),
    select('group', template.category.groupLabel || '캐릭터', groups.map(g => [g.id, g.name])),
    select('rarity', '희귀도', rarities.map(r => [r, rarityKo(r)])),
    select('type', '종류', types.map(t => [t, typeKo(t)])),
  );
}

export function applyFilter(poolEl, template, filter) {
  const q = (filter.q || '').trim().toLowerCase();
  let shown = 0;
  for (const el of poolEl.querySelectorAll('.zone-items > .tile')) {
    const item = template.byId.get(el.dataset.id);
    const ok = item
      && (!q || item.name.toLowerCase().includes(q) || (item.nameEn || '').toLowerCase().includes(q))
      && (!filter.group || item.group === filter.group)
      && (!filter.rarity || item.rarity === filter.rarity)
      && (!filter.type || item.type === filter.type);
    el.hidden = !ok;
    if (ok) shown++;
  }
  const count = poolEl.querySelector('.pool-head .count');
  const total = poolEl.querySelectorAll('.zone-items > .tile').length;
  if (count) count.textContent = shown === total ? total : `${shown} / ${total}`;
}
