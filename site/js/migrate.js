// 예전 주소(siggu.github.io/sts2-tier-maker)에서 옮겨 올 때 그쪽 브라우저 저장소(localStorage)를 받아 넣는다.
// 예전 주소의 안내 페이지가 #migrate=<base64url JSON>&to=<원래 #주소> 로 보내 준다 (tools/redirect-page.html).
// 다른 모듈이 저장소를 읽기 전에 돌아야 하므로 app.js 가 맨 먼저 가져오고, 동기로만 돈다
// (await 를 쓰면 다른 모듈이 먼저 실행되어 언어 설정 등을 놓친다).
//
// 안전: 예전 주소에서 온 이동일 때만(referrer), sts2 로 시작하는 키만, 이 브라우저에 아직 없는 키만 넣는다.
// 로그인 세션은 옮기지 않는다 (남의 링크로 남의 계정에 로그인되는 일을 막는다 — 다시 로그인하면 서버에서 모두 받아 온다).

const OLD_ORIGIN = 'https://siggu.github.io';
const SKIP = new Set(['sts2.session.v1', 'sts2.acct.owner']);
const MAX_VALUE = 200 * 1024;

function unpack(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

const m = /^#migrate=([A-Za-z0-9_-]+)(?:&to=(.*))?$/.exec(location.hash);
if (m) {
  let to = '#/';
  try { to = decodeURIComponent(m[2] || '#/'); } catch { /* 그대로 첫 화면 */ }
  if (!to.startsWith('#')) to = '#/';
  history.replaceState(null, '', `${location.pathname}${location.search}${to}`);
  if (document.referrer === `${OLD_ORIGIN}/` || document.referrer.startsWith(`${OLD_ORIGIN}/sts2-tier-maker`)) {
    try {
      const data = unpack(m[1]);
      let n = 0;
      for (const [key, value] of Object.entries(data && typeof data === 'object' ? data : {})) {
        if (!/^sts2[A-Za-z0-9_.:-]*$/.test(key) || SKIP.has(key)) continue;
        if (typeof value !== 'string' || value.length > MAX_VALUE) continue;
        if (localStorage.getItem(key) !== null) continue;
        localStorage.setItem(key, value);
        n++;
      }
      if (n) sessionStorage.setItem('sts2.migrated', String(n));
    } catch (err) {
      console.warn('migrate', err);
    }
  }
}
