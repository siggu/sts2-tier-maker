// 게임 공식 언어 파일(영어·한국어 틀)과 위키의 영어 문구를 맞대어 한국어 효과 문구를 만든다.
//
// 게임 언어 파일의 효과 문구는 숫자 대신 자리표시자를 쓴다.
//   영어 틀:  "Gain {Block:diff()} [gold]Block[/gold]."
//   한국어 틀: "[gold]방어도[/gold]를 {Block:diff()} 얻습니다."
// 위키 문구에는 실제 수치가 있다.
//   위키:     "Gain [5|8] $Block."   ([강화 전|강화 후])
// 영어 틀을 정규식으로 바꿔 위키 문구에서 변수 값(Block = 5 / 8)을 읽고, 그 값을 한국어 틀에 채운다.

const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// { ... } 자리표시자를 중첩까지 고려해 잘라 낸다. [{ start, end, body }]
function placeholders(tmpl) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < tmpl.length; i++) {
    if (tmpl[i] === '{') { if (depth++ === 0) start = i; }
    else if (tmpl[i] === '}' && depth > 0) {
      if (--depth === 0) out.push({ start, end: i + 1, body: tmpl.slice(start + 1, i) });
    }
  }
  return out;
}

// "Name:fmt:args" 를 나눈다. args 는 '|' 로 나뉘지만 중첩된 {} 안의 '|' 는 무시한다.
function parsePlaceholder(body) {
  const first = body.indexOf(':');
  if (first === -1) return { name: body, fmt: '', args: [] };
  const name = body.slice(0, first);
  const rest = body.slice(first + 1);
  const second = rest.indexOf(':');
  const fmt = second === -1 ? rest : rest.slice(0, second);
  const argStr = second === -1 ? '' : rest.slice(second + 1);
  const args = [];
  let depth = 0, cur = '';
  for (const ch of argStr) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === '|' && depth === 0) { args.push(cur); cur = ''; } else cur += ch;
  }
  if (second !== -1) args.push(cur);
  return { name, fmt, args };
}

// {IfUpgraded:show:A|B}, {InCombat:문구|} 처럼 조건에 따라 문구를 고르는 자리표시자
const isConditional = name => /^(If|In|Is|Has)[A-Z]/.test(name);
function parseConditional(body) {
  const i = body.indexOf(':');
  let rest = body.slice(i + 1);
  if (rest.startsWith('show:')) rest = rest.slice(5);
  const args = [];
  let depth = 0, cur = '';
  for (const ch of rest) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === '|' && depth === 0) { args.push(cur); cur = ''; } else cur += ch;
  }
  args.push(cur);
  return { name: body.slice(0, i), on: args[0] ?? '', off: args[1] ?? '' };
}

const stripTags = s => s.replace(/\[\/?[a-z_]+(?:=[^\]]*)?\]/g, '');

// 위키 문구 정리: $키워드 표시, <br>, 위키 틀 제거, 공백 하나로
// {{QueryLink|Cards|type:Attack|Attacks|2}} → Attacks, {{P|Potion-Shaped Rock||2}} → Potion-Shaped Rock
function wikiTemplate(_, body) {
  const [name, ...args] = body.split('|');
  if (name.trim() === '2' && args[0]) return args[0].trim();
  const shown = args.filter(a => a.trim() && !/^\d+$/.test(a.trim()) && !a.includes(':'));
  return (shown.length ? shown[shown.length - 1] : args[args.length - 1] || '').trim();
}

