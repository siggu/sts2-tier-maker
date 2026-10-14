// 사이트 문구 번역. 언어는 ?lang= → 저장한 선택 → 브라우저 언어 순으로 정한다.
// 게임 내용(카드 이름·효과 등)은 data/i18n/<언어>.json 에서 따로 불러온다 (data.js).

import ko from './i18n-ko.js';
import en from './i18n-en.js';
import ja from './i18n-ja.js';
import zhHans from './i18n-zh-Hans.js';
import zhHant from './i18n-zh-Hant.js';
import account from './i18n-account.js';
import playText from './i18n-play.js';

const DICTS = { ko, en, ja, 'zh-Hans': zhHans, 'zh-Hant': zhHant };
// 기능별 문구 파일({ ko: {...}, en: {...}, ... })을 합친다.
for (const extra of [account, playText]) {
  for (const [code, entries] of Object.entries(extra)) if (DICTS[code]) Object.assign(DICTS[code], entries);
}
export const LANGS = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'zh-Hant', name: '繁體中文' },
];
const KEY = 'sts2.lang';

function fromBrowser() {
  for (const raw of navigator.languages || [navigator.language || '']) {
    const l = String(raw).toLowerCase();
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('ja')) return 'ja';
    if (/^zh-(tw|hk|mo|hant)/.test(l)) return 'zh-Hant';
    if (l.startsWith('zh')) return 'zh-Hans';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

function detect() {
  const param = new URLSearchParams(location.search).get('lang');
  if (param && DICTS[param]) {
    try { localStorage.setItem(KEY, param); } catch { /* 저장소 없음 */ }
    return param;
  }
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICTS[saved]) return saved;
  } catch { /* 저장소 없음 */ }
  return fromBrowser();
}

export const lang = detect();
const dict = DICTS[lang];
document.documentElement.lang = lang;

// t('home.title') / t('n.items', { n: 3 }). 없는 키는 영어, 그것도 없으면 키 그대로.
export function t(key, vars) {
  let s = dict[key] ?? en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}

// 이 키가 이 언어(또는 영어)에 있는가
export const has = key => key in dict || key in en;

export function setLang(code) {
  if (!DICTS[code] || code === lang) return;
  try { localStorage.setItem(KEY, code); } catch { /* 저장소 없음 */ }
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.delete('lang');
    location.replace(url.toString());
  } else {
    location.reload();
  }
}

// 이름 정렬용
export const collator = new Intl.Collator(lang);

// index.html 의 고정 문구: data-i18n="키" (textContent), data-i18n-html="키" (innerHTML)
export function translateStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
}
