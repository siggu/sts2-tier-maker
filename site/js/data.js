// 게임 데이터 로딩과 템플릿 구성.
// data/sts2.json 은 tools/fetch-data.mjs 가 위키에서 수집해 만든다.
//
// {
//   fetchedAt, source,
//   categories: [
//     { id, name, tile: 'card' | 'icon' | 'portrait' | 'creature',
//       groups?: [{ id, name, color }],
//       split?: { by: ['rarity', 'type'], groupFirst?: bool, sharedGroup?: id },
//       items: [{ id, name, img, group?, rarity?, type?, cost?, text? }] }
//   ]
// }

// 한 번에 티어를 매기기에 적당한 최대 개수. 넘으면 희귀도·종류 등으로 쪼갠다.
export const TEMPLATE_LIMIT = 70;

export const RARITY_KO = {
  basic: '기본', starter: '시작', common: '일반', uncommon: '고급', rare: '희귀',
  shop: '상점', event: '이벤트', ancient: '고대', special: '특수', boss: '보스', curse: '저주', status: '상태이상',
};
export const TYPE_KO = { attack: '공격', skill: '스킬', power: '파워', status: '상태이상', curse: '저주', quest: '퀘스트' };
const FACET_KO = { rarity: '희귀도', type: '종류', group: '캐릭터' };
const OVERFLOW_KO = { source: '고대의 존재' };
const ORDER = {
  rarity: Object.keys(RARITY_KO),
  type: Object.keys(TYPE_KO),
  // 고대 유물을 주는 고대의 존재: 등장 막 순서
  source: ['Neow', 'Orobas', 'Pael', 'Tezcatara', 'Darv', 'Nonupeipe', 'Tanx', 'Vakuu'],
};

export const rarityKo = r => RARITY_KO[r] || r;
export const typeKo = t => TYPE_KO[t] || t;
export const facetLabel = (facet, value) => (facet === 'rarity' ? rarityKo(value) : facet === 'type' ? typeKo(value) : value);
export const facetName = facet => FACET_KO[facet] || facet;

let loading = null;

export function loadData() {
  if (!loading) {
    loading = fetch('data/sts2.json', { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error(`data/sts2.json ${r.status}`);
        return r.json();
      })
      .then(buildIndex);
  }
  return loading;
}

function buildIndex(raw) {
  const categories = raw.categories.map(cat => {
    const groups = cat.groups || [];
    const groupName = new Map(groups.map(g => [g.id, g.name]));
    const items = cat.items.map(i => ({ ...i, key: `${cat.id}/${i.id}`, groupName: groupName.get(i.group) }));
    return { ...cat, groups, items, byId: new Map(items.map(i => [i.id, i])) };
  });

  const templates = categories.flatMap(buildTemplates);
  const byId = new Map(templates.map(t => [t.id, t]));

  return {
    fetchedAt: raw.fetchedAt,
    source: raw.source,
    categories,
    templates,
    template: id => byId.get(id),
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
        const label = `${facetLabel(f, v)} ${cat.name} (${OVERFLOW_KO[overflow] || overflow}별)`;
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
    label: parts.length ? parts[parts.length - 1].label : '전체',
    title: [cat.name, ...parts.map(p => p.label)].join(' · '),
    tile: cat.tile,
    items,
    byId: new Map(items.map(i => [i.id, i])),
  };
}
