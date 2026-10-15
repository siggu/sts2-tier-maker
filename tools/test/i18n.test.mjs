// 사이트 문구 파일 검사: 모든 언어가 한국어(기준)와 같은 키, 같은 {자리표시자}를 갖는가.
//   site/js/i18n-<언어>.js          export default { 키: 문구 }
//   site/js/i18n-account.js 등      export default { ko: {...}, en: {...}, ... } (기능별 문구, i18n.js 가 합친다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site', 'js');
const LANGS = ['ko', 'en', 'ja', 'zh-Hans', 'zh-Hant'];
const FEATURES = ['i18n-account.js', 'i18n-play.js', 'i18n-cups.js', 'i18n-moderation.js'];

// site/js 에는 package.json 이 없어 node 가 ESM 으로 읽지 못할 수 있으므로 소스를 data: 모듈로 불러온다.
async function load(file) {
  const src = await readFile(join(JS, file), 'utf8');
  return (await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(src)}`)).default;
}
const exists = file => access(join(JS, file)).then(() => true, () => false);

const holes = s => [...new Set(String(s).match(/\{(\w+)\}/g) || [])].sort().join(' ');
const links = s => (String(s).match(/<a\s/g) || []).length;

// dict 가 기준(base)과 같은 키·자리표시자를 갖는지. 문제를 모두 모아 한 번에 보여 준다.
function compare(base, dict, label) {
  const problems = [];
  for (const k of Object.keys(base)) {
    if (!(k in dict)) { problems.push(`${label}: 빠진 키 ${k}`); continue; }
    const v = dict[k];
    if (typeof v !== 'string' || !v.trim()) problems.push(`${label}: 빈 문구 ${k}`);
    else if (holes(v) !== holes(base[k])) problems.push(`${label}: ${k} 자리표시자 {${holes(v)}} ≠ 기준 {${holes(base[k])}}`);
    else if (links(v) !== links(base[k])) problems.push(`${label}: ${k} 링크(<a>) 개수가 다름`);
  }
  for (const k of Object.keys(dict)) if (!(k in base)) problems.push(`${label}: 기준에 없는 키 ${k}`);
  return problems;
}

test('사이트 문구: 모든 언어가 i18n-ko.js 와 같은 키·자리표시자', async () => {
  const ko = await load('i18n-ko.js');
  const problems = [];
  for (const lang of LANGS.slice(1)) problems.push(...compare(ko, await load(`i18n-${lang}.js`), `i18n-${lang}.js`));
  assert.deepEqual(problems, []);
});

for (const file of FEATURES) {
  test(`기능별 문구 ${file}: 언어마다 ko 와 같은 키·자리표시자`, async t => {
    if (!await exists(file)) return t.skip(`${file} 없음`);
    const dicts = await load(file);
    assert.ok(dicts && typeof dicts === 'object' && dicts.ko, `${file} 은 { ko: {...}, ... } 를 내보내야 한다`);
    const problems = [];
    for (const lang of LANGS.slice(1)) {
      if (!dicts[lang]) { problems.push(`${file}: ${lang} 없음`); continue; }
      problems.push(...compare(dicts.ko, dicts[lang], `${file} ${lang}`));
    }
    for (const lang of Object.keys(dicts)) if (!LANGS.includes(lang)) problems.push(`${file}: 모르는 언어 ${lang}`);
    assert.deepEqual(problems, []);
  });
}

test('기능별 문구가 사이트 문구나 서로의 키를 덮어쓰지 않는다', async () => {
  const seen = new Map(Object.keys(await load('i18n-ko.js')).map(k => [k, 'i18n-ko.js']));
  const clashes = [];
  for (const file of FEATURES) {
    if (!await exists(file)) continue;
    for (const k of Object.keys((await load(file)).ko || {})) {
      if (seen.has(k)) clashes.push(`${file}: ${k} (이미 ${seen.get(k)} 에 있음)`);
      else seen.set(k, file);
    }
  }
  assert.deepEqual(clashes, []);
});
