// Slay the Spire Wiki(slaythespire.wiki.gg)의 StS2 데이터 모듈을 읽어
// site/data/sts2.json, site/data/keys.json 과 이미지(site/data/img/...)를 만든다.
//
// 기준 버전: 항상 public-beta. 위키 데이터 모듈은 public-beta 수치로 갱신되고, 카드 그림은 'Beta-<파일>' 이 있으면 그것을 쓴다.
//
// 사용: node tools/fetch-data.mjs            (전체, 이미 받은 이미지는 sha1 이 같으면 건너뜀)
//       node tools/fetch-data.mjs --no-images (데이터만)
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parseLuaData } from './lua.mjs';
import { cardsFromCargo } from './cargo.mjs';
import { alignValues, looseValues, renderKoBoth, splitKeywords, withKeywords, wikiTemplate } from './l10n.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'site', 'data');
const WIKI = 'https://slaythespire.wiki.gg';
const UA = 'sts2-tier-maker/1.0 (https://github.com/siggu/sts2-tier-maker)';
const WITH_IMAGES = !process.argv.includes('--no-images');

const CHARACTERS = [
  { id: 'ironclad', en: 'Ironclad', color: '#c8463c' },
  { id: 'silent', en: 'Silent', color: '#4f9a52' },
  { id: 'regent', en: 'Regent', color: '#d08a2e' },
  { id: 'necrobinder', en: 'Necrobinder', color: '#b05aa8' },
  { id: 'defect', en: 'Defect', color: '#4a86c8' },
];
const SHARED_GROUP = { id: 'shared', name: 'Shared', color: '#9a9a9a' };
const charByEn = new Map(CHARACTERS.map(c => [c.en, c]));
const charGroups = () => CHARACTERS.map(({ id, en, color }) => ({ id, name: en, color }));

// ---------------------------------------------------------------- 다른 언어 (게임 공식 번역)
// sts2.json 은 영어(위키)로 두고, 언어마다 site/data/i18n/<언어>.json 에 이름·효과 번역을 따로 둔다.
// tools/l10n/<언어>.json 은 게임 언어 파일에서 tools/build-l10n.mjs 로 뽑아 만든다.
// 이름은 공식 번역으로 바꾸고, 효과는 영어 틀로 위키 문구의 수치를 읽어 그 언어 틀에 채운다.
// 맞추지 못한 효과는 넣지 않는다 (사이트가 영어 효과를 보여 준다).
export const LANGS = ['ko', 'ja', 'zh-Hans', 'zh-Hant'];
const L10N = {};
for (const lang of LANGS) {
  try { L10N[lang] = JSON.parse(await readFile(join(ROOT, 'tools', 'l10n', `${lang}.json`), 'utf8')); } catch { /* 이 언어 파일 없음 */ }
}
const ACTIVE = Object.keys(L10N);
// 찾기용 키: 소문자, 굽은 따옴표 → 곧은 따옴표 (build-l10n.mjs 의 lower 와 같게)
const lc = s => String(s).trim().toLowerCase().replace(/[‘’]/g, "'");
// 위키 이름 그대로 → 'The ' 를 뗀 이름 순으로 찾는다 ('The Lost and Forgotten' ↔ 게임 'Lost and Forgotten')
const entryOf = (lang, table, en) => {
  const t = L10N[lang]?.[table];
  return t?.[lc(en)] ?? t?.[lc(String(en).trim().replace(/^the /i, ''))];
};
const nameOf = (lang, table, en) => { const v = entryOf(lang, table, en); return typeof v === 'string' ? v : v?.name; };
// 효과 문구 속 이름 값(예: 인챈트 이름)을 옮길 때 쓰는 영어 → 번역 표
const WORDS = Object.fromEntries(ACTIVE.map(lang => [lang, Object.fromEntries(['cards', 'relics', 'potions', 'enchantments']
  .flatMap(t => Object.entries(L10N[lang][t] || {}).map(([en, v]) => [en, v.name])))]));
const stats = Object.fromEntries(ACTIVE.map(lang => [lang, { total: 0, name: 0, text: 0 }]));
// 점검용: L10N_AUDIT=<파일> 이면 번역 재료(틀·위키 문구·읽은 값)를 그 파일에 남긴다
const AUDIT = process.env.L10N_AUDIT ? [] : null;
// 게임에 따로 없는 묶음 이름
const SHARED_NAMES = {
  en: { shared: 'Shared', colorless: 'Colorless' },
  ko: { shared: '공용', colorless: '무색' },
  ja: { shared: '共通', colorless: '無色' },
  'zh-Hans': { shared: '通用', colorless: '无色' },
  'zh-Hant': { shared: '通用', colorless: '無色' },
};
// 위키의 'Test Subject (Phase 2)' 같은 단계 표시
const PHASE = { ko: n => `${n}페이즈`, ja: n => `第${n}形態`, 'zh-Hans': n => `第${n}阶段`, 'zh-Hant': n => `第${n}階段` };
const APPEARS = { en: 'Appears: ', ko: '등장: ', ja: '登場: ', 'zh-Hans': '出现：', 'zh-Hant': '出現：' };
const LIST_SEP = { en: ', ', ko: ', ', ja: '、', 'zh-Hans': '、', 'zh-Hant': '、' };
const actLabel = (lang, n) => (lang === 'en' ? `Act ${n}` : (L10N[lang]?.terms?.actNumber || 'Act {actNumber}').replace('{actNumber}', n));

// 언어별 덮어쓰기: OVERLAY[언어] = { items: { '카테고리/id': { name, text, ... } }, groups: { 카테고리: { 그룹id: 이름 } }, labels }
const OVERLAY = Object.fromEntries(ACTIVE.map(lang => [lang, { items: {}, groups: {}, labels: {} }]));
function put(lang, key, patch) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  if (Object.keys(clean).length) Object.assign(OVERLAY[lang].items[key] ||= {}, clean);
}
function putGroups(catId, groups, nameFor) {
  for (const lang of ACTIVE) {
    const names = Object.fromEntries(groups.map(g => [g.id, nameFor(lang, g)]).filter(([, n]) => n));
    if (Object.keys(names).length) OVERLAY[lang].groups[catId] = names;
  }
}

