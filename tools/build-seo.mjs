// 검색엔진용 정적 페이지 만들기: 템플릿(티어를 매기는 묶음)마다 진짜 주소의 HTML 페이지를 5개 언어로,
// 언어별 '모든 티어 리스트' 목록, sitemap.xml, robots.txt 를 사이트 폴더에 쓴다.
// 앱은 #/… 주소라 검색엔진이 첫 화면 하나로만 보기 때문에, 이 페이지들이 각 묶음을 검색 결과에 내보낸다.
// 페이지에는 스크립트가 없고, 버튼을 누르면 앱의 그 화면(#/tier/<id>)으로 간다.
//
// 사용: node tools/build-seo.mjs <사이트 폴더> [버전]   (배포 워크플로가 버전 붙이기 다음에 부른다)
// 템플릿·이름·번역은 사이트의 data.js·i18n.js 를 그대로 써서(언어마다 따로 불러) 앱과 똑같이 만든다.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const ORIGIN = 'https://sts2-tier-maker.pages.dev';
// 사이트 언어 코드 → 주소 앞부분 (한국어가 기본이라 앞부분 없음)
export const LANGS = [
  { code: 'ko', prefix: '', hreflang: 'ko', og: 'ko_KR' },
  { code: 'en', prefix: 'en/', hreflang: 'en', og: 'en_US' },
  { code: 'ja', prefix: 'ja/', hreflang: 'ja', og: 'ja_JP' },
  { code: 'zh-Hans', prefix: 'zh-hans/', hreflang: 'zh-Hans', og: 'zh_CN' },
  { code: 'zh-Hant', prefix: 'zh-hant/', hreflang: 'zh-Hant', og: 'zh_TW' },
];

