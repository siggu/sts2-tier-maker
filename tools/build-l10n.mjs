// 게임에서 꺼낸 언어 파일(localization/eng, localization/kor, jpn, zhs, zht)에서 사이트에 필요한 부분만 뽑아
// tools/l10n/<언어>.json 으로 저장한다. 원본 언어 파일 전체는 저장소에 넣지 않는다.
//
// 사용: node tools/build-l10n.mjs <eng 와 언어 폴더들이 들어 있는 폴더>
// 게임 패치 후 GDRE Tools 로 다시 꺼내 이 스크립트를 돌리고, 바뀐 json 을 커밋하면 된다.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const lower = s => String(s).trim().toLowerCase();

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
    out[lower(v.replace(/^The /, ''))] ||= ko[k];
    out[lower(v)] ||= ko[k];
  }
  return out;
}

// 몬스터 기술 이름: "<몬스터 영어 이름>|<기술 영어 이름>" → 한국어
async function moves() {
  const [en, ko] = await Promise.all([load('eng', 'monsters'), load('kor', 'monsters')]);
  const out = {};
  for (const [k, v] of Object.entries(en)) {
    const m = k.match(/^([A-Z0-9_]+)\.moves\.[A-Z0-9_]+\.title$/);
    if (!m || !ko[k]) continue;
    const monster = en[`${m[1]}.name`];
    if (monster) out[`${lower(monster)}|${lower(v)}`] = ko[k];
    out[`*|${lower(v)}`] ||= ko[k];
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
  cards: await titled('cards'),
  relics: await titled('relics', { flavor: true }),
  potions: await titled('potions'),
  enchantments: await titled('enchantments'),
  keywords: await keywords(),
  characters: await names('characters', '.title'),
  ancients: await names('ancients', '.title'),
  ancientEpithets: await ancientEpithets(),
  acts: await names('acts', '.title'),
  encounters: await names('encounters', '.title'),
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
