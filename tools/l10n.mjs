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
  // {singleStarIcon} 은 별 아이콘 하나 ("Gain {Stars:diff()} {singleStarIcon}" → "Gain 9 ★")
  if (body === 'singleStarIcon') return { name: body, fmt: 'starIcons(1)', args: [] };
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

// 중국어·일본어 글자와 전각 문장 부호 (한글은 들어가지 않는다)
const CJK = '[\\u3000-\\u303f\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef]';

const stripTags = s => s.replace(/\[\/?[a-z_]+(?:=[^\]]*)?\]/g, '');

// 위키 문구 정리: $키워드 표시, <br>, 위키 틀 제거, 공백 하나로
// {{QueryLink|Cards|type:Attack|Attacks|2}} → Attacks, {{P|Potion-Shaped Rock||2}} → Potion-Shaped Rock
export function wikiTemplate(_, body) {
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
    // [X|X+1] → X[|+1] (게임 틀은 "X{IfUpgraded:show:+1}")
    .replace(/\[X\|X([^\[\]|]*)\]/g, 'X[|$1]')
    .replace(/\[(\d+)\|(\d+)\]\s*@([A-Z]{2})/g, (_, a, b, ic) => `[${`@${ic}`.repeat(+a)}|${`@${ic}`.repeat(+b)}]`)
    // "2 @CE" → "@CE@CE". "0 @CE" 는 그대로 둔다 (게임 틀이 "0 {energyPrefix:energyIcons(1)}" 처럼 숫자를 따로 적는다)
    .replace(/(?<![\d|[])([1-9]\d*)\s*@([A-Z]{2})/g, (_, a, ic) => `@${ic}`.repeat(+a))
    // "@CE@CE[|@CE]" → "[@CE@CE|@CE@CE@CE]"
    .replace(/((?:@[A-Z]{2}\s?)+)\[\|((?:@[A-Z]{2}\s?)+)\]/g, (_, a, b) => `[${a.replace(/\s/g, '')}|${(a + b).replace(/\s/g, '')}]`)
    .replace(/@([A-Z][a-z]+)/g, '$1')
    .replace(/\$(?=[A-Z])/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 값 토큰: [강화 전|강화 후] 묶음, 아이콘 연속, 숫자(+, %, X 포함)
const VALUE = String.raw`(\[[^\[\]]*\|[^\[\]]*\]|\d+\s?@[A-Z]{2}|(?:@[A-Z]{2}\s?)+|[+-]?\d+(?:\.\d+)?%?|X|Energy)`;
// 값이 아닌 문구 차이(강화 시 바뀌는 단어, 단·복수)는 아무 문자열이나 허용.
// 마지막 갈래는 "X[|+1]" 처럼 글자와 [전|후] 묶음이 섞인 경우 (앞 갈래가 모두 안 맞을 때만 쓰인다)
const PAIR = String.raw`\[[^\[\]]*\|[^\[\]]*\]`;
const ANY = String.raw`(?:${PAIR}|[^\[\]]*?|[^\[\]]*?${PAIR}[^\[\]]*?)`;

// 틀의 일반 글자: 공백은 유연하게, '%' 는 값 쪽에 붙어 있을 수 있어 생략 가능, 쉼표는 위키가 빼먹기도 한다
const lit = text => escapeRe(text).replace(/ /g, '\\s*').replace(/%/g, '%?').replace(/,/g, ',?');

// 이름 같은 단어 값 ({EnchantmentName} → Goopy)
const WORD = String.raw`([A-Z][\w'’-]*(?:\s[A-Z][\w'’-]*)*)`;

// 틀 조각 → 정규식 문자열. 캡처 그룹마다 ctx.caps 에 { name, kind, side, rank } 를 그룹 순서대로 쌓는다.
//   kind: 'value' 숫자·아이콘 값, 'word' 단어 값, 'one' 단수 문구가 맞았다는 표시(값 1)
//   side: 'both' | 'base'(위키 [전|후] 묶음의 앞쪽) | 'up'(뒤쪽)
//   rank: 0 일반 자리표시자, 1 단·복수 문구 안의 값, 2 단수 문구에서 짐작한 1
//         같은 변수는 rank 가 낮은 값을, rank 가 같으면 먼저 나온 값을 쓴다.
//   own:  단·복수 문구를 푸는 중인 변수 이름 (그 안의 {} · {:diff()} 가 이 변수)
function compile(t, ctx, side = 'both', own = null) {
  let re = '';
  let last = 0;
  const branchHasValue = (s, name) => /\{\}|\{:/.test(s) || s.includes(`{${name}:`) || s.includes(`{${name}}`);
  for (const ph of placeholders(t)) {
    let before = t.slice(last, ph.start);
    last = ph.end;
    const { name, fmt, args } = parsePlaceholder(ph.body);
    // 아이콘 앞의 고정 숫자("costs 0 {energyPrefix:energyIcons(1)}")는 위키가 숫자 없이 아이콘만 적기도 한다
    const fixedIcons = /^(energyIcons|starIcons)\(\d+\)/.test(fmt);
    const fixedNum = fixedIcons && before.match(/(\d+) ?$/);
    if (fixedNum) {
      re += lit(before.slice(0, fixedNum.index)) + `(?:${fixedNum[1]}\\s*)?`;
      before = '';
    }
    re += lit(before);
    if (isConditional(name)) {
      const c = parseConditional(ph.body);
      // {IfUpgraded:show:{Cards} copies|a copy} ↔ 위키 [a copy|2 copies]: 묶음 안에서 값을 읽는다
      if (c.name === 'IfUpgraded' && side === 'both' && /\{/.test(c.on + c.off)) {
        re += String.raw`\s*(?:\[\s*${compile(c.off, ctx, 'base', own)}\s*\|\s*${compile(c.on, ctx, 'up', own)}\s*\]|${ANY})\s*`;
      } else {
        re += String.raw`\s*${ANY}\s*`;
      }
      continue;
    }
    if ((fmt === 'plural' || fmt === 'cond') && name) {
      // {Combats:plural:combat|{} combats}, {Attacks:cond:>1?{Attacks:diff()} Attacks are|Attack is}
      // 복수 문구 안의 값을 읽고, 단수 문구가 맞으면 값을 1 로 본다.
      const [one, many] = fmt === 'plural'
        ? [args[0] ?? '', args[1] ?? args[0] ?? '']
        : [args[1] ?? '', (args[0] ?? '').replace(/^[<>=!]*\d+\?/, '')];
      const branch = (s, sd, single) => {
        if (branchHasValue(s, name)) return compile(s, ctx, sd, name);
        const body = compile(s, ctx, sd, own);
        if (!single) return body;
        ctx.caps.push({ name, kind: 'one', side: sd, rank: 2 });
        return `${body}()`;
      };
      const either = sd => `(?:${branch(many, sd, false)}|${branch(one, sd, true)})`;
      const pair = side === 'both' ? String.raw`\[\s*${either('base')}\s*\|\s*${either('up')}\s*\]|` : '';
      re += String.raw`\s*(?:${pair}${either(side)}|${ANY})\s*`;
      continue;
    }
    if (fmt === 'cond' || fmt === 'plural' || fmt === 'choose' || fmt.startsWith('choose(') || fmt === 'show') {
      re += String.raw`\s*${ANY}\s*`;
      continue;
    }
    const mine = own !== null && (name === '' || name === own);
    const vname = mine ? own : name;
    const rank = mine ? 1 : 0;
    ctx.caps.push({ name: vname, kind: 'value', side, rank });
    // 서식 없는 자리표시자는 숫자 말고 이름(단어)일 수도 있다
    if (fmt === '' && !mine) {
      ctx.caps.push({ name: vname, kind: 'word', side, rank });
      re += `(?:${VALUE}|${WORD})`;
    } else if (fixedIcons) {
      // 개수가 정해진 아이콘({energyPrefix:energyIcons(1)})은 값으로 쓰지 않는다. 위키가 "1 @CE" 를 앞 값과 합쳐 적으면 없을 수도 있다.
      re += `(?:${VALUE})?`;
    } else {
      re += VALUE;
    }
  }
  return re + lit(t.slice(last));
}

function templateToRegex(tmpl) {
  let t = stripTags(tmpl).replace(/\s+/g, ' ').trim();
  // 위키는 "Upon pickup," 머리말과 끝 마침표를 빼먹기도 한다
  const pickup = /^Upon pickup, ?/i.test(t);
  if (pickup) t = t.replace(/^Upon pickup, ?/i, '');
  t = t.replace(/\.$/, '');
  const ctx = { caps: [] };
  const body = compile(t, ctx);
  const head = pickup ? String.raw`(?:Upon pickup,?\s*)?` : '';
  return { re: new RegExp(String.raw`^\s*${head}${body}\.?\s*$`, 'i'), caps: ctx.caps };
}

function readToken(tok) {
  const pair = tok.match(/^\[([^\[\]]*)\|([^\[\]]*)\]$/);
  const one = s => {
    const counted = s.trim().match(/^(\d+)\s*@([A-Z]{2})$/);
    if (counted) return { n: counted[1], icon: counted[2] };
    const icons = s.match(/@[A-Z]{2}/g);
    if (icons) return { n: icons.length, icon: icons[0].slice(1) };
    // "[1 card|2 cards]" 처럼 수 뒤에 단·복수 낱말이 붙은 묶음은 수만 쓴다
    const counted2 = s.trim().match(/^([+-]?\d+(?:\.\d+)?)\s+[a-z]/i);
    if (counted2) return { n: counted2[1] };
    return { n: s.trim().replace(/%$/, '') };
  };
  if (pair) return { base: one(pair[1]), up: one(pair[2]) };
  const v = one(tok);
  return { base: v, up: v };
}

// 영어 틀과 위키 문구로 변수 값을 읽는다. 맞지 않으면 null.
export function alignValues(enTmpl, wikiRaw) {
  if (!enTmpl || !wikiRaw) return null;
  const { re, caps } = templateToRegex(enTmpl);
  const m = normalizeWiki(wikiRaw).match(re);
  if (!m) return null;
  const found = {};
  caps.forEach((c, i) => {
    const tok = m[i + 1];
    if (tok === undefined) return;
    const v = c.kind === 'one' ? { base: { n: '1' }, up: { n: '1' } } : readToken(tok);
    const f = found[c.name] ||= {};
    for (const s of ['base', 'up']) {
      if (c.side !== 'both' && c.side !== s) continue;
      if (!f[s] || f[s].rank > c.rank) f[s] = { rank: c.rank, v: v[s] };
    }
  });
  const values = {};
  for (const [name, f] of Object.entries(found)) values[name] = { base: (f.base || f.up).v, up: (f.up || f.base).v };
  return values;
}

// alignValues 가 맞지 않을 때(위키와 게임의 문장이 조금 다를 때)의 대안: 틀의 값 자리와 위키의 수치를 차례대로 짝짓는다.
// 틀에 적힌 고정 숫자([blue]1[/blue] 등)는 위키 쪽에서 하나씩 지운 뒤, 남은 수치 개수가 값 자리 수와 같을 때만 쓴다.
export function looseValues(enTmpl, wikiRaw) {
  if (!enTmpl || !wikiRaw) return null;
  const names = [];
  const walk = t => {
    for (const ph of placeholders(t)) {
      const { name, fmt, args } = parsePlaceholder(ph.body);
      if (isConditional(name)) { const c = parseConditional(ph.body); walk(c.off); continue; }
      if (fmt === 'plural' || fmt === 'cond' || fmt.startsWith('choose') || fmt === 'show') { if (name && !names.includes(name) && args.some(a => /\{\}|\{:/.test(a))) names.push(name); continue; }
      if (/^(energyIcons|starIcons)\(\d+\)/.test(fmt) || !name || /^Calculat/.test(name)) continue;
      if (!names.includes(name)) names.push(name);
    }
  };
  const t = stripTags(enTmpl);
  walk(t);
  const toks = (normalizeWiki(wikiRaw).match(new RegExp(VALUE.replace(/\|X\|Energy\)$/, ')'), 'g')) || []).map(s => s.trim());
  const literal = stripTags(enTmpl).replace(/\{[^{}]*\}/g, ' ').match(/\d+/g) || [];
  for (const n of literal) { const i = toks.indexOf(n); if (i >= 0) toks.splice(i, 1); }
  if (!names.length) return {}; // 값 자리가 없는 틀은 그대로 쓴다
  if (toks.length !== names.length) return null;
  return Object.fromEntries(names.map((name, i) => { const v = readToken(toks[i]); return [name, { base: v.base, up: v.up }]; }));
}

// 선택지에 따라 문구가 갈리는 틀을 한 가지로 고정한다. choices 에 없는 자리표시자는 그대로 둔다.
//   specialize('{CardType:choose(Attack|Skill):A|B|?}{Chaos:C|}', { CardType: 'Skill', Chaos: true }) → 'BC'
export function specialize(tmpl, choices) {
  let out = '';
  let last = 0;
  for (const ph of placeholders(tmpl)) {
    out += tmpl.slice(last, ph.start);
    last = ph.end;
    const colon = ph.body.indexOf(':');
    const name = colon === -1 ? ph.body : ph.body.slice(0, colon);
    if (colon === -1 || !Object.hasOwn(choices, name)) { out += tmpl.slice(ph.start, ph.end); continue; }
    const { fmt, args } = parsePlaceholder(ph.body);
    const opts = fmt.match(/^choose\((.*)\)$/)?.[1].split('|');
    let pick;
    if (opts) {
      const i = opts.indexOf(choices[name]);
      pick = args[i === -1 ? opts.length : i] ?? '';
    } else {
      const c = parseConditional(ph.body);
      pick = choices[name] ? c.on : c.off;
    }
    out += specialize(pick, choices);
  }
  return out + tmpl.slice(last);
}

const compare = (n, op, k) => ({ '>': n > k, '>=': n >= k, '<': n < k, '<=': n <= k, '!=': n !== k, '!': n !== k })[op] ?? n === k;

// 한국어 틀에 값을 채워 HTML 로. upgraded 면 강화 후 값, highlight 면 강화로 바뀐 값을 강조.
// words: 영어 이름 → 한국어 이름 (단어 값을 옮길 때 쓴다)
export function renderKo(koTmpl, values, { upgraded = false, highlight = false, words = {} } = {}) {
  const icon = (n, kind) => {
    const ch = kind === 'ST' ? '★' : '⚡';
    const cls = kind === 'ST' ? 'star' : 'energy';
    // 게임처럼 셋까지는 아이콘을 늘어놓고, 넷부터는 "4⚡" 처럼 숫자와 아이콘 하나
    const k = Math.max(1, Number(n) || 1);
    return k >= 4 ? `${k}<i class="ic ${cls}">${ch}</i>` : `<i class="ic ${cls}">${ch.repeat(k)}</i>`;
  };

  // own: 단·복수·선택 문구 안의 {} · {:diff()} 가 가리키는 변수 이름
  function render(tmpl, own = null) {
    let out = '';
    let last = 0;
    for (const ph of placeholders(tmpl)) {
      out += escapeHtml(tmpl.slice(last, ph.start));
      last = ph.end;
      const parsed = parsePlaceholder(ph.body);
      const { fmt, args } = parsed;
      const name = parsed.name === '' && own ? own : parsed.name;
      const v = values[name];
      const n = v ? Number(upgraded ? v.up.n : v.base.n) : NaN;
      if (fmt === 'cond') {
        // {Attacks:cond:>1?{Attacks:diff()} Attacks are|Attack is}. 값을 모르면(획득 전 등) 뒤 문구
        const m = (args[0] ?? '').match(/^([<>=!]*)(-?\d+(?:\.\d+)?)\?([\s\S]*)$/);
        out += render(m && !Number.isNaN(n) && compare(n, m[1], Number(m[2])) ? m[3] : args[1] ?? '', name);
        continue;
      }
      if (isConditional(name)) {
        const c = parseConditional(ph.body);
        if (c.name !== 'IfUpgraded') { out += render(c.off, own); continue; } // 전투 중 계산값 등은 카드 설명에서 뺀다
        const chosen = upgraded ? c.on : c.off;
        out += highlight && upgraded && c.on !== c.off ? `<span class="up">${render(chosen, own)}</span>` : render(chosen, own);
        continue;
      }
      if (fmt === 'plural') {
        const k = !v ? 1 : Number.isNaN(n) ? 2 : n; // X 같은 글자 값은 복수
        out += render(k === 1 ? (args[0] ?? '') : (args[1] ?? args[0] ?? ''), name);
        continue;
      }
      if (fmt.startsWith('choose')) {
        // {Turns:choose(1):턴|{}턴}: 값이 목록의 몇 번째인지로 고르고, 없으면 마지막(그 밖) 문구. 값을 모르면 첫 문구
        const opts = fmt.match(/^choose\((.*)\)$/)?.[1].split('|') || [];
        let pick = args[0] ?? '';
        if (v) {
          const i = opts.findIndex(o => o === String(upgraded ? v.up.n : v.base.n) || (o !== '' && Number(o) === n));
          pick = args[i === -1 ? opts.length : i] ?? args[args.length - 1] ?? '';
        }
        out += render(pick, name);
        continue;
      }
      // 개수가 정해진 아이콘은 값이 없어도 그린다
      const fixedIcons = fmt.match(/^(energy|star)Icons\((\d+)\)/);
      if (fixedIcons && (!v || name === 'singleStarIcon')) { out += icon(fixedIcons[2], fixedIcons[1] === 'star' ? 'ST' : 'IE'); continue; }
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
  // 줄바꿈은 한 줄로 잇는다. 중국어·일본어 글자 뒤의 줄바꿈은 띄어 쓰지 않는다.
  html = html.replace(new RegExp(`(${CJK})[ \\t]*\\n\\s*`, 'g'), '$1');
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
  s = s.replace(new RegExp(String.raw`\[${sep}\|${sep}\$?(${KW})\.?${sep}\]`, 'gi'), (_, kw) => { add(kw, false, true); return ' '; });
  s = s.replace(new RegExp(String.raw`\[${sep}\$?(${KW})\.?${sep}\|${sep}\]`, 'gi'), (_, kw) => { add(kw, true, false); return ' '; });
  s = s.split(/<br\s*\/?>/i).filter(line => {
    const m = line.trim().match(new RegExp(String.raw`^\$?(${KW})\.?$`, 'i'));
    if (m) { add(m[1], true, true); return false; }
    return true;
  }).join('<br>');
  const keywords = [...found].map(([kw, v]) => ({ kw, ...v, after: KW_AFTER.has(kw) }));
  return { text: s, keywords };
}

// 키워드를 그 언어 이름으로 효과 앞뒤에 붙인다.
// period: 게임의 문장 끝 기호(card_keywords PERIOD, 일본어·중국어는 '。'). '。' 뒤는 띄우지 않는다.
export function withKeywords(html, keywords, koNames, upgraded, highlight, period = '.') {
  const pick = after => keywords
    .filter(k => k.after === after && (upgraded ? k.up : k.base))
    .map(k => {
      const label = `<b>${escapeHtml(koNames[k.kw] || k.kw)}</b>${escapeHtml(period)}`;
      return highlight && upgraded && !k.base ? `<span class="up">${label}</span>` : label;
    });
  return [...pick(false), html, ...pick(true)].filter(Boolean).join(period === '.' ? ' ' : '');
}