// 이 페이지들에만 쓰는 문구
const TEXT = {
  ko: {
    site: '첨탑의 티어 메이커',
    name: (parts, cat) => [...parts, cat].join(' '),
    h1: n => `${n} 티어 리스트`,
    title: n => `${n} 티어 리스트 · 슬더스2 | 첨탑의 티어 메이커`,
    desc: (n, count, ex) => `슬레이 더 스파이어 2(슬더스2) ${n} ${count}개로 나만의 티어 리스트를 만들고 이미지로 저장·공유하세요. 무엇이 사기이고 약한지 밸런스 투표에도 참여할 수 있습니다. ${ex} 등.`,
    lead: '끌어다 놓아 순위를 매기고, 사기·적당함·약함을 함께 투표하는 비공식 팬 사이트입니다.',
    make: '티어 리스트 만들기', vote: '밸런스 투표하기', results: '모두의 투표 결과',
    count: n => `${n}개`, related: '다른 티어 리스트', all: '모든 티어 리스트',
    allTitle: '모든 티어 리스트 · 슬더스2 | 첨탑의 티어 메이커',
    allDesc: '슬레이 더 스파이어 2(슬더스2)의 캐릭터·카드·유물·포션·보스 등 모든 티어 리스트 템플릿. 골라서 바로 티어를 매기고 밸런스 투표에 참여하세요.',
    open: '사이트 열기', lang: '언어',
  },
  en: {
    site: 'Spire Tier Maker',
    name: (parts, cat) => [...parts, cat].join(' '),
    h1: n => `${n} Tier List`,
    title: n => `${n} Tier List · Slay the Spire 2 | Spire Tier Maker`,
    desc: (n, count, ex) => `Make your own Slay the Spire 2 tier list of ${count} ${n}, save it as an image or share a link, and vote on what is broken and what is weak. Includes ${ex} and more.`,
    lead: 'An unofficial fan site to drag items into tiers and vote together on what is broken, fair or weak.',
    make: 'Make a tier list', vote: 'Balance vote', results: 'Everyone’s results',
    count: n => `${n}`, related: 'More tier lists', all: 'All tier lists',
    allTitle: 'All tier lists · Slay the Spire 2 | Spire Tier Maker',
    allDesc: 'Every Slay the Spire 2 tier list template — characters, cards, relics, potions, bosses and more. Pick one to rank it and join the balance vote.',
    open: 'Open the site', lang: 'Language',
  },
  ja: {
    site: '尖塔のティアメーカー',
    name: (parts, cat) => [...parts, cat].join(' '),
    h1: n => `${n} ティアリスト`,
    title: n => `${n} ティアリスト · Slay the Spire 2 | 尖塔のティアメーカー`,
    desc: (n, count, ex) => `Slay the Spire 2 の${n}${count}件で自分だけのティアリストを作り、画像保存やリンク共有ができます。何が強すぎて何が弱いか、バランス投票にも参加できます。${ex}など。`,
    lead: 'ドラッグでランク付けし、強すぎ・適正・弱いをみんなで投票する非公式ファンサイトです。',
    make: 'ティアリストを作る', vote: 'バランス投票', results: 'みんなの投票結果',
    count: n => `${n}件`, related: 'ほかのティアリスト', all: 'すべてのティアリスト',
    allTitle: 'すべてのティアリスト · Slay the Spire 2 | 尖塔のティアメーカー',
    allDesc: 'Slay the Spire 2 のキャラクター・カード・レリック・ポーション・ボスなど、すべてのティアリストテンプレート。',
    open: 'サイトを開く', lang: '言語',
  },
  'zh-Hans': {
    site: '尖塔梯度表',
    name: (parts, cat) => [...parts, cat].join(' '),
    h1: n => `${n}梯度表`,
    title: n => `${n}梯度表 · 杀戮尖塔2 | 尖塔梯度表`,
    desc: (n, count, ex) => `用杀戮尖塔2（Slay the Spire 2）的 ${count} 个${n}制作你自己的梯度表，可保存为图片或分享链接，还能投票评选哪些太强、哪些太弱。包括${ex}等。`,
    lead: '拖动排序、一起投票评选强弱的非官方粉丝网站。',
    make: '制作梯度表', vote: '平衡投票', results: '大家的投票结果',
    count: n => `${n}个`, related: '其他梯度表', all: '所有梯度表',
    allTitle: '所有梯度表 · 杀戮尖塔2 | 尖塔梯度表',
    allDesc: '杀戮尖塔2 的角色、卡牌、遗物、药水、首领等所有梯度表模板。',
    open: '打开网站', lang: '语言',
  },
  'zh-Hant': {
    site: '尖塔梯度表',
    name: (parts, cat) => [...parts, cat].join(' '),
    h1: n => `${n}梯度表`,
    title: n => `${n}梯度表 · 殺戮尖塔2 | 尖塔梯度表`,
    desc: (n, count, ex) => `用殺戮尖塔2（Slay the Spire 2）的 ${count} 個${n}製作你自己的梯度表，可儲存為圖片或分享連結，還能投票評選哪些太強、哪些太弱。包括${ex}等。`,
    lead: '拖曳排序、一起投票評選強弱的非官方粉絲網站。',
    make: '製作梯度表', vote: '平衡投票', results: '大家的投票結果',
    count: n => `${n}個`, related: '其他梯度表', all: '所有梯度表',
    allTitle: '所有梯度表 · 殺戮尖塔2 | 尖塔梯度表',
    allDesc: '殺戮尖塔2 的角色、卡牌、遺物、藥水、首領等所有梯度表範本。',
    open: '開啟網站', lang: '語言',
  },
};

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// 템플릿 id(cards.ironclad.type-attack) → 주소 조각(cards/ironclad/type-attack)
export const slugOf = id => id.split('.').map(p => p.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')).join('/');
const pagePath = (L, tpl) => `${L.prefix}tier/${slugOf(tpl.id)}/`;
const indexPath = L => `${L.prefix}tier/`;

// ---------------------------------------------------------------- 언어 하나 읽기 (자식 프로세스)
// 사이트 모듈은 브라우저 전역(location·localStorage·document·fetch)을 쓰므로 흉내 내고 불러온다.
async function readLanguage(siteDir, code) {
  globalThis.location = { search: `?lang=${code}`, href: `http://x/?lang=${code}` };
  Object.defineProperty(globalThis, 'navigator', { value: { languages: [code], language: code }, configurable: true });
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  globalThis.document = { documentElement: {}, querySelector: () => null, querySelectorAll: () => [] };
  globalThis.fetch = async url => {
    const text = readFileSync(join(siteDir, String(url).split('?')[0]), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(text) };
  };
  const js = file => pathToFileURL(join(siteDir, 'js', file)).href;
  const { t } = await import(js('i18n.js'));
  const { loadData, facetLabel } = await import(js('data.js'));
  const db = await loadData();
  const label = (cat, facet, v) => cat.labels?.[facet]?.[v] || facetLabel(facet, v);
  return {
    code,
    fetchedAt: db.fetchedAt,
    strings: { footRights: t('foot.rights'), footSource: t('foot.source'), modeTier: t('mode.tier'), modeBalance: t('mode.balance') },
    categories: db.categories.map(c => ({ id: c.id, name: c.name, tile: c.tile })),
    templates: db.templates.map(tpl => ({
      id: tpl.id,
      cat: tpl.category.id,
      parts: tpl.parts.map(p => ({ facet: p.facet, value: p.value, label: p.label })),
      // 나눠 보일 때의 순서: 희귀도·종류는 게임 순서, 그룹은 카테고리의 그룹 순서
      items: tpl.items.map(i => ({
        id: i.id, name: i.name, img: i.img || null,
        rarity: i.rarity ? label(tpl.category, 'rarity', i.rarity) : null,
        rarityRank: RANK.rarity(i.rarity),
        type: i.type ? label(tpl.category, 'type', i.type) : null,
        typeRank: RANK.type(i.type),
        group: i.groupName || null,
        groupRank: tpl.category.groups.findIndex(g => g.id === i.group),
      })),
    })),
  };
}

const RARITY_ORDER = ['basic', 'starter', 'common', 'uncommon', 'rare', 'shop', 'event', 'ancient', 'special', 'boss', 'curse', 'status'];
const TYPE_ORDER = ['attack', 'skill', 'power', 'status', 'curse', 'quest'];
const rankIn = list => v => (list.includes(v) ? list.indexOf(v) : list.length);
const RANK = { rarity: rankIn(RARITY_ORDER), type: rankIn(TYPE_ORDER) };

// ---------------------------------------------------------------- 페이지 그리기

const CSP = "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net/gh/orioncactus/; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net/gh/orioncactus/; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'";
const ICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><path d='M16 2 26 12 16 30 6 12Z' fill='%23d9a441'/><path d='M16 6 22 12 16 24 10 12Z' fill='%23421f12'/></svg>";
const BRAND_SVG = '<svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2 26 12 16 30 6 12Z" fill="#d9a441"/><path d="M16 6 22 12 16 24 10 12Z" fill="#421f12"/></svg>';

function head({ L, title, desc, path, alternates, version, jsonLd }) {
  const v = version ? `?v=${version}` : '';
  const alt = alternates.map(a => `  <link rel="alternate" hreflang="${a.hreflang}" href="${ORIGIN}/${a.path}">`).join('\n');
  return `<!doctype html>
<html lang="${L.code}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${ORIGIN}/${path}">
${alt}
  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/${alternates.find(a => a.hreflang === 'en').path}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(TEXT[L.code].site)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${ORIGIN}/${path}">
  <meta property="og:image" content="${ORIGIN}/img/og.png">
  <meta property="og:locale" content="${L.og}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#0d0f14">
  <link rel="icon" href="${ICON}">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kreon:wght@400;600;700&family=Gowun+Batang:wght@400;700&display=swap">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">
  <link rel="stylesheet" href="/css/style.css${v}">
  <link rel="stylesheet" href="/css/seo.css${v}">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>`;
}

function topbar(L, data, alternates) {
  const T = TEXT[L.code];
  const app = `/?lang=${L.code}`;
  const langs = LANGS.map(o => {
    const a = alternates.find(x => x.hreflang === o.hreflang);
    const name = { ko: '한국어', en: 'English', ja: '日本語', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文' }[o.code];
    return o.code === L.code ? `<span aria-current="true">${name}</span>` : `<a href="/${a.path}" hreflang="${o.hreflang}" lang="${o.code}">${name}</a>`;
  }).join('');
  return `<body class="seo-page">
  <div class="bg" aria-hidden="true"><div class="bg-tint"></div><div class="bg-embers"></div></div>
  <header class="topbar">
    <a class="brand" href="${app}#/">${BRAND_SVG}<span>${esc(T.site)}</span></a>
    <nav class="topnav"><a href="${app}#/">${esc(data.strings.modeTier)}</a><a href="${app}#/balance">${esc(data.strings.modeBalance)}</a><a href="/${indexPath(L)}">${esc(T.all)}</a></nav>
    <nav class="seo-langs" aria-label="${esc(T.lang)}">${langs}</nav>
  </header>`;
}

function footer(data) {
  // 사이트 문구(신뢰하는 고정 문자열)라 html 그대로
  return `  <footer class="foot">
    <p>${data.strings.footRights} ${data.strings.footSource}</p>
  </footer>
</body>
</html>
`;
}

const crumbs = (items) => `<nav class="crumbs" aria-label="breadcrumb">${items.map((c, i) => (i < items.length - 1
  ? `<a href="${c.href}">${esc(c.label)}</a><span class="sep" aria-hidden="true">›</span>`
  : `<span aria-current="page">${esc(c.label)}</span>`)).join('')}</nav>`;

// 항목을 나눠 보여 줄 기준: 템플릿에 이미 쓰인 기준이 아니고 값이 2가지 이상인 것 (희귀도 → 종류 → 그룹)
function sectionsOf(tpl) {
  const used = new Set(tpl.parts.map(p => (p.facet === 'group' ? 'group' : p.facet)));
  for (const key of ['rarity', 'type', 'group']) {
    if (used.has(key)) continue;
    const values = [...new Set(tpl.items.map(i => i[key]).filter(Boolean))];
    if (values.length > 1 && tpl.items.every(i => i[key])) {
      const rank = v => tpl.items.find(i => i[key] === v)[`${key}Rank`];
      return values.sort((a, b) => rank(a) - rank(b)).map(v => ({ label: v, items: tpl.items.filter(i => i[key] === v) }));
    }
  }
  return [{ label: null, items: tpl.items }];
}

function templatePage({ L, data, tpl, cats, siblings, version }) {
  const T = TEXT[L.code];
  const cat = cats.get(tpl.cat);
  const name = T.name(tpl.parts.map(p => p.label), cat.name);
  const title = T.title(name);
  const ex = tpl.items.slice(0, 4).map(i => i.name).join(', ');
  const desc = T.desc(name, tpl.items.length, ex);
  const path = pagePath(L, tpl);
  const alternates = LANGS.map(o => ({ hreflang: o.hreflang, path: pagePath(o, tpl) }));
  const app = `/?lang=${L.code}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: T.site, item: `${ORIGIN}/?lang=${L.code}` },
          { '@type': 'ListItem', position: 2, name: T.all, item: `${ORIGIN}/${indexPath(L)}` },
          { '@type': 'ListItem', position: 3, name: T.h1(name), item: `${ORIGIN}/${path}` },
        ],
      },
      {
        '@type': 'ItemList', name: T.h1(name), numberOfItems: tpl.items.length,
        itemListElement: tpl.items.map((i, k) => ({ '@type': 'ListItem', position: k + 1, name: i.name })),
      },
    ],
  };
  const sections = sectionsOf(tpl).map(s => `
      <section class="seo-sec">
        ${s.label ? `<h2>${esc(s.label)} <span class="seo-n">${esc(T.count(s.items.length))}</span></h2>` : ''}
        <ul class="seo-items seo-t-${cat.tile}">${s.items.map(i => `
          <li>${i.img ? `<img src="/${esc(i.img)}" alt="${esc(i.name)}" loading="lazy" decoding="async">` : '<span class="seo-noimg" aria-hidden="true"></span>'}<span>${esc(i.name)}</span></li>`).join('')}
        </ul>
      </section>`).join('');
  const related = siblings.filter(s => s.id !== tpl.id).map(s => {
    const n = T.name(s.parts.map(p => p.label), cat.name);
    return `<li><a href="/${pagePath(L, s)}">${esc(T.h1(n))}</a> <span class="seo-n">${esc(T.count(s.items.length))}</span></li>`;
  }).join('');
  return `${head({ L, title, desc, path, alternates, version, jsonLd })}
${topbar(L, data, alternates)}
  <main class="seo-main">
    ${crumbs([{ label: T.site, href: `${app}#/` }, { label: T.all, href: `/${indexPath(L)}` }, { label: T.h1(name) }])}
    <h1 class="seo-h1">${esc(T.h1(name))}</h1>
    <p class="seo-desc">${esc(desc)}</p>
    <p class="seo-cta">
      <a class="btn primary" href="${app}#/tier/${encodeURIComponent(tpl.id)}">${esc(T.make)}</a>
      <a class="btn" href="${app}#/balance/${encodeURIComponent(tpl.id)}">${esc(T.vote)}</a>
      <a class="btn ghost" href="${app}#/balance/${encodeURIComponent(tpl.id)}/results">${esc(T.results)}</a>
    </p>
    ${sections}
    ${related ? `<section class="seo-sec seo-related"><h2>${esc(T.related)}</h2><ul>${related}</ul></section>` : ''}
    <p class="seo-lead">${esc(T.lead)}</p>
  </main>
${footer(data)}`;
}

function indexPage({ L, data, cats, version }) {
  const T = TEXT[L.code];
  const path = indexPath(L);
  const alternates = LANGS.map(o => ({ hreflang: o.hreflang, path: indexPath(o) }));
  const app = `/?lang=${L.code}`;
  const groups = [...cats.values()].map(cat => {
    const list = data.templates.filter(t => t.cat === cat.id);
    if (!list.length) return '';
    return `
      <section class="seo-sec seo-related">
        <h2>${esc(cat.name)} <span class="seo-n">${esc(T.count(list.length))}</span></h2>
        <ul>${list.map(t => `<li><a href="/${pagePath(L, t)}">${esc(T.h1(T.name(t.parts.map(p => p.label), cat.name)))}</a> <span class="seo-n">${esc(T.count(t.items.length))}</span></li>`).join('')}</ul>
      </section>`;
  }).join('');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage', name: T.all, description: T.allDesc, url: `${ORIGIN}/${path}`,
    isPartOf: { '@type': 'WebSite', name: T.site, url: `${ORIGIN}/` },
  };
  return `${head({ L, title: T.allTitle, desc: T.allDesc, path, alternates, version, jsonLd })}
${topbar(L, data, alternates)}
  <main class="seo-main">
    ${crumbs([{ label: T.site, href: `${app}#/` }, { label: T.all }])}
    <h1 class="seo-h1">${esc(T.all)}</h1>
    <p class="seo-desc">${esc(T.allDesc)}</p>
    <p class="seo-cta"><a class="btn primary" href="${app}#/">${esc(T.open)}</a></p>
    ${groups}
  </main>
${footer(data)}`;
}

function sitemap(langs) {
  const day = (langs[0].fetchedAt || new Date().toISOString()).slice(0, 10);
  const entry = (loc, alts) => `  <url>
    <loc>${ORIGIN}/${loc}</loc>
    <lastmod>${day}</lastmod>
${alts.map(a => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${ORIGIN}/${a.path}"/>`).join('\n')}
  </url>`;
  const out = [`  <url>\n    <loc>${ORIGIN}/</loc>\n    <lastmod>${day}</lastmod>\n  </url>`];
  const idxAlts = LANGS.map(o => ({ hreflang: o.hreflang, path: indexPath(o) }));
  for (const L of LANGS) out.push(entry(indexPath(L), idxAlts));
  for (const tpl of langs[0].templates) {
    const alts = LANGS.map(o => ({ hreflang: o.hreflang, path: pagePath(o, tpl) }));
    for (const L of LANGS) out.push(entry(pagePath(L, tpl), alts));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${out.join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------- 실행

export function build(siteDir, version, readAll) {
  const langs = readAll(siteDir);
  const ids = langs[0].templates.map(t => t.id).join();
  for (const d of langs) if (d.templates.map(t => t.id).join() !== ids) throw new Error(`언어마다 템플릿이 다릅니다: ${d.code}`);
  const slugs = new Set(langs[0].templates.map(t => slugOf(t.id)));
  if (slugs.size !== langs[0].templates.length) throw new Error('주소가 겹치는 템플릿이 있습니다');

  const files = new Map();
  for (const L of LANGS) {
    const data = langs.find(d => d.code === L.code);
    const cats = new Map(data.categories.map(c => [c.id, c]));
    files.set(`${indexPath(L)}index.html`, indexPage({ L, data, cats, version }));
    for (const tpl of data.templates) {
      const siblings = data.templates.filter(t => t.cat === tpl.cat);
      files.set(`${pagePath(L, tpl)}index.html`, templatePage({ L, data, tpl, cats, siblings, version }));
    }
  }
  files.set('sitemap.xml', sitemap(langs));
  files.set('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

  // 예전 결과를 지우고 새로 쓴다
  for (const L of LANGS) rmSync(join(siteDir, indexPath(L)), { recursive: true, force: true });
  for (const [rel, text] of files) {
    const full = join(siteDir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, text);
  }
  return files;
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  const [, , a, b, c] = process.argv;
  if (a === '--lang') {
    // 자식: 언어 하나를 읽어 JSON 으로 내보낸다
    process.stdout.write(JSON.stringify(await readLanguage(resolve(c), b)));
  } else {
    if (!a) { console.error('사용: node tools/build-seo.mjs <사이트 폴더> [버전]'); process.exit(1); }
    const siteDir = resolve(a);
    const files = build(siteDir, b || '', dir => LANGS.map(L => JSON.parse(execFileSync(process.execPath, [self, '--lang', L.code, dir], { maxBuffer: 64 << 20 }).toString())));
    console.log(`검색용 페이지 ${[...files.keys()].filter(f => f.endsWith('.html')).length}개, sitemap.xml, robots.txt 를 만들었습니다.`);
  }
}