function localize(lang, table, enName, wikiText, { keywords = false, upgradable = false } = {}) {
  stats[lang].total++;
  const e = entryOf(lang, table, enName);
  if (!e) return null;
  stats[lang].name++;
  const out = { name: e.name };
  if (!e.en && keywords && wikiText) {
    // 게임 효과 문구가 비어 있고 위키 문구가 키워드뿐인 카드(저주 등): 키워드 이름만 옮긴다
    const split = splitKeywords(wikiText);
    if (split.keywords.length && !split.text.replace(/<br\s*\/?>/gi, '').trim()) {
      out.text = withKeywords('', split.keywords, L10N[lang].keywords, false, false, L10N[lang].terms?.period);
      stats[lang].text++;
    }
  } else if (e.en && e.tr && wikiText) {
    const split = keywords ? splitKeywords(wikiText) : { text: wikiText, keywords: [] };
    // 문장이 딱 맞지 않으면(위키가 조금 다르게 적은 경우) 수치를 차례대로 짝짓는다
    const exact = alignValues(e.en, split.text);
    const vals = exact ?? looseValues(e.en, split.text);
    AUDIT?.push({ lang, table, enName, wiki: split.text, keywords: split.keywords, en: e.en, tr: e.tr, vals, loose: !exact && Boolean(vals) });
    if (vals) {
      try {
        const r = renderKoBoth(e.tr, vals, WORDS[lang]);
        const kw = split.keywords;
        const kwNames = L10N[lang].keywords;
        const period = L10N[lang].terms?.period;
        out.text = withKeywords(r.text, kw, kwNames, false, false, period);
        if (upgradable && (r.textUp || kw.some(k => k.base !== k.up))) {
          out.textUp = withKeywords(r.textUp || r.text, kw, kwNames, true, true, period);
        }
        stats[lang].text++;
      } catch { /* 값이 모자라면 영어 효과 유지 */ }
    }
  }
  return out;
}

// 효과가 있는 아이템(카드·유물·포션·인챈트)의 번역을 모든 언어에 등록한다.
function translate(key, table, enName, wikiText, opts, extra) {
  for (const lang of ACTIVE) put(lang, key, { ...localize(lang, table, enName, wikiText, opts), ...extra?.(lang) });
}

// ---------------------------------------------------------------- 가져오기

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 위키(wiki.gg)는 요청이 몰리면 429 를 준다. Retry-After 를 지키고 점점 길게 기다렸다가 다시 시도한다.
async function get(url, { binary = false, tries = 7 } = {}) {
  for (let i = 0; ; i++) {
    let wait = Math.min(60_000, 2_000 * 2 ** i);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      const retryAfter = Number(res.headers.get('retry-after'));
      if (retryAfter > 0) wait = Math.min(120_000, retryAfter * 1000);
      const err = new Error(`${res.status} ${url}`);
      if (res.status !== 429 && res.status < 500) { err.fatal = true; }
      throw err;
    } catch (err) {
      if (err.fatal || i + 1 >= tries) throw err;
      await sleep(wait + Math.random() * 1000);
    }
  }
}

// 위키 Cargo 표 조회 (500개씩). 로컬 시험: WIKI_CARGO_DIR 에 <표>.json 이 있으면 그걸 읽는다.
async function cargo(table, fields, where) {
  if (process.env.WIKI_CARGO_DIR) return JSON.parse(await readFile(join(process.env.WIKI_CARGO_DIR, `${table}.json`), 'utf8'));
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const qs = new URLSearchParams({ action: 'cargoquery', format: 'json', tables: table, fields, where, limit: '500', offset: String(offset) });
    const r = JSON.parse(await get(`${WIKI}/api.php?${qs}`));
    if (r.error) throw new Error(`위키 Cargo ${table}: ${r.error.info || r.error.code}`);
    const page = (r.cargoquery || []).map(x => x.title);
    rows.push(...page);
    if (page.length < 500) return rows;
    await sleep(500);
  }
}

// StS2 카드 전체: 이름 → 예전 데이터 모듈 모양 (tools/cargo.mjs). 2026-10-17 위키가 카드 데이터 모듈을 지우고 Cargo 표로 옮겼다.
let cardTable = null;
function stS2Cards() {
  cardTable ||= Promise.all([
    cargo('Cards', '_pageName,Name,Game,Image,Color,Type,Rarity,Cost,CostPlus,StarCost,NoUpgrade,MultiplayerOnly,Description', 'Game="2"'),
    cargo('CardArt', '_pageName,Name,Game,FullCard,FullCardPlus,FullCardBeta,FullCardBetaPlus', 'Game="2"'),
  ]).then(([rows, art]) => {
    const all = cardsFromCargo(rows, art);
    if (Object.keys(all).length < 300) throw new Error(`위키 Cargo 카드가 너무 적다 (${Object.keys(all).length}장)`);
    return all;
  });
  return cardTable;
}
// 한 묶음(캐릭터·무색)의 카드
async function cardGroup(group) {
  return Object.fromEntries(Object.entries(await stS2Cards()).filter(([, c]) => c.Color === group));
}

const moduleCache = new Map();
function module(title) {
  if (!moduleCache.has(title)) moduleCache.set(title, loadModule(title));
  return moduleCache.get(title);
}
async function loadModule(title) {
  // 로컬 테스트: WIKI_RAW_DIR 에 discover 결과(modules/*.lua)가 있으면 그걸 읽는다.
  const src = process.env.WIKI_RAW_DIR
    ? await readFile(join(process.env.WIKI_RAW_DIR, title.replace(/[^\w.-]+/g, '_') + '.lua'), 'utf8')
    : await get(`${WIKI}/index.php?title=${encodeURIComponent(title)}&action=raw`);
  return parseLuaData(src);
}

export function slug(name) {
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------- 텍스트

const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 위키 표기 → 툴팁·상세 정보용 HTML
//   [6|9]      → mode 'both': 6(9), 'up': 강화 후 값 9 를 강조
//   $Block     → 키워드 강조
//   @IE @CE …  → 에너지/별 아이콘 글자
//   <br>       → 줄바꿈
export const hasUpgrade = raw => /\[[^\[\]|]*\|[^\[\]|]*\]/.test(String(raw || ''));

export function formatText(raw, mode = 'both') {
  if (!raw) return '';
  let s = String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // 위키 틀: {{QueryLink|Cards|type:Attack|Attacks|2}} → Attacks, {{KW|Osty|Osty's|2}} → Osty's
    // 카드·유물·포션·키워드를 가리키는 틀은 참조 표시를 남긴다 (용어 팝업, resolveRefs)
    .replace(/\{\{([^{}]*)\}\}/g, (m, body) => refMark(body, wikiTemplate(m, body)))
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/@([A-Z][a-z]+)/g, '$1'); // @Gold → Gold (아이콘 이름)
  s = escapeHtml(s);
  s = s.replace(/\[([^\[\]|]*)\|([^\[\]|]*)\]/g, (_, a, b) => {
    if (mode === 'up') return b ? `<span class="up">${b}</span>` : '';
    return `${a}<span class="up">(${b})</span>`;
  });
  s = s.replace(/\$([A-Z][A-Za-z']*(?:\s(?:of|the)\s[A-Z][A-Za-z']*)?)/g, (_, w) => refTag('kw', w, w));
  s = s.replace(/\uE000([a-z]+)\uE003([^\uE001]*)\uE001([^\uE002]*)\uE002/g, (_, kind, target, shown) => refTag(kind, target, shown));
  // 같은 아이콘이 넷 이상 이어지면 게임처럼 "5 ★" 로 줄인다 (번역 문구와 같은 규칙)
  s = s.replace(/(?:@([A-Z]{2})\s?)+/g, (m, code) => {
    const n = m.match(/@[A-Z]{2}/g);
    return n.length >= 4 && n.every(x => x === n[0]) ? `${n.length}${n[0]}${/\s$/.test(m) ? ' ' : ''}` : m;
  });
  s = s.replace(/@([A-Z]{2})/g, (_, code) => {
    if (code === 'ST') return '<i class="ic star">★</i>';
    if (code.endsWith('E')) return '<i class="ic energy">⚡</i>';
    return '';
  });
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// 용어 참조: 위키 틀 이름 → 종류. <b data-ref="종류|위키 이름"> 로 남겨 두고 main 에서 실제 키(cards/…, kw:…)로 바꾼다.
const REF_KIND = { C: 'card', C2: 'card', P: 'potion', P2: 'potion', R: 'relic', R2: 'relic', KW: 'kw', KW2: 'kw', BD: 'kw', BD2: 'kw' };
// formatText 안에서 escapeHtml 을 거쳐도 남도록 사용자 영역 문자로 감싼다
function refMark(body, shown) {
  const [name, target] = body.split('|');
  const kind = REF_KIND[name.trim()];
  return kind && target?.trim() ? `\uE000${kind}\uE003${target.trim()}\uE001${shown}\uE002` : shown;
}
const refTag = (kind, target, shown) => `<b data-ref="${kind}|${target}">${shown}</b>`;

