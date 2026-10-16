// 검색용 페이지(build-seo.mjs): 사이트를 임시 폴더에 복사해 만들어 보고, 주소·언어 연결·사이트맵·스크립트 없음을 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugOf, LANGS, ORIGIN } from '../build-seo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('템플릿 id → 주소 조각', () => {
  assert.equal(slugOf('cards.ironclad.type-attack'), 'cards/ironclad/type-attack');
  assert.equal(slugOf('relics.rarity-ancient.source-Neow'), 'relics/rarity-ancient/source-neow');
  assert.equal(slugOf('a.B c!.d'), 'a/b-c/d');
});

test('검색용 페이지 만들기', () => {
  const dir = mkdtempSync(join(tmpdir(), 'seo-'));
  try {
    const site = join(dir, 'site');
    cpSync(join(ROOT, 'site'), site, { recursive: true });
    const out = execFileSync(process.execPath, [join(ROOT, 'tools', 'build-seo.mjs'), site, 'testver']).toString();
    const n = Number(out.match(/(\d+)개/)[1]);

    const sitemap = readFileSync(join(site, 'sitemap.xml'), 'utf8');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    assert.equal(locs.length, n + 1, '사이트맵 = 페이지 수 + 첫 화면');
    assert.equal(new Set(locs).size, locs.length, '사이트맵 주소가 겹친다');
    assert.ok(locs.every(u => u.startsWith(`${ORIGIN}/`)));
    assert.equal((n - LANGS.length) % LANGS.length, 0, '언어마다 같은 수의 템플릿 페이지');
    assert.match(readFileSync(join(site, 'robots.txt'), 'utf8'), new RegExp(`Sitemap: ${ORIGIN}/sitemap.xml`));

    // 사이트맵의 모든 주소에 실제 파일이 있다
    for (const u of locs.slice(1)) assert.ok(existsSync(join(site, u.slice(ORIGIN.length + 1), 'index.html')), u);

    // 한 페이지: 제목·설명·대표 주소·5개 언어 연결·스크립트 없음·앱으로 가는 단추
    const ko = readFileSync(join(site, 'tier', 'cards', 'ironclad', 'type-attack', 'index.html'), 'utf8');
    assert.match(ko, /<html lang="ko">/);
    assert.match(ko, /<title>아이언클래드 공격 카드 티어 리스트 · 슬더스2 \| 첨탑의 티어 메이커<\/title>/);
    assert.match(ko, new RegExp(`<link rel="canonical" href="${ORIGIN}/tier/cards/ironclad/type-attack/">`));
    for (const L of LANGS) assert.match(ko, new RegExp(`hreflang="${L.hreflang}" href="${ORIGIN}/${L.prefix}tier/cards/ironclad/type-attack/"`));
    assert.match(ko, /hreflang="x-default"/);
    assert.match(ko, /href="\/\?lang=ko#\/tier\/cards\.ironclad\.type-attack"/);
    assert.match(ko, /\/css\/style\.css\?v=testver/);
    // 실행되는 스크립트가 없다 (구조화 데이터만)
    for (const m of ko.matchAll(/<script\b([^>]*)>/g)) assert.match(m[1], /type="application\/ld\+json"/);
    assert.match(ko, /script-src 'none'/);
    // 구조화 데이터가 JSON 으로 읽힌다
    const ld = JSON.parse(ko.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld['@graph'][1]['@type'], 'ItemList');

    const en = readFileSync(join(site, 'en', 'tier', 'cards', 'ironclad', 'type-attack', 'index.html'), 'utf8');
    assert.match(en, /<html lang="en">/);
    assert.match(en, /Ironclad Attack Cards Tier List/);

    // 언어별 목록 페이지
    assert.match(readFileSync(join(site, 'ja', 'tier', 'index.html'), 'utf8'), /<html lang="ja">/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
