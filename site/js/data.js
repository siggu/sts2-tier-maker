// 게임 데이터 로딩과 템플릿 구성.
// data/sts2.json(영어)과 data/i18n/<언어>.json(이름·효과 번역)은 tools/fetch-data.mjs 가 만든다.

import { lang, t, has, collator } from './i18n.js';
//
// {
//   fetchedAt, source,
//   categories: [
//     { id, name, tile: 'card' | 'icon' | 'portrait' | 'creature',
//       groups?: [{ id, name, color }],
//       split?: { by: ['rarity', 'type'], groupFirst?: bool, sharedGroup?: id },
//       items: [{ id, name, img, group?, rarity?, type?, cost?, text?, hidden? }] }
//   ]
// }

// 한 번에 티어를 매기기에 적당한 최대 개수. 넘으면 희귀도·종류 등으로 쪼갠다.
export const TEMPLATE_LIMIT = 70;

const RARITIES = ['basic', 'starter', 'common', 'uncommon', 'rare', 'shop', 'event', 'ancient', 'special', 'boss', 'curse', 'status'];
const TYPES = ['attack', 'skill', 'power', 'status', 'curse', 'quest'];
const ORDER = {
  rarity: RARITIES,
  type: TYPES,
  // 고대 유물을 주는 고대의 존재: 등장 막 순서
  source: ['Neow', 'Orobas', 'Pael', 'Tezcatara', 'Darv', 'Nonupeipe', 'Tanx', 'Vakuu'],
};

export const rarityName = r => (has(`rarity.${r}`) ? t(`rarity.${r}`) : r);
export const typeName = v => (has(`type.${v}`) ? t(`type.${v}`) : v);
export const facetLabel = (facet, value) => (facet === 'rarity' ? rarityName(value) : facet === 'type' ? typeName(value) : value);
// 그룹(캐릭터·막)의 이름: 카드·유물·포션은 '캐릭터', 고대의 존재·적은 '막'
export const groupLabel = cat => t(cat.groupKind === 'act' ? 'facet.act' : 'facet.character');

let loading = null;

async function getJson(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

export function loadData() {
  if (!loading) {
    // 번역 파일이 없거나 못 받아도 영어로 보여 준다.
    const overlay = lang === 'en' ? Promise.resolve(null) : getJson(`data/i18n/${lang}.json`).catch(() => null);
    // 용어 팝업 설명(영어). 없거나 못 받아도 팝업만 빠진다.
    const glossary = getJson('data/glossary.json').catch(() => null);
    loading = Promise.all([getJson('data/sts2.json'), overlay, glossary]).then(([raw, tr, gl]) => buildIndex(raw, tr, gl));
  }
  return loading;
}

// 번역을 아이템에 덮어쓴다. 효과를 번역하지 못한 항목은 영어 효과를 두고 textEn 으로 표시.
function translateItem(item, tr) {
  const out = { ...item, nameEn: item.name };
  if (!tr) return out;
  for (const k of ['name', 'text', 'textUp', 'flavor', 'area']) if (tr[k]) out[k] = tr[k];
  if (!tr.text && item.text && lang !== 'en') out.textEn = true;
  if (item.members) {
    out.members = item.members.map((m, i) => {
      const tm = tr.members?.[i];
      return { ...m, name: tm?.name || m.name, moves: m.moves.map((mv, j) => ({ ...mv, name: tm?.moves?.[j] || mv.name })) };
    });
  }
  return out;
}

function buildIndex(raw, tr, gl) {
  const categories = raw.categories.map(cat => {
    const groupNames = tr?.groups?.[cat.id] || {};
    const groups = (cat.groups || []).map(g => ({ ...g, name: groupNames[g.id] || g.name }));
    const groupName = new Map(groups.map(g => [g.id, g.name]));
    const labels = tr?.labels?.[cat.id] || cat.labels;
    // hidden: 게임 언어 파일에 아직 이름이 없는 항목 (tools/fetch-data.mjs). 사이트 어디에도 내보이지 않는다.
    const items = cat.items
      .filter(i => !i.hidden)
      .map(i => ({ ...translateItem(i, tr?.items?.[`${cat.id}/${i.id}`]), key: `${cat.id}/${i.id}`, groupName: groupName.get(i.group) }))
      .sort((a, b) => collator.compare(a.name, b.name));
    const name = has(`cat.${cat.id}`) ? t(`cat.${cat.id}`) : cat.name;
    return { ...cat, name, nameEn: cat.name, labels, groups, items, byId: new Map(items.map(i => [i.id, i])) };
  });

  const templates = categories.flatMap(buildTemplates);
  const byId = new Map(templates.map(t => [t.id, t]));

  // 용어 팝업: 'cards/abundance' 같은 사이트 항목, 'kw:vulnerable'·'card:dowsing'·'potion:ambergris' 같은 용어 (tools/fetch-data.mjs buildGlossary)
  const catById = new Map(categories.map(c => [c.id, c]));
  const termNames = tr?.glossary || {};
  const term = key => {
    const slash = key.indexOf('/');
    if (slash > 0 && !key.includes(':')) {
      const cat = catById.get(key.slice(0, slash));
      const item = cat?.byId.get(key.slice(slash + 1));
      return item ? { key, kind: 'item', category: cat, item, name: item.name, nameEn: item.nameEn } : null;
    }
    const g = gl?.terms?.[key];
    if (!g) return null;
    return { key, kind: 'term', ...g, name: termNames[key] || g.name, nameEn: g.name, textEn: lang !== 'en' };
  };

  return {
    fetchedAt: raw.fetchedAt,
    source: raw.source,
    categories,
    templates,
    template: id => byId.get(id),
    term,
  };
}

// 한 아이템이 여러 그룹에 속할 수 있다 (예: 2막과 3막에 모두 나오는 고대의 존재).
const inGroup = (item, g) => item.group === g.id || (item.groups || []).includes(g.id);

function facetValues(items, facet) {
  const values = [...new Set(items.map(i => i[facet]).filter(Boolean))];
  const order = ORDER[facet] || [];
  const rank = v => (order.includes(v) ? order.indexOf(v) : order.length);
  return values.sort((a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b)));
}

