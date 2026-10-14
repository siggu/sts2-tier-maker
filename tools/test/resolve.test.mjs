import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFiles } from '../fetch-data.mjs';

test('파일 이름 정규화(밑줄→공백)를 따라 이미지 주소를 찾는다', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
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
  assert.equal(calls.length, 1);
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
