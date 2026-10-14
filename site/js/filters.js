// 미배치 영역 필터: 검색어, 그룹(캐릭터), 희귀도, 종류.

import { h } from './ui.js';
import { rarityName, typeName, groupLabel } from './data.js';
import { t } from './i18n.js';

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
      // 기본값은 이름만 보여 줘서 좁은 화면에서도 잘리지 않게 한다 (예: '희귀도 ▾')
      h('option', { value: '' }, label),
      options.map(([v, text]) => h('option', { value: v, selected: filter[key] === v }, text)),
    ),
  );

  return h('div', { class: 'filters' },
    h('input', {
      type: 'search', class: 'filter-search', placeholder: t('filter.search'), value: filter.q || '',
      'aria-label': t('filter.search'),
      oninput: e => { filter.q = e.target.value; onChange(); },
    }),
    select('group', groupLabel(template.category), groups.map(g => [g.id, g.name])),
    select('rarity', t('facet.rarity'), rarities.map(r => [r, rarityName(r)])),
    select('type', t('facet.type'), types.map(v => [v, typeName(v)])),
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