// 카테고리 하나에서 티어를 매길 수 있는 묶음(템플릿)들을 만든다.
//  - 전체가 TEMPLATE_LIMIT 이하면 '전체' 템플릿
//  - groupFirst(카드): 캐릭터별 → 너무 많으면 캐릭터 × 희귀도, 캐릭터 × 종류
//  - 그 외(유물·포션·적 등): split.by 로 나눈 묶음 + 공용이 아닌 그룹(캐릭터 전용·막)별
function buildTemplates(cat) {
  const out = [];
  const by = cat.split?.by || [];
  const add = (parts, items, section, sectionLabel) => {
    if (items.length < 2) return;
    const id = [cat.id, ...parts.map(p => (p.facet === 'group' ? p.value : `${p.facet}-${p.value}`))].join('.');
    out.push({ ...makeTemplate(cat, id, parts, items, section), sectionLabel });
  };
  const group = g => ({ facet: 'group', value: g.id, label: g.name, color: g.color });
  // 값은 영어(묶음 주소가 안 바뀌게), 보이는 이름은 카테고리의 한국어 표(labels)가 있으면 그것으로
  const facet = (f, v) => ({ facet: f, value: v, label: cat.labels?.[f]?.[v] || facetLabel(f, v) });

  if (cat.items.length <= TEMPLATE_LIMIT) add([], cat.items, 'all');

  if (cat.split?.groupFirst) {
    for (const g of cat.groups) {
      const gi = cat.items.filter(i => inGroup(i, g));
      if (gi.length <= TEMPLATE_LIMIT) { add([group(g)], gi, g.id); continue; }
      for (const f of by) {
        for (const v of facetValues(gi, f)) add([group(g), facet(f, v)], gi.filter(i => i[f] === v), g.id);
      }
    }
    return out;
  }

  const overflow = cat.split?.overflow;
  for (const f of by) {
    for (const v of facetValues(cat.items, f)) {
      const fi = cat.items.filter(i => i[f] === v);
      // 너무 많은 묶음(예: 고대 유물 100여 개)은 overflow 필드(그 유물을 주는 고대의 존재)로 다시 나눈다.
      if (fi.length > TEMPLATE_LIMIT && overflow) {
        const label = t('section.overflow', { value: facetLabel(f, v), cat: cat.name });
        for (const o of facetValues(fi, overflow)) add([facet(f, v), facet(overflow, o)], fi.filter(i => i[overflow] === o), `${f}-${v}`, label);
      } else {
        add([facet(f, v)], fi, f);
      }
    }
  }
  for (const g of cat.groups) {
    if (g.id === cat.split?.sharedGroup) continue;
    const gi = cat.items.filter(i => inGroup(i, g));
    if (gi.length <= TEMPLATE_LIMIT) add([group(g)], gi, 'group');
  }
  return out;
}

function makeTemplate(cat, id, parts, items, section) {
  return {
    id,
    category: cat,
    parts,
    section,
    group: parts.find(p => p.facet === 'group') || null,
    label: parts.length ? parts[parts.length - 1].label : t('tpl.all'),
    title: [cat.name, ...parts.map(p => p.label)].join(' · '),
    tile: cat.tile,
    items,
    byId: new Map(items.map(i => [i.id, i])),
  };
}