// 적 행동 설명: {{BD2|Strength}} → 키워드, {{Asc2|9|160}} → 승천 수치
export function formatEnemyText(raw) {
  if (!raw) return '';
  let s = escapeHtml(String(raw).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
  s = s.replace(/\{\{Asc2?\|(\d+)\|([^{}]*)\}\}/g, '<span class="asc" data-asc="$1">$2</span>');
  s = s.replace(/\{\{(?:BD2|KW2|BD|KW)\|([^{}|]*)\}\}/g, (_, w) => refTag('kw', w, w));
  s = s.replace(/\{\{C2?\|([^{}|]*)(?:\|([^{}|]*))?\}\}/g, (_, w, shown) => refTag('card', w, shown || w));
  s = s.replace(/\{\{[^{}]*\|([^{}|]*)\}\}/g, '$1').replace(/\{\{([^{}|]*)\}\}/g, '$1');
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '');
  return s.trim();
}

// ---------------------------------------------------------------- 이미지

const imageJobs = [];

// 위키 파일을 받아 webp 로 줄여 저장할 작업을 등록하고, 사이트에서 쓸 경로를 돌려준다.
// beta: 위키의 public-beta 그림 파일 이름(CardArt 의 FullCardBeta). 그 파일이 있으면 그것을 쓴다. 사이트는 public-beta 기준이다.
function image(file, category, id, { height, width, trim = false, beta = null } = {}) {
  if (!file) return null;
  const rel = `data/img/${category}/${id}.webp`;
  imageJobs.push({ file, out: join(ROOT, 'site', rel), height, width, trim, beta: beta || null });
  return rel;
}

// 대소문자·공백·하이픈·밑줄을 무시한 비교용 키. 위키 데이터의 Image 값이 실제 파일 이름과
// 'Flick-Flack' ↔ 'FlickFlack', 'CloakandDagger' ↔ 'CloakAndDagger' 처럼 조금씩 다른 경우가 있다.
export const looseKey = name => String(name).toLowerCase().replace(/[^a-z0-9.]/g, '');

async function queryJson(params) {
  const qs = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params });
  return JSON.parse(await get(`${WIKI}/api.php?${qs}`));
}

// prefix 로 시작하는 위키 파일 전체를 { 느슨한 키 → { url, sha1, name } } 로 모은다.
async function listFiles(prefix) {
  const out = new Map();
  let cont = {};
  for (let i = 0; i < 40; i++) {
    const r = await queryJson({ list: 'allimages', aiprefix: prefix, ailimit: '500', aiprop: 'url|sha1', ...cont });
    for (const f of r.query.allimages) out.set(looseKey(f.name), { url: f.url, sha1: f.sha1, name: f.name });
    if (!r.continue) break;
    cont = r.continue;
    await sleep(500);
  }
  return out;
}

// 위키 API 로 파일 50개씩 묶어 실제 이미지 주소(CDN)와 sha1 을 받는다.
// 이미지마다 위키에 요청하면 429 로 막히므로, 위키 요청은 이 묶음 조회만 한다.
// 정확히 일치하는 파일이 없으면 같은 접두어의 파일 목록에서 느슨한 키로 찾는다.
export async function resolveFiles(files) {
  const out = new Map();
  const list = [...new Set(files)];
  for (let i = 0; i < list.length; i += 50) {
    const chunk = list.slice(i, i + 50);
    const r = await queryJson({ prop: 'imageinfo', iiprop: 'url|sha1', titles: chunk.map(f => `File:${f}`).join('|') });
    const norm = new Map((r.query.normalized || []).map(n => [n.from, n.to]));
    const pages = new Map((r.query.pages || []).map(p => [p.title, p]));
    for (const f of chunk) {
      const title = norm.get(`File:${f}`) || `File:${f}`;
      const info = pages.get(title)?.imageinfo?.[0];
      if (info?.url) out.set(f, { url: info.url, sha1: info.sha1 });
    }
    await sleep(500);
  }

  const missing = list.filter(f => !out.has(f));
  const prefixes = [...new Set(missing.map(f => f.replace(/ /g, '_').split(/[-_]/)[0]))];
  const known = new Map();
  for (const prefix of prefixes) for (const [k, v] of await listFiles(prefix)) known.set(k, v);
  for (const f of missing) {
    const hit = known.get(looseKey(f));
    if (hit) {
      out.set(f, { url: hit.url, sha1: hit.sha1 });
      console.log(`  파일 이름 보정: ${f} → ${hit.name}`);
    }
  }
  return out;
}

const MANIFEST = join(DATA, 'img', 'manifest.json');

