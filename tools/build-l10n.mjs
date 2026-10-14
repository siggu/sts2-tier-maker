// 게임에서 꺼낸 언어 파일(localization/eng, localization/kor)에서 사이트에 필요한 부분만 뽑아
// tools/l10n/ko.json 으로 저장한다. 원본 언어 파일 전체는 저장소에 넣지 않는다.
//
// 사용: node tools/build-l10n.mjs <eng 와 kor 폴더가 들어 있는 폴더>
// 게임 패치 후 GDRE Tools 로 다시 꺼내 이 스크립트를 돌리고, 바뀐 ko.json 을 커밋하면 된다.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2];
if (!SRC) {
  console.error('사용: node tools/build-l10n.mjs <localization 폴더>');
  process.exit(1);
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'l10n', 'ko.json');

async function load(lang, file) {
  const text = await readFile(join(SRC, lang, `${file}.json`), 'utf8');
  return JSON.parse(text.replace(/^﻿/, ''));
}

const lower = s => String(s).trim().toLowerCase();

// "<KEY>.title" 로 영어 이름 → { name, en(효과 틀), ko(효과 틀), flavor }
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
      entry.ko = ko[`${key}.${description}`];
    }
    if (flavor && ko[`${key}.flavor`]) entry.flavor = ko[`${key}.flavor`];
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

const data = {
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
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(data, null, 1));
for (const [k, v] of Object.entries(data)) console.log(`${k}: ${Object.keys(v).length}`);
console.log(`→ ${OUT}`);
