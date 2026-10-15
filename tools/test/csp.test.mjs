// 콘텐츠 보안 정책(site/index.html 의 CSP meta) 검사:
// 정책이 다른 자원보다 먼저 있고, 인라인 스크립트·eval 을 열지 않으며, 코드가 부르는 바깥 주소(API, 구글 로그인, 글꼴 css)가 들어 있는가.
// 브라우저에서 실제로 막히는 것이 없는지는 Playwright 로 따로 확인했다 (이 시험은 정책과 코드가 어긋나는 것만 잡는다).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const html = await readFile(join(SITE, 'index.html'), 'utf8');
const markup = html.replace(/<!--[\s\S]*?-->/g, '');

function policy() {
  const m = markup.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(m, 'index.html 에 CSP meta 가 없다');
  return Object.fromEntries(m[1].split(';').map(s => s.trim()).filter(Boolean).map(d => {
    const [name, ...sources] = d.split(/\s+/);
    return [name, sources];
  }));
}

// sources 가운데 하나가 url 을 허용하는가 (CSP 의 호스트·경로 맞추기를 이 사이트에 필요한 만큼만)
function allows(sources, url) {
  const u = new URL(url);
  return sources.some(src => {
    if (!/^https?:\/\//.test(src)) return false;
    const s = new URL(src.replace(':*', ''));
    if (s.protocol !== u.protocol || s.hostname !== u.hostname) return false;
    if (!src.endsWith(':*') && s.port !== u.port) return false;
    if (s.pathname === '/') return true; // 경로 없는 출처
    return s.pathname.endsWith('/') ? u.pathname.startsWith(s.pathname) : u.pathname === s.pathname;
  });
}

test('CSP meta 는 css·스크립트보다 먼저 온다', () => {
  const at = markup.indexOf('http-equiv="Content-Security-Policy"');
  assert.ok(at > 0);
  for (const tag of ['<link rel="stylesheet"', '<script']) {
    const first = markup.indexOf(tag);
    if (first >= 0) assert.ok(at < first, `${tag} 가 CSP meta 보다 앞에 있다`);
  }
});

test('script-src 는 인라인 스크립트·eval 을 열지 않는다', () => {
  const p = policy();
  assert.ok(p['script-src'], 'script-src 가 없다');
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", 'data:', 'blob:', '*', 'https:', 'http:']) {
    assert.ok(!p['script-src'].includes(bad), `script-src 에 ${bad}`);
  }
  assert.deepEqual(p['object-src'], ["'none'"]);
  assert.deepEqual(p['base-uri'], ["'self'"]);
  assert.ok(p['form-action'], 'form-action 이 없다');
});

test('index.html 에 인라인 스크립트·이벤트 속성이 없다 (CSP 가 막는다)', () => {
  for (const m of markup.matchAll(/<script\b([^>]*)>/g)) assert.match(m[1], /\ssrc=/, `인라인 스크립트: ${m[0]}`);
  assert.doesNotMatch(markup, /<[^>]+\son[a-z]+\s*=/i, '인라인 이벤트 속성(onclick= 등)');
  assert.doesNotMatch(markup, /javascript:/i);
});

test('코드가 부르는 바깥 주소가 정책에 들어 있다', async () => {
  const p = policy();
  const balance = await readFile(join(SITE, 'js', 'balance.js'), 'utf8');
  const api = balance.match(/override \|\| '(https:\/\/[^']+)'/)?.[1];
  assert.ok(api, 'balance.js 에서 기본 API 주소를 찾지 못했다');
  assert.ok(allows(p['connect-src'], `${api}/me`), `connect-src 에 API ${api}`);
  assert.ok(allows(p['img-src'], `${api}/img/${'0'.repeat(32)}`), `img-src 에 API ${api}`);
  // ?api= 로 로컬 API 를 쓰는 시험
  for (const local of ['http://localhost:8787/me', 'http://127.0.0.1:8799/me']) {
    assert.ok(allows(p['connect-src'], local), `connect-src 에 ${local}`);
    assert.ok(allows(p['img-src'], local), `img-src 에 ${local}`);
  }

  const auth = await readFile(join(SITE, 'js', 'auth.js'), 'utf8');
  const gis = auth.match(/GIS_SRC = '([^']+)'/)?.[1];
  assert.ok(gis, 'auth.js 에서 구글 로그인 스크립트 주소를 찾지 못했다');
  assert.ok(allows(p['script-src'], gis), `script-src 에 ${gis}`);
  assert.ok(allows(p['frame-src'], 'https://accounts.google.com/gsi/button?theme=x'), 'frame-src 에 구글 로그인 버튼');
  assert.ok(allows(p['connect-src'], 'https://accounts.google.com/gsi/log'), 'connect-src 에 구글 로그인');
  assert.ok(allows(p['style-src'], 'https://accounts.google.com/gsi/style'), 'style-src 에 구글 로그인 css');

  // index.html 이 부르는 바깥 css
  const sheets = [...markup.matchAll(/<link\s+rel="stylesheet"\s+href="(https:[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
  assert.ok(sheets.length > 0);
  for (const href of sheets) assert.ok(allows(p['style-src'], href), `style-src 에 ${href}`);
});
