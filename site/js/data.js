// 게임 데이터 로딩과 템플릿 구성.
// data/sts2.json 은 tools/sts2/fetch-data.mjs 가 위키에서 수집해 만든다.
//
// {
//   version, fetchedAt, source,
//   categories: [
//     { id, name, tile: 'card' | 'icon' | 'portrait',
//       groups?: [{ id, name, color }],
//       items: [{ id, name, img, group?, rarity?, type?, cost?, text? }] }
//   ]
// }

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

  // 템플릿: 그룹이 있는 카테고리는 '전체' + 그룹별로 나눈다.
  const templates = [];
  for (const cat of categories) {
    if (!cat.groups.length) {
      templates.push(makeTemplate(cat, null));
      continue;
    }
    if (!cat.splitOnly) templates.push(makeTemplate(cat, null));
    for (const g of cat.groups) {
      if (cat.items.some(i => i.group === g.id)) templates.push(makeTemplate(cat, g));
    }
  }

  return {
    version: raw.version,
    fetchedAt: raw.fetchedAt,
    source: raw.source,
    categories,
    templates,
    template: id => templates.find(t => t.id === id),
  };
}

function makeTemplate(cat, group) {
  const items = group ? cat.items.filter(i => i.group === group.id) : cat.items;
  return {
    id: group ? `${cat.id}.${group.id}` : cat.id,
    category: cat,
    group,
    title: group ? `${cat.name} · ${group.name}` : cat.name,
    tile: cat.tile,
    items,
    byId: new Map(items.map(i => [i.id, i])),
  };
}