export function normalizeWiki(raw) {
  return String(raw || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{([^{}]*)\}\}/g, wikiTemplate)
    .replace(/\[\|(?:\+|s|es)\]/g, '')
    .replace(/\[(\d+)\|(\d+)\]\s*@([A-Z]{2})/g, (_, a, b, ic) => `[${`@${ic}`.repeat(+a)}|${`@${ic}`.repeat(+b)}]`)
    .replace(/(?<![\d|[])(\d+)\s*@([A-Z]{2})/g, (_, a, ic) => `@${ic}`.repeat(+a))
    .replace(/@([A-Z][a-z]+)/g, '$1')
    .replace(/\$(?=[A-Z])/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 값 토큰: [강화 전|강화 후] 묶음, 아이콘 연속, 숫자(+, %, X 포함)
const VALUE = String.raw`(\[[^\[\]]*\|[^\[\]]*\]|\d+\s?@[A-Z]{2}|(?:@[A-Z]{2}\s?)+|[+-]?\d+(?:\.\d+)?%?|X|Energy)`;

// 틀의 일반 글자: 공백은 유연하게, '%' 는 값 쪽에 붙어 있을 수 있어 생략 가능
const lit = text => escapeRe(text).replace(/ /g, '\\s*').replace(/%/g, '%?');

// 이름 같은 단어 값 ({EnchantmentName} → Goopy)
const WORD = String.raw`([A-Z][\w'’-]*(?:\s[A-Z][\w'’-]*)*)`;

function templateToRegex(tmpl) {
  const t = stripTags(tmpl).replace(/\s+/g, ' ').trim();
  const vars = [];
  const plain = [];
  let re = '';
  let last = 0;
  for (const ph of placeholders(t)) {
    re += lit(t.slice(last, ph.start));
    last = ph.end;
    const { name, fmt } = parsePlaceholder(ph.body);
    if (isConditional(name) || fmt === 'cond' || fmt === 'plural' || fmt === 'choose' || fmt.startsWith('choose(') || fmt === 'show') {
      // 문구 차이(강화 시 바뀌는 단어, 단·복수)는 값이 아니므로 아무 문자열이나 허용
      re += '(?:\\[[^\\[\\]]*\\|[^\\[\\]]*\\]|[^\\[\\]]*?)';
      continue;
    }
    vars.push(name);
    plain.push(fmt === '');
    // 서식 없는 자리표시자는 숫자 말고 이름(단어)일 수도 있다
    re += fmt === '' ? `(?:${VALUE}|${WORD})` : VALUE;
  }
  re += lit(t.slice(last));
  return { re: new RegExp(`^\\s*${re}\\s*$`, 'i'), vars, plain };
}

function readToken(tok) {
  const pair = tok.match(/^\[([^\[\]]*)\|([^\[\]]*)\]$/);
  const one = s => {
    const counted = s.trim().match(/^(\d+)\s*@([A-Z]{2})$/);
    if (counted) return { n: counted[1], icon: counted[2] };
    const icons = s.match(/@[A-Z]{2}/g);
    if (icons) return { n: icons.length, icon: icons[0].slice(1) };
    return { n: s.trim().replace(/%$/, '') };
  };
  if (pair) return { base: one(pair[1]), up: one(pair[2]) };
  const v = one(tok);
  return { base: v, up: v };
}

// 영어 틀과 위키 문구로 변수 값을 읽는다. 맞지 않으면 null.
export function alignValues(enTmpl, wikiRaw) {
  if (!enTmpl || !wikiRaw) return null;
  const { re, vars, plain } = templateToRegex(enTmpl);
  const m = normalizeWiki(wikiRaw).match(re);
  if (!m) return null;
  const values = {};
  const groups = m.slice(1);
  let gi = 0;
  vars.forEach((name, i) => {
    const tok = plain[i] ? (groups[gi] ?? groups[gi + 1]) : groups[gi];
    gi += plain[i] ? 2 : 1;
    const v = readToken(tok);
    if (values[name] && values[name].base.n !== v.base.n) return; // 같은 변수가 여러 번 나오면 첫 값
    values[name] ||= v;
  });
  return values;
}

// 한국어 틀에 값을 채워 HTML 로. upgraded 면 강화 후 값, highlight 면 강화로 바뀐 값을 강조.
// words: 영어 이름 → 한국어 이름 (단어 값을 옮길 때 쓴다)
export function renderKo(koTmpl, values, { upgraded = false, highlight = false, words = {} } = {}) {
  const icon = (n, kind) => {
    const ch = kind === 'ST' ? '★' : '⚡';
    const cls = kind === 'ST' ? 'star' : 'energy';
    return `<i class="ic ${cls}">${ch.repeat(Math.max(1, Number(n) || 1))}</i>`;
  };

  function render(tmpl) {
    let out = '';
    let last = 0;
    for (const ph of placeholders(tmpl)) {
      out += escapeHtml(tmpl.slice(last, ph.start));
      last = ph.end;
      const { name, fmt, args } = parsePlaceholder(ph.body);
      if (fmt === 'cond') { out += render(args[1] ?? ''); continue; } // 값이 정해지지 않은 상태(획득 전)의 문구
      if (isConditional(name)) {
        const c = parseConditional(ph.body);
        if (c.name !== 'IfUpgraded') { out += render(c.off); continue; } // 전투 중 계산값 등은 카드 설명에서 뺀다
        const chosen = upgraded ? c.on : c.off;
        out += highlight && upgraded && c.on !== c.off ? `<span class="up">${render(chosen)}</span>` : render(chosen);
        continue;
      }
      const v = values[name];
      if (fmt === 'plural') {
        const n = Number(v ? (upgraded ? v.up.n : v.base.n) : 1);
        out += render(n === 1 ? (args[0] ?? '') : (args[1] ?? args[0] ?? ''));
        continue;
      }
      if (fmt.startsWith('choose')) { out += render(args[0] ?? ''); continue; }
      if (!v) throw new Error(`값 없음: ${name}`);
      const cur = upgraded ? v.up : v.base;
      let text;
      if (fmt.startsWith('energyIcons') || fmt.startsWith('starIcons')) {
        const fixed = fmt.match(/\((\d+)\)/)?.[1];
        text = icon(fixed || cur.n, fmt.startsWith('star') ? 'ST' : 'IE');
      } else {
        const raw = String(cur.n);
        text = escapeHtml(words[raw.toLowerCase()] || raw);
      }
      const changed = v.base.n !== v.up.n;
      out += highlight && upgraded && changed ? `<span class="up">${text}</span>` : text;
    }
    out += escapeHtml(tmpl.slice(last));
    return out;
  }

  let html = render(koTmpl);
  // 게임 서식 태그: [gold]키워드[/gold] → 강조, 나머지 색 태그는 걷어 낸다
  html = html.replace(/\[gold\]([\s\S]*?)\[\/gold\]/g, '<b>$1</b>').replace(/\[\/?[a-z_]+(?:=[^\]]*)?\]/g, '');
  return html.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// 툴팁용: 강화 전 값 뒤에 (강화 후 값)을 붙인 한 줄
export function renderKoBoth(koTmpl, values, words = {}) {
  const base = renderKo(koTmpl, values, { upgraded: false, words });
  const up = renderKo(koTmpl, values, { upgraded: true, words });
  return base === up ? { text: base } : { text: base, textUp: renderKo(koTmpl, values, { upgraded: true, highlight: true, words }) };
}

// 위키 카드 문구에 섞인 키워드 줄을 떼어 낸다. 게임 틀에는 키워드 줄이 따로 없다.
//   "[|$Innate.<br>]..."  → 강화 후에만 Innate
//   "...<br>[$Exhaust.|]" → 강화 전에만 Exhaust
//   "...<br>$Exhaust."    → 항상 Exhaust
export const KEYWORDS = ['Innate', 'Ethereal', 'Retain', 'Sly', 'Unplayable', 'Eternal', 'Exhaust'];
const KW = KEYWORDS.join('|');
const KW_AFTER = new Set(['Exhaust', 'Eternal']);

export function splitKeywords(raw) {
  let s = String(raw || '');
  const found = new Map();
  const add = (kw, base, up) => {
    const k = kw[0].toUpperCase() + kw.slice(1).toLowerCase();
    const cur = found.get(k) || { base: false, up: false };
    found.set(k, { base: cur.base || base, up: cur.up || up });
  };
  const sep = String.raw`\s*(?:<br\s*\/?>)?\s*`;
  s = s.replace(new RegExp(String.raw`\[${sep}\|${sep}\$?(${KW})\.${sep}\]`, 'gi'), (_, kw) => { add(kw, false, true); return ' '; });
  s = s.replace(new RegExp(String.raw`\[${sep}\$?(${KW})\.${sep}\|${sep}\]`, 'gi'), (_, kw) => { add(kw, true, false); return ' '; });
  s = s.split(/<br\s*\/?>/i).filter(line => {
    const m = line.trim().match(new RegExp(String.raw`^\$?(${KW})\.$`, 'i'));
    if (m) { add(m[1], true, true); return false; }
    return true;
  }).join('<br>');
  const keywords = [...found].map(([kw, v]) => ({ kw, ...v, after: KW_AFTER.has(kw) }));
  return { text: s, keywords };
}

// 키워드를 한국어 이름으로 효과 앞뒤에 붙인다.
export function withKeywords(html, keywords, koNames, upgraded, highlight) {
  const pick = after => keywords
    .filter(k => k.after === after && (upgraded ? k.up : k.base))
    .map(k => {
      const label = `<b>${escapeHtml(koNames[k.kw] || k.kw)}</b>.`;
      return highlight && upgraded && !k.base ? `<span class="up">${label}</span>` : label;
    });
  return [...pick(false), html, ...pick(true)].filter(Boolean).join(' ');
}
