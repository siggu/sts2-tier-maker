import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFiles } from '../fetch-data.mjs';

test('파일 이름 정규화(밑줄→공백)를 따라 이미지 주소를 찾는다', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (new URL(String(url)).searchParams.get('list') === 'allimages') {
      return new Response(JSON.stringify({ query: { allimages: [] } }));
    }
    return new Response(JSON.stringify({
      query: {
        normalized: [{ from: 'File:StS2_Ironclad-Bash.png', to: 'File:StS2 Ironclad-Bash.png' }],
        pages: [
          { title: 'File:StS2 Ironclad-Bash.png', imageinfo: [{ url: 'https://cdn/x/Bash.png', sha1: 'abc' }] },
          { title: 'File:Missing.png', missing: true },
        ],
      },
    }));
  };
  const r = await resolveFiles(['StS2_Ironclad-Bash.png', 'Missing.png', 'StS2_Ironclad-Bash.png']);
  assert.deepEqual(r.get('StS2_Ironclad-Bash.png'), { url: 'https://cdn/x/Bash.png', sha1: 'abc' });
  assert.equal(r.has('Missing.png'), false);
  // 묶음 조회 1번 + 없는 파일을 찾기 위한 목록 조회 1번
  assert.equal(calls.length, 2);
});

test('429 면 기다렸다가 다시 시도한다', async () => {
  let n = 0;
  globalThis.fetch = async () => {
    n++;
    if (n === 1) return new Response('slow down', { status: 429, headers: { 'retry-after': '1' } });
    return new Response(JSON.stringify({ query: { pages: [{ title: 'File:A.png', imageinfo: [{ url: 'u', sha1: 's' }] }] } }));
  };
  const r = await resolveFiles(['A.png']);
  assert.equal(n, 2);
  assert.equal(r.get('A.png').url, 'u');
});

test('이름이 조금 다른 파일은 목록에서 느슨하게 찾아 쓴다', async () => {
  globalThis.fetch = async url => {
    const u = new URL(String(url));
    if (u.searchParams.get('list') === 'allimages') {
      assert.equal(u.searchParams.get('aiprefix'), 'StS2');
      return new Response(JSON.stringify({ query: { allimages: [
        { name: 'StS2_Silent-FlickFlack.png', url: 'https://cdn/FlickFlack.png', sha1: 'f1' },
        { name: 'StS2_Silent-CloakAndDagger.png', url: 'https://cdn/Cloak.png', sha1: 'c1' },
      ] } }));
    }
    return new Response(JSON.stringify({ query: { pages: [
      { title: 'File:StS2 Silent-Flick-Flack.png', missing: true },
      { title: 'File:StS2 Silent-CloakandDagger.png', missing: true },
    ] } }));
  };
  const r = await resolveFiles(['StS2_Silent-Flick-Flack.png', 'StS2_Silent-CloakandDagger.png', 'StS2_Nope.png']);
  assert.equal(r.get('StS2_Silent-Flick-Flack.png').url, 'https://cdn/FlickFlack.png');
  assert.equal(r.get('StS2_Silent-CloakandDagger.png').sha1, 'c1');
  assert.equal(r.has('StS2_Nope.png'), false);
});