async function runImageJobs() {
  let manifest = {};
  try { manifest = JSON.parse(await readFile(MANIFEST, 'utf8')); } catch { /* 처음 */ }

  const resolved = await resolveFiles(imageJobs.flatMap(j => [j.file, j.beta].filter(Boolean)));
  const betaUsed = imageJobs.filter(j => j.beta && resolved.has(j.beta)).length;
  if (betaUsed) console.log(`public-beta 그림: ${betaUsed}개`);
  let done = 0, failed = 0, skipped = 0;
  const total = imageJobs.length;
  const progress = setInterval(() => console.log(`이미지 진행: ${done + failed + skipped}/${total}`), 15_000);
  const queue = imageJobs.slice();

  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const rel = job.out.slice(join(ROOT, 'site').length + 1);
      const info = (job.beta && resolved.get(job.beta)) || resolved.get(job.file);
      try {
        if (!info) throw new Error('위키에 파일 없음');
        // 원본(sha1)과 변환 설정이 그대로이고 파일이 있으면 다시 받지 않는다.
        const sig = `${info.sha1}:${job.width || ''}x${job.height || ''}:${job.trim ? 't' : ''}`;
        if (manifest[rel] === sig && await access(job.out).then(() => true, () => false)) { skipped++; continue; }
        const buf = await get(info.url, { binary: true });
        await sleep(150);
        let img = sharp(buf);
        if (job.trim) img = img.trim();
        img = img.resize({ width: job.width, height: job.height, fit: 'inside', withoutEnlargement: true });
        await mkdir(dirname(job.out), { recursive: true });
        await img.webp({ quality: 82, effort: 5 }).toFile(job.out);
        manifest[rel] = sig;
        done++;
      } catch (err) {
        // 받지 못했어도 예전에 받아 둔 파일이 있으면 그걸 쓴다.
        if (await access(job.out).then(() => true, () => false)) { skipped++; console.warn(`! 이미지 갱신 실패(기존 파일 유지) ${job.file}: ${err.message}`); continue; }
        failed++;
        job.failed = true;
        console.warn(`! 이미지 실패 ${job.file}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  clearInterval(progress);

  await mkdir(dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1));
  console.log(`이미지: ${done}개 저장, ${skipped}개 유지, ${failed}개 실패`);
  return { done, skipped, failed, total };
}

// ---------------------------------------------------------------- 카테고리

const CARD_RARITIES = ['Common', 'Uncommon', 'Rare', 'Ancient', 'Event'];

// 위키 데이터가 틀린 카드 (위키를 고치기 전까지). 위키 값이 같아지면 로그로 알려 준다 — 그때 여기서 지우면 된다.
//   public-beta 수치는 2026-10-17 위키 Cargo 이전 때 모두 반영되어 예전 보정(저거너트 등 5장)은 지웠다.
const WIKI_FIXES = {
  // 위키 설명이 'return this' 에서 끊겨 있다 (2026-10-20 확인)
  'Right Hand Hand': { Text: '$Osty deals [4|6] damage.<br>Whenever you play a card that costs @NE@NE or more, return this to your Hand from the Discard Pile.' },
};
function wikiFix(name, c) {
  const fix = WIKI_FIXES[name];
  if (!fix) return c;
  if (Object.entries(fix).every(([k, v]) => c[k] === v)) console.log(`  위키가 고쳐짐 — WIKI_FIXES 에서 '${name}' 를 지워도 된다`);
  return { ...c, ...fix };
}

async function cards() {
  const items = [];
  for (const group of [...CHARACTERS.map(c => c.en), 'Colorless']) {
    const data = await cardGroup(group);
    for (const [name, raw] of Object.entries(data)) {
      const c = wikiFix(name, raw);
      if (!CARD_RARITIES.includes(c.Rarity)) continue;
      if (c.Multiplayer && String(c.Multiplayer).toLowerCase() !== 'no') continue;
      const ch = charByEn.get(c.Color);
      const id = slug(name);
      items.push(cardItem(name, c, id, ch ? ch.id : SHARED_GROUP.id));
    }
  }
  const groups = [...charGroups(), { ...SHARED_GROUP, name: 'Colorless' }];
  putGroups('cards', groups, (lang, g) => (g.id === SHARED_GROUP.id ? SHARED_NAMES[lang].colorless : nameOf(lang, 'characters', g.name)));
  return {
    id: 'cards', name: 'Cards', tile: 'card', groupKind: 'character',
    // 희귀도는 섞여 있어 의미가 덜하므로 캐릭터 × 종류(공격·스킬·파워)로 나눈다.
    split: { by: ['type'], groupFirst: true },
    groups,
    items,
  };
}

// 카드 한 장: 강화 전/후 효과·코스트·이미지를 따로 둔다.
function cardItem(name, c, id, group) {
  const upgradable = !c.NoUpgrade && c.Rarity !== 'Curse';
  const changed = hasUpgrade(c.Text);
  const costUp = c.CostPlus ?? undefined;
  const nameEn = name.replace(/\s*\((Ironclad|Silent|Regent|Necrobinder|Defect)\)$/, '');
  translate(`cards/${id}`, 'cards', nameEn, c.Text, { keywords: true, upgradable });
  return {
    id,
    name: nameEn,
    group,
    rarity: c.Rarity.toLowerCase(),
    type: String(c.Type || '').toLowerCase() || undefined,
    cost: playCost(c.Cost),
    costUp: upgradable && playCost(costUp) !== undefined && costUp !== c.Cost ? costUp : undefined,
    stars: c.StarCost ?? undefined,
    text: formatText(c.Text),
    textUp: upgradable && changed ? formatText(c.Text, 'up') : undefined,
    img: image(c.Image, 'cards', id, { height: 300, beta: c.ImageBeta }),
    imgUp: upgradable && c.Image ? image(c.ImagePlus || c.Image.replace(/\.png$/i, 'Plus.png'), 'cards-up', id, { height: 300, beta: c.ImageBetaPlus }) : undefined,
  };
}

// 위키의 Cost -2 는 '사용할 수 없음'(저주·상태이상 대부분)이라 비용으로 보이지 않는다. -1 은 X 비용.
const playCost = cost => (cost === undefined || cost === null || cost < -1 ? undefined : cost);

async function curses() {
  const data = await cardGroup('Colorless');
  const items = Object.entries(data)
    .filter(([, c]) => c.Rarity === 'Curse' && !c.Multiplayer)
    .map(([name, c]) => {
      const id = slug(name);
      translate(`curses/${id}`, 'cards', name, c.Text, { keywords: true });
      return { id, name, cost: playCost(c.Cost), text: formatText(c.Text), img: image(c.Image, 'curses', id, { height: 300, beta: c.ImageBeta }) };
    });
  return { id: 'curses', name: 'Curses', tile: 'card', items };
}

const RELIC_RARITIES = ['Starter', 'Common', 'Uncommon', 'Rare', 'Shop', 'Event', 'Ancient'];

async function relics() {
  const data = await module('Module:Relics/StS2 data');
  const items = [];
  for (const [name, r] of Object.entries(data)) {
    if (!RELIC_RARITIES.includes(r.Rarity)) continue;
    const ch = charByEn.get(r.Character);
    // 이벤트의 가짜 유물('Anchor???')은 진짜 유물과 주소가 겹치지 않게 따로 둔다.
    const id = slug(name) + (/\?{2,}$/.test(name) ? '-fake' : '');
    translate(`relics/${id}`, 'relics', name, r.Description, {}, lang => {
      const flavor = entryOf(lang, 'relics', name)?.flavor;
      return { flavor: flavor ? escapeHtml(flavor.replace(/\[\/?[a-z_]+(?:=[^\]]*)?\]/g, '').trim()) : undefined };
    });
    items.push({
      id, name,
      group: ch ? ch.id : SHARED_GROUP.id,
      rarity: r.Rarity.toLowerCase(),
      flavor: r.Flavor && !/revealed in the future/i.test(r.Flavor) ? escapeHtml(formatPlain(r.Flavor)) : undefined,
      source: r.AncientSource ? String(r.AncientSource).replace(/\{\{[^|}]*\|([^}]*)\}\}/g, '$1').replace(/[\[\]]/g, '').trim() : undefined,
      text: formatText(r.Description),
      img: image(r.Image, 'relics', id, { height: 128, width: 128 }),
    });
  }
  const groups = [...charGroups(), SHARED_GROUP];
  putGroups('relics', groups, (lang, g) => (g.id === SHARED_GROUP.id ? SHARED_NAMES[lang].shared : nameOf(lang, 'characters', g.name)));
  // 묶음 이름에 쓰는 고대의 존재 이름 번역 (값은 영어로 두어 묶음 주소가 바뀌지 않게)
  for (const lang of ACTIVE) {
    OVERLAY[lang].labels.relics = { source: Object.fromEntries(ANCIENTS.map(a => [a, nameOf(lang, 'ancients', a) || a])) };
  }
  return {
    id: 'relics', name: 'Relics', tile: 'icon', groupKind: 'character',
    // 희귀도별로 나누고, 고대 유물처럼 너무 많은 묶음은 그 유물을 주는 고대의 존재별로 다시 나눈다.
    split: { by: ['rarity'], overflow: 'source', sharedGroup: SHARED_GROUP.id },
    groups,
    items,
  };
}

async function potions() {
  const data = await module('Module:Potions/StS2 data');
  const items = [];
  for (const [name, p] of Object.entries(data)) {
    if (!['Common', 'Uncommon', 'Rare'].includes(p.Rarity)) continue;
    const ch = charByEn.get(p.Character);
    const id = slug(name);
    translate(`potions/${id}`, 'potions', name, p.Text);
    items.push({
      id, name,
      group: ch ? ch.id : SHARED_GROUP.id,
      rarity: p.Rarity.toLowerCase(),
      text: formatText(p.Text),
      img: image(p.Image, 'potions', id, { height: 128, width: 128 }),
    });
  }
  const groups = [...charGroups(), SHARED_GROUP];
  putGroups('potions', groups, (lang, g) => (g.id === SHARED_GROUP.id ? SHARED_NAMES[lang].shared : nameOf(lang, 'characters', g.name)));
  return {
    id: 'potions', name: 'Potions', tile: 'icon', groupKind: 'character',
    split: { by: ['rarity'], sharedGroup: SHARED_GROUP.id },
    groups,
    items,
  };
}

// 1막은 Overgrowth 와 Underdocks 중 하나가 무작위로 나온다.
const AREAS = [
  { en: 'Overgrowth', id: 'overgrowth', act: 1, color: '#6f9a4a' },
  { en: 'Underdocks', id: 'underdocks', act: 1, color: '#4a7f9a' },
  { en: 'Hive', id: 'hive', act: 2, color: '#c99a3a' },
  { en: 'Glory', id: 'glory', act: 3, color: '#a06ad0' },
];
// 지역 이름: 'Act 1 · Overgrowth', '1막 · 과성장'
const areaName = (lang, a) => `${actLabel(lang, a.act)} · ${lang === 'en' ? a.en : nameOf(lang, 'acts', a.en) || a.en}`;
for (const a of AREAS) a.name = areaName('en', a);
const areaByEn = new Map(AREAS.map(a => [a.en, a]));

// 같은 전투에 함께 나오는 적(예: The Kin = Kin Follower + Kin Priest)은 하나로 묶는다.
function encounters(data, type) {
  const byEncounter = new Map();
  for (const [name, e] of Object.entries(data)) {
    if (e.Type !== type) continue;
    const encounter = (e.Link ? e.Link.split('#')[0] : name).replace(/_/g, ' ');
    if (!byEncounter.has(encounter)) byEncounter.set(encounter, []);
    byEncounter.get(encounter).push({ name, ...e });
  }
  return [...byEncounter].map(([name, members]) => {
    const first = members.find(m => m.Image) || members[0];
    const debut = String(first.Debut || '').match(/\|([^}]+)\}\}/)?.[1];
    const hp = members.map(m => m.BaseHP).filter(Boolean).join(' / ');
    return { name, members, first, debut, hp };
  });
}

function enemyItems(data, type, folder, fallbackArea) {
  return encounters(data, type).map(e => {
    const id = slug(e.name);
    const area = areaByEn.get(e.debut) || fallbackArea;
    const intents = m => (Array.isArray(m.Intents) ? m.Intents : Object.values(m.Intents || {})).filter(x => x && x.Name);
    // 이름·지역·기술 이름은 언어마다, 행동 설명은 위키 영어 그대로
    const describe = (areaLabel, memberName) => escapeHtml([
      areaLabel,
      e.hp && `HP ${e.hp}`,
      e.members.length > 1 && e.members.map(m => memberName(m.name)).join(', '),
    ].filter(Boolean).join('\n'));
    for (const lang of ACTIVE) {
      // 몬스터 이름 → 없으면 전투 이름(Knight Gang) → 'Test Subject (Phase 2)' 는 단계 표시를 옮긴다
      const memberName = n => {
        const found = nameOf(lang, 'monsters', n) || nameOf(lang, 'encounters', n);
        if (found) return found;
        const phase = n.match(/^(.*\S)\s*\(Phase (\d+)\)$/);
        const base = phase && (nameOf(lang, 'monsters', phase[1]) || nameOf(lang, 'encounters', phase[1]));
        return base ? `${base} (${PHASE[lang]?.(phase[2]) ?? `Phase ${phase[2]}`})` : n;
      };
      const moves = L10N[lang].moves || {};
      // 'Slash2' 처럼 같은 이름 기술을 숫자로 구분한 위키 이름은 숫자를 떼고 찾는다
      const moveName = (m, x) => {
        for (const mv of [lc(x.Name), lc(x.Name).replace(/\s*\d+$/, '')]) {
          const hit = moves[`${lc(m.name)}|${mv}`] || moves[`*|${mv}`];
          if (hit) return hit;
        }
        return String(x.Name);
      };
      put(lang, `${folder}/${id}`, {
        name: nameOf(lang, 'encounters', e.name) || nameOf(lang, 'monsters', e.name) || nameOf(lang, 'encounterIds', e.name),
        text: describe(area && areaName(lang, area), memberName),
        area: area && areaName(lang, area),
        members: e.members.map(m => ({
          name: memberName(m.name),
          moves: intents(m).map(x => moveName(m, x)),
        })),
      });
    }
    return {
      id, name: e.name,
      group: area?.id,
      text: describe(area?.name, n => n),
      img: image(e.first.Image, folder, id, { height: 220, width: 260, trim: true }),
      area: area?.name,
      members: e.members.map(m => ({
        name: m.name,
        hp: m.BaseHP ? String(m.BaseHP) : undefined,
        hpAsc: m.AscHP && m.AscHP !== m.BaseHP ? String(m.AscHP) : undefined,
        moves: intents(m).map(x => ({ name: String(x.Name), text: formatEnemyText(x.Text) })),
      })),
    };
  });
}

function enemyCategory(id, name, items) {
  const groups = AREAS.filter(a => items.some(i => i.group === a.id)).map(({ id, name, color }) => ({ id, name, color }));
  putGroups(id, groups, (lang, g) => areaName(lang, AREAS.find(a => a.id === g.id)));
  return { id, name, tile: 'creature', groupKind: 'act', enemy: true, groups, items };
}

async function bossCategory() {
  return enemyCategory('bosses', 'Bosses', enemyItems(await module('Module:Enemies/StS2 data/Bosses'), 'Boss', 'bosses'));
}

async function eliteCategory() {
  return enemyCategory('elites', 'Elites', enemyItems(await module('Module:Enemies/StS2 data/Elites'), 'Elite', 'elites'));
}

async function monsterCategory() {
  const items = [];
  for (const area of AREAS) {
    items.push(...enemyItems(await module(`Module:Enemies/StS2 data/${area.en}`), 'Normal', 'monsters', area));
  }
  return enemyCategory('monsters', 'Monsters', items);
}

async function enchantmentCategory() {
  const data = await module('Module:Keywords/StS2 data/Enchantments');
  const items = Object.entries(data).map(([name, e]) => {
    const id = slug(name);
    translate(`enchantments/${id}`, 'enchantments', name, e.Text);
    return { id, name, text: formatText(e.Text), img: image(e.Image, 'enchantments', id, { height: 128, width: 128 }) };
  });
  return { id: 'enchantments', name: 'Enchantments', tile: 'icon', items };
}

const formatPlain = raw => String(raw || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\{\{[^{}]*\|([^{}|]*)\}\}/g, '$1').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim();

// ---------------------------------------------------------------- 용어 팝업
// 효과 문구 속 <b data-ref="종류|위키 이름"> 을 실제 키로 바꾸고, 가리키는 키워드·버프/디버프·구체·티어표에 없는 카드의 설명을 모은다.
//   키: 사이트 항목은 'cards/abundance' 처럼 그대로, 그 밖은 'kw:vulnerable'(키워드·버프·디버프·구체), 'card:dowsing'(토큰·퀘스트·상태이상·기본 카드)
//   site/data/glossary.json = { terms: { 키: { name, type, text, img?, cost? } } } (영어). 언어별 이름은 i18n/<언어>.json 의 glossary.
const KW_MODULES = ['Common', 'Player', 'Afflictions', 'Characters', 'Icons'];
const POWER_MODULES = ['Common', 'Debuff', 'Ironclad', 'Silent', 'Regent', 'Necrobinder', 'Defect', 'Enemy'];

async function tryModule(title) {
  try { return await module(title); } catch (err) { console.warn(`! ${title}: ${err.message}`); return {}; }
}

// 'Exhausted' → exhausted / exhaust, "Osty's" → osty, 'Shivs' → shiv
function nameVariants(name) {
  const n = lc(name).replace(/[’']s$/, '').replace(/\s+/g, ' ');
  return [...new Set([n, n.replace(/es$/, ''), n.replace(/s$/, ''), n.replace(/ed$/, ''), n.replace(/d$/, ''), n.replace(/ned$/, ''), n.replace(/ing$/, ''), n.replace(/ing$/, 'e')])];
}

async function buildGlossary(categories) {
  const defs = new Map(); // 키 → { name, raw, img, type, cost? }
  // 버프·디버프(같은 이름이면 버프·디버프 정의가 먼저)
  for (const m of POWER_MODULES) {
    for (const [name, d] of Object.entries(await tryModule(`Module:Powers/StS2 data/${m}`))) {
      const key = `kw:${slug(name)}`;
      if (!defs.has(key) && d.Text) defs.set(key, { name, raw: d.Text, img: d.Image, type: /debuff/i.test(d.Type || '') ? 'debuff' : 'buff' });
    }
  }
  const alias = new Map(); // 다른 이름 → 키 ('lightning' → kw:lightning-orb)
  for (const m of KW_MODULES) {
    for (const [name, d] of Object.entries(await tryModule(`Module:Keywords/StS2 data/${m}`))) {
      const key = `kw:${slug(name)}`;
      if (!defs.has(key) && d.Text) defs.set(key, { name, raw: d.Text, img: d.Image, type: m === 'Icons' ? 'orb' : m === 'Characters' ? 'character' : 'keyword' });
      if (/ Orb$/.test(name)) alias.set(lc(name.replace(/ Orb$/, '')), key);
    }
  }
  // 티어표에 없는 카드(토큰·퀘스트·상태이상·기본 카드)
  for (const group of [...CHARACTERS.map(c => c.en), 'Colorless']) {
    for (const [name, c] of Object.entries(await cardGroup(group))) {
      if (CARD_RARITIES.includes(c.Rarity) || c.Rarity === 'Curse') continue;
      const key = `card:${slug(name)}`;
      if (!defs.has(key)) defs.set(key, { name: name.replace(/\s*\((Ironclad|Silent|Regent|Necrobinder|Defect)\)$/, ''), raw: c.Text, img: c.Image, imgBeta: c.ImageBeta, type: 'card', cost: playCost(c.Cost), cardType: c.Type });
    }
  }

  // 티어표에 없는 포션(용연향, 포션 모양 돌 등)
  for (const [name, p] of Object.entries(await tryModule('Module:Potions/StS2 data'))) {
    if (['Common', 'Uncommon', 'Rare'].includes(p.Rarity)) continue;
    const key = `potion:${slug(name)}`;
    if (!defs.has(key)) defs.set(key, { name, raw: p.Text, img: p.Image, type: 'potion' });
  }

  // 이름 → 키 (종류별). 숨긴 항목은 연결하지 않는다.
  const index = { kw: new Map(), card: new Map(), relic: new Map(), potion: new Map() };
  const add = (kind, name, key) => { for (const v of nameVariants(name)) if (!index[kind].has(v)) index[kind].set(v, key); };
  for (const [key, d] of defs) add(key.startsWith('card:') ? 'card' : key.startsWith('potion:') ? 'potion' : 'kw', d.name, key);
  for (const [a, key] of alias) add('kw', a, key);
  const KIND_OF = { cards: 'card', curses: 'card', relics: 'relic', potions: 'potion', enchantments: 'kw' };
  for (const cat of categories) {
    const kind = KIND_OF[cat.id];
    if (!kind) continue;
    for (const item of cat.items) if (!item.hidden && !item.id.endsWith('-fake')) {
      // 사이트 항목이 같은 이름의 정의보다 먼저 (카드 'Shiv' 등)
      for (const v of nameVariants(item.name)) index[kind].set(v, `${cat.id}/${item.id}`);
    }
  }
  const ORDER = { kw: ['kw', 'card'], card: ['card', 'kw'], relic: ['relic'], potion: ['potion'] };
  const resolve = (kind, name) => {
    for (const k of ORDER[kind] || []) for (const v of nameVariants(name)) if (index[k].has(v)) return index[k].get(v);
    return null;
  };

  const used = new Set();
  const unescape = s => s.replace(/&#39;|&quot;|&amp;/g, m => ({ '&#39;': "'", '&quot;': '"', '&amp;': '&' })[m]);
  // "$Royally Approved" 처럼 두 낱말 이름은 위키 표기에서 첫 낱말만 묶이므로 뒤 낱말까지 붙여 본다
  const fix = html => html && html.replace(/<b data-ref="([a-z]+)\|([^"]*)">([^<]*)<\/b>( [A-Z][A-Za-z]+)?/g, (all, kind, name, shown, next = '') => {
    let key = resolve(kind, unescape(name));
    let tail = next;
    if (!key && next) { key = resolve(kind, `${unescape(name)}${next}`); if (key) { shown += next; tail = ''; } }
    if (!key) return `<b>${shown}</b>${tail}`;
    used.add(key);
    return `<b data-ref="${key}">${shown}</b>${tail}`;
  });
  for (const cat of categories) {
    for (const item of cat.items) {
      used.clear();
      item.text = fix(item.text);
      item.textUp = fix(item.textUp);
      for (const m of item.members || []) for (const mv of m.moves) mv.text = fix(mv.text);
      used.delete(`${cat.id}/${item.id}`);
      if (used.size) item.refs = [...used];
      for (const k of used) allUsed.add(k);
    }
  }
  // 정의 설명 안의 참조도 따라간다 (다우징 → 풍요)
  const terms = {};
  const queue = [...allUsed].filter(k => defs.has(k));
  while (queue.length) {
    const key = queue.shift();
    if (terms[key]) continue;
    const d = defs.get(key);
    used.clear();
    const text = fix(formatText(d.raw));
    used.delete(key);
    const id = key.slice(key.indexOf(':') + 1);
    terms[key] = {
      name: d.name, type: d.type, text,
      cost: d.cost ?? undefined, cardType: d.cardType ? String(d.cardType).toLowerCase() : undefined,
      refs: used.size ? [...used] : undefined,
      img: d.type === 'card' ? image(d.img, 'cards-extra', id, { height: 300, beta: d.imgBeta })
        : d.type === 'potion' ? image(d.img, 'potions-extra', id, { height: 128, width: 128 })
        : image(d.img, 'terms', id, { height: 64, width: 64 }),
    };
    for (const k of used) { allUsed.add(k); if (defs.has(k) && !terms[k]) queue.push(k); }
  }

  // 언어별 이름: 카드는 게임 언어 파일의 카드 이름, 키워드는 게임 효과 문구의 [gold] 용어를 영어·번역 틀에서 맞대어 찾는다.
  for (const lang of ACTIVE) {
    const pair = goldTermPairs(lang);
    const names = {};
    for (const [key, t] of Object.entries(terms)) {
      const n = key.startsWith('card:') ? nameOf(lang, 'cards', t.name)
        : key.startsWith('potion:') ? nameOf(lang, 'potions', t.name)
        : L10N[lang].keywords?.[t.name] || pair.get(lc(t.name)) || pair.get(lc(t.name.replace(/ Orb$/, '')));
      if (n) names[key] = n;
    }
    OVERLAY[lang].glossary = names;
  }
  console.log(`용어 팝업: 정의 ${Object.keys(terms).length}개, 참조된 키 ${allUsed.size}개`);
  return { terms };
}
const allUsed = new Set();

// 게임 언어 파일의 영어·번역 효과 틀에서 [gold]용어[/gold] 를 서로 짝짓는다 (함께 나오는 횟수, 서로 가장 많이 함께 나오는 짝만)
function goldTermPairs(lang) {
  const gold = s => [...new Set([...String(s || '').matchAll(/\[gold\]([^\[]+)\[\/gold\]/g)].map(m => m[1].trim()))];
  const score = new Map(); // en → Map(tr → 점수)
  for (const table of ['cards', 'relics', 'potions', 'enchantments']) {
    for (const e of Object.values(L10N[lang][table] || {})) {
      if (!e.en || !e.tr) continue;
      const E = gold(e.en), T = gold(e.tr);
      for (const a of E) for (const b of T) {
        const m = score.get(lc(a)) || new Map();
        m.set(b, (m.get(b) || 0) + 1 / (E.length * T.length));
        score.set(lc(a), m);
      }
    }
  }
  const best = new Map(); // en → [tr, 점수]
  for (const [en, m] of score) best.set(en, [...m].sort((x, y) => y[1] - x[1])[0]);
  const bestEnFor = new Map(); // tr → en
  for (const [en, m] of score) for (const [tr, n] of m) if (!bestEnFor.has(tr) || bestEnFor.get(tr)[1] < n) bestEnFor.set(tr, [en, n]);
  const out = new Map();
  for (const [en, [tr, n]] of best) if (n >= 1 && bestEnFor.get(tr)?.[0] === en) out.set(en, tr);
  return out;
}

const ANCIENTS = ['Neow', 'Orobas', 'Darv', 'Tezcatara', 'Tanx', 'Pael', 'Nonupeipe', 'Vakuu'];
const ANCIENT_ACTS = [
  { id: 'act1', act: 1, name: 'Act 1', color: '#6f9a4a' },
  { id: 'act2', act: 2, name: 'Act 2', color: '#c99a3a' },
  { id: 'act3', act: 3, name: 'Act 3', color: '#a06ad0' },
];

// 위키 문서의 '== Act 2 ==' 같은 구역 아래 나오는 이름으로 각 고대의 존재가 몇 막에 나오는지 알아낸다.
// 'Act 2/3' 처럼 적힌 경우(Darv)는 두 막 모두에 넣는다.
async function ancientActs() {
  const acts = new Map();
  let src = '';
  try {
    src = process.env.WIKI_RAW_DIR
      ? await readFile(join(process.env.WIKI_RAW_DIR, '..', 'pages', 'Slay_the_Spire_2_Ancients.wiki'), 'utf8')
      : await get(`${WIKI}/index.php?title=${encodeURIComponent('Slay the Spire 2:Ancients')}&action=raw`);
  } catch { return acts; }
  let current = [];
  for (const line of src.split('\n')) {
    const head = line.match(/^==\s*(.+?)\s*==\s*$/);
    if (head) {
      const n = head[1].match(/Act\s*(\d)/);
      current = n ? [Number(n[1])] : [];
      continue;
    }
    const multi = line.match(/Act\s*(\d)\s*\/\s*(\d)/);
    const name = line.match(/elite-name">\{\{2\|([^}|]+)\}\}/)?.[1];
    if (name) acts.set(name, current.slice());
    if (multi) {
      const last = [...acts.keys()].pop();
      if (last) acts.set(last, [Number(multi[1]), Number(multi[2])]);
    }
    if (/^==\s*Effective/.test(line)) break;
  }
  return acts;
}

async function charactersAndAncients() {
  const data = await module('Module:Keywords/StS2 data/Characters');
  // 캐릭터는 전신 원화, 고대의 존재는 지도 아이콘을 쓴다.
  const chars = CHARACTERS.map(c => {
    for (const lang of ACTIVE) put(lang, `characters/${c.id}`, { name: nameOf(lang, 'characters', c.en) });
    return { id: c.id, name: c.en, img: image(`StS2_${c.en}.png`, 'characters', c.id, { height: 240, width: 200, trim: true }) };
  });
  const acts = await ancientActs();
  const ancients = Object.keys(data)
    .filter(name => ANCIENTS.includes(name))
    .map(name => {
      const a = (acts.get(name) || []).map(n => ANCIENT_ACTS[n - 1]).filter(Boolean);
      const describe = (lang, epithet) => escapeHtml([
        epithet,
        a.length && APPEARS[lang] + a.map(x => actLabel(lang, x.act)).join(LIST_SEP[lang]),
      ].filter(Boolean).join('\n')) || undefined;
      for (const lang of ACTIVE) {
        put(lang, `ancients/${slug(name)}`, { name: nameOf(lang, 'ancients', name), text: describe(lang, nameOf(lang, 'ancientEpithets', name)) });
      }
      return {
        id: slug(name), name,
        group: a[0]?.id,
        groups: a.length > 1 ? a.map(x => x.id) : undefined,
        text: describe('en'),
        img: image(`StS2_Map-${name}.png`, 'ancients', slug(name), { height: 160, width: 160 }),
      };
    });
  const groups = ANCIENT_ACTS.map(({ id, name, color }) => ({ id, name, color }));
  putGroups('ancients', ANCIENT_ACTS, (lang, g) => actLabel(lang, g.act));
  return [
    { id: 'characters', name: 'Characters', tile: 'portrait', items: chars },
    { id: 'ancients', name: 'Ancients', tile: 'icon', groupKind: 'act', groups, items: ancients },
  ];
}

// ---------------------------------------------------------------- 실행

// 게임 언어 파일(한국어)에 이름이 없는 항목은 숨긴다 (hidden: true). 위키에만 있고 게임 파일에는 아직 없는 항목이다.
// 매번 새로 정하므로, 새 언어 파일을 넣고 다시 돌리면 이름이 생긴 항목은 저절로 다시 보이고, 사라진 항목은 숨겨진다.
function markHidden(categories) {
  const hidden = [];
  for (const cat of categories) {
    for (const item of cat.items) {
      if (L10N.ko && !OVERLAY.ko.items[`${cat.id}/${item.id}`]?.name) { item.hidden = true; hidden.push(`${cat.id}/${item.id}`); }
    }
  }
  if (hidden.length) console.log(`숨김(게임 언어 파일에 이름 없음) ${hidden.length}개: ${hidden.join(', ')}`);
}

async function main() {
  const [characters, ancients] = await charactersAndAncients();
  const categories = [
    characters,
    await cards(),
    await curses(),
    await relics(),
    await potions(),
    await enchantmentCategory(),
    ancients,
    await monsterCategory(),
    await eliteCategory(),
    await bossCategory(),
  ];

  // 숨김 표시를 먼저 정해야 숨긴 항목으로 연결하지 않는다 (아래 숨김 처리를 여기로 당겨 쓴다)
  markHidden(categories);
  const glossary = await buildGlossary(categories);

  let imageStats = null;
  if (WITH_IMAGES) imageStats = await runImageJobs();
  else for (const job of imageJobs) job.failed = !(await access(job.out).then(() => true, () => false));

  // 받지 못한 이미지는 경로를 지워서 이름 타일로 보이게 한다.
  const failed = new Set(imageJobs.filter(j => j.failed).map(j => j.out));
  for (const cat of categories) {
    for (const item of cat.items) {
      for (const key of ['img', 'imgUp']) {
        if (item[key] && failed.has(join(ROOT, 'site', item[key]))) delete item[key];
        if (item[key] === null || item[key] === undefined) delete item[key];
      }
      for (const key of Object.keys(item)) {
        if (item[key] === undefined) delete item[key];
      }
    }
    cat.items.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }

  // 숨긴 항목도 키는 남긴다 (이미 받은 표·댓글이 다시 보일 때 그대로 이어지게)
  const keys = categories.flatMap(c => c.items.map(i => `${c.id}/${i.id}`)).sort();
  const known = new Set(keys);
  for (const lang of ACTIVE) {
    for (const key of Object.keys(OVERLAY[lang].items)) if (!known.has(key)) delete OVERLAY[lang].items[key];
  }

  let previous = null;
  try { previous = JSON.parse(await readFile(join(DATA, 'sts2.json'), 'utf8')); } catch { /* 처음 */ }

  const out = {
    source: `${WIKI}/`,
    fetchedAt: new Date().toISOString(),
    categories,
  };

  // 내용이 그대로면 수집 시각도 그대로 둬서 불필요한 커밋을 막는다.
  const same = previous && JSON.stringify(previous.categories) === JSON.stringify(categories);
  if (same) out.fetchedAt = previous.fetchedAt;

  await mkdir(join(DATA, 'i18n'), { recursive: true });
  await writeFile(join(DATA, 'sts2.json'), JSON.stringify(out));
  await writeFile(join(DATA, 'keys.json'), JSON.stringify(keys));
  await writeFile(join(DATA, 'glossary.json'), JSON.stringify(glossary));
  for (const lang of ACTIVE) await writeFile(join(DATA, 'i18n', `${lang}.json`), JSON.stringify(OVERLAY[lang]));

  if (AUDIT) await writeFile(process.env.L10N_AUDIT, JSON.stringify(AUDIT));
  for (const c of categories) console.log(`${c.name}: ${c.items.length}`);
  for (const lang of ACTIVE) {
    const st = stats[lang];
    console.log(`${lang}: 이름 ${st.name}/${st.total}, 효과 ${st.text}/${st.total}`);
  }
  console.log(same ? '데이터 변경 없음' : '데이터 갱신됨');
  // 이미지가 일부 빠져도 데이터는 저장하되(이름 타일로 표시됨), 워크플로에서 알 수 있게 표시한다.
  if (imageStats?.failed && process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `image_failed=${imageStats.failed}\n`, { flag: 'a' });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1); });
}
