// 게임에서 꺼낸 언어 파일(localization/eng, localization/kor, jpn, zhs, zht)에서 사이트에 필요한 부분만 뽑아
// tools/l10n/<언어>.json 으로 저장한다. 원본 언어 파일 전체는 저장소에 넣지 않는다.
//
// 사용: node tools/build-l10n.mjs <eng 와 언어 폴더들이 들어 있는 폴더>
// 게임 패치 후 GDRE Tools 로 다시 꺼내 이 스크립트를 돌리고, 바뀐 json 을 커밋하면 된다.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { specialize } from './l10n.mjs';

const SRC = process.argv[2];
if (!SRC) {
  console.error('사용: node tools/build-l10n.mjs <localization 폴더>');
  process.exit(1);
}
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'l10n');
// 게임 폴더 이름 → 사이트 언어 코드
const LANGS = { kor: 'ko', jpn: 'ja', zhs: 'zh-Hans', zht: 'zh-Hant' };
let TARGET = 'kor';

async function load(lang, file) {
  if (lang === 'kor') lang = TARGET;
  const text = await readFile(join(SRC, lang, `${file}.json`), 'utf8');
  return JSON.parse(text.replace(/^﻿/, ''));
}

// 찾기용 키: 소문자, 굽은 따옴표 → 곧은 따옴표 (fetch-data.mjs 의 lc 와 같게)
const lower = s => String(s).trim().toLowerCase().replace(/[‘’]/g, "'");
// 이름 속 게임 자리표시자: "Test Subject #C{Count}" → "Test Subject"
const cleanName = s => String(s).replace(/\s*#C\{[^{}]*\}/g, '').replace(/\s*\{[^{}]*\}/g, '').trim();

// "<KEY>.title" 로 영어 이름 → { name, en(영어 효과 틀), tr(이 언어 효과 틀), flavor }
async function titled(file, { description = 'description', flavor = false } = {}) {
  const [en, ko] = await Promise.all([load('eng', file), load('kor', file)]);
  const out = {};
  for (const [k, v] of Object.entries(en)) {
    const m = k.match(/^([A-Z0-9_]+)\.title$/);
    if (!m || !ko[k]) continue;
    const key = m[1];
    const entry = { name: ko[k] };
    if (en[`${key}.${description}`] && ko[`${key}.${description}`]) {
      entry.en = en[`${key}.${description}`];
      entry.tr = ko[`${key}.${description}`];
    }
    // 영어가 '추후 공개' 자리 문구면 빼 둔다
    if (flavor && ko[`${key}.flavor`] && !/revealed in the future/i.test(en[`${key}.flavor`] || '')) entry.flavor = ko[`${key}.flavor`];
    out[lower(v)] ||= entry;
  }
  return out;
}

async function names(file, suffix) {
  const [en, ko] = await Promise.all([load('eng', file), load('kor', file)]);
  const out = {};
  for (const [k, v] of Object.entries(en)) {
    if (!k.endsWith(suffix) || !ko[k]) continue;
    const name = cleanName(ko[k]);
    out[lower(cleanName(v).replace(/^The /, ''))] ||= name;
    out[lower(cleanName(v))] ||= name;
  }
  return out;
}

// 전투 id → 이름. 위키 전투 이름이 게임 표시 이름과 다를 때 마지막으로 찾는다 (예: 'Slimes' ↔ SLIMES_NORMAL 'Swarm of Slimes')
async function encounterIds() {
  const ko = await load('kor', 'encounters');
  const out = {};
  for (const [k, v] of Object.entries(ko)) {
    const m = k.match(/^([A-Z0-9_]+?)(?:_(NORMAL|WEAK|ELITE|BOSS|EVENT))?\.title$/);
    if (m) out[lower(m[1].replace(/_/g, ' '))] ||= cleanName(v);
  }
  return out;
}

// 몬스터 기술 이름: "<몬스터 영어 이름>|<기술 영어 이름>" → 한국어
// 위키가 기술 id 를 이름처럼 쓰는 경우(THUNDER_STRIKE → 'Thunder Strike', 게임 이름은 'Channel Lightning')도 찾게 한다.
const MOVE_ALIASES = { stun: 'stunned' };
async function moves() {
  const [en, ko] = await Promise.all([load('eng', 'monsters'), load('kor', 'monsters')]);
  const out = {};
  const ids = [];
  for (const [k, v] of Object.entries(en)) {
    const m = k.match(/^([A-Z0-9_]+)\.moves\.([A-Z0-9_]+)\.title$/);
    if (!m || !ko[k]) continue;
    const monster = en[`${m[1]}.name`] && lower(cleanName(en[`${m[1]}.name`]));
    if (monster) out[`${monster}|${lower(v)}`] = ko[k];
    out[`*|${lower(v)}`] ||= ko[k];
    ids.push([monster, lower(m[2].replace(/_/g, ' ')), ko[k]]);
  }
  for (const [monster, id, name] of ids) {
    if (monster) out[`${monster}|${id}`] ||= name;
    out[`*|${id}`] ||= name;
  }
  for (const [alias, target] of Object.entries(MOVE_ALIASES)) if (out[`*|${target}`]) out[`*|${alias}`] ||= out[`*|${target}`];
  return out;
}

// 괴짜 과학(Mad Science): 이벤트 '땜질 시간'에서 고른 종류·추가 효과마다 위키에 따로 있는 카드.
// 게임에는 카드 하나에 선택지로 갈리는 틀만 있으므로, 선택을 고정한 틀과 '<카드 이름> (<추가 효과 이름>)' 을 만든다.
// 추가 효과는 카드 종류마다 정해져 있다 (게임 틀의 줄바꿈 위치와 위키 데이터 기준).
const MAD_SCIENCE_RIDERS = {
  Attack: ['Sapping', 'Violence', 'Choking'],
  Skill: ['Energized', 'Wisdom', 'Chaos'],
  Power: ['Expertise', 'Improvement', 'Curious'],
};
async function madScience() {
  const [en, ko, enEv, koEv] = await Promise.all([load('eng', 'cards'), load('kor', 'cards'), load('eng', 'events'), load('kor', 'events')]);
  const title = ko['MAD_SCIENCE.title'];
  const tmplEn = en['MAD_SCIENCE.description'];
  const tmplTr = ko['MAD_SCIENCE.description'];
  if (!title || !tmplEn || !tmplTr) return {};
  const all = Object.values(MAD_SCIENCE_RIDERS).flat();
  const wide = /^zh/.test(LANGS[TARGET] || '');
  const out = {};
  for (const [type, riders] of Object.entries(MAD_SCIENCE_RIDERS)) {
    for (const rider of riders) {
      const key = `TINKER_TIME.pages.CHOOSE_RIDER.options.${rider.toUpperCase()}.title`;
      if (!enEv[key] || !koEv[key]) continue;
      const choices = { CardType: type, HasRider: true, ...Object.fromEntries(all.map(r => [r, r === rider])) };
      out[lower(`${en['MAD_SCIENCE.title']} (${enEv[key]})`)] = {
        name: wide ? `${title}（${koEv[key]}）` : `${title} (${koEv[key]})`,
        en: specialize(tmplEn, choices),
        tr: specialize(tmplTr, choices),
      };
    }
  }
  return out;
}

// 게임 화면의 희귀도·카드 종류 이름
async function terms() {
  const ko = await load('kor', 'gameplay_ui');
  const pick = prefix => Object.fromEntries(Object.entries(ko)
    .filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length).toLowerCase(), v]));
  return { rarity: pick('CARD_RARITY.'), relicRarity: pick('RELIC_RARITY.'), type: pick('CARD_TYPE.'), actNumber: ko.ACT_NUMBER };
}

// 고대의 존재 이름 → 칭호 (예: neow → 부활의 어머니 (추방자))
async function ancientEpithets() {
  const [en, ko] = await Promise.all([load('eng', 'ancients'), load('kor', 'ancients')]);
  const out = {};
  for (const [k, v] of Object.entries(en)) {
    const m = k.match(/^([A-Z0-9_]+)\.title$/);
    if (m && ko[`${m[1]}.epithet`]) out[lower(v)] = ko[`${m[1]}.epithet`];
  }
  return out;
}

async function keywords() {
  const ko = await load('kor', 'card_keywords');
  const out = {};
  for (const kw of ['Innate', 'Ethereal', 'Retain', 'Sly', 'Unplayable', 'Eternal', 'Exhaust']) {
    if (ko[`${kw.toUpperCase()}.title`]) out[kw] = ko[`${kw.toUpperCase()}.title`];
  }
  return out;
}

const build = async () => ({
  terms: await terms(),
  cards: { ...await titled('cards'), ...await madScience() },
  relics: await titled('relics', { flavor: true }),
  potions: await titled('potions'),
  enchantments: await titled('enchantments'),
  keywords: await keywords(),
  characters: await names('characters', '.title'),
  ancients: await names('ancients', '.title'),
  ancientEpithets: await ancientEpithets(),
  acts: await names('acts', '.title'),
  encounters: await names('encounters', '.title'),
  encounterIds: await encounterIds(),
  monsters: await names('monsters', '.name'),
  moves: await moves(),
});

await mkdir(OUT_DIR, { recursive: true });
for (const [folder, code] of Object.entries(LANGS)) {
  if (!await access(join(SRC, folder)).then(() => true, () => false)) { console.log(`${folder}: 없음, 건너뜀`); continue; }
  TARGET = folder;
  const data = await build();
  const out = join(OUT_DIR, `${code}.json`);
  await writeFile(out, JSON.stringify(data, null, 1));
  console.log(`${code}: ${Object.entries(data).map(([k, v]) => `${k} ${Object.keys(v).length}`).join(', ')} → ${out}`);
}
