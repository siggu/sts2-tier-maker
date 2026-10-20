// 위키 Cargo 표의 설명(틀이 펼쳐진 위키 문법)을 예전 데이터 모듈 문법으로 바꾼다.
// 2026-10-17 위키가 카드 데이터 모듈(Module:Cards/StS2 data/…)을 지우고 Cargo 표(Cards, CardArt)로 옮겼다.
// 나머지 처리(formatText, 번역 수치 읽기, 용어 팝업)는 예전 문법을 읽으므로 여기서 맞춰 준다.
//
//   <span class="keyword-trigger" data-name="Exhaust">[[…|<span>Exhaust</span>]]</span>  → $Exhaust
//   <span class="power-trigger" data-name="Vulnerable">[[File:…]] [[…|Vulnerable]]</span> → $Vulnerable
//   <span class="card-trigger" data-name="Shiv">[[File:…]] [[…|Shivs]]</span>              → {{C2|Shiv|Shivs}}
//   <span class="keyword-trigger" data-name="@IE">[[File:…]]</span>                       → @IE
//   (8;10) → [8|10],  (;Innate.) → [|Innate.]
//   [[Slay the Spire 2:Hand|Hand]] → Hand

const TRIGGER_KIND = { 'card-trigger': 'C2', 'relic-trigger': 'R2', 'potion-trigger': 'P' };

const decode = s => s
  .replace(/&nbsp;/g, ' ')
  .replace(/&#0?39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&');

// [[File:…]] 은 지우고 [[링크|글자]] → 글자, [[링크]] → 링크, 남은 태그는 걷어 낸다 (<br> 는 둔다)
function plain(s) {
  return s
    .replace(/\[\[File:[^\]]*\]\]/gi, '')
    .replace(/\[https?:\/\/\S+ ([^\]]+)\]/g, '$1') // [https://… Rare] → Rare
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, (_, link) => link.replace(/^Slay[ _]the[ _]Spire[ _]2:/, '').replace(/_/g, ' '))
    .replace(/<(?!br\b)\/?[a-z][^>]*>/gi, '');
}

function attr(attrs, name) {
  return attrs.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`))?.[2] ?? '';
}

function trigger(attrs, inner) {
  const cls = attr(attrs, 'class').split(/\s+/).find(c => c.endsWith('-trigger')) || '';
  const name = decode(attr(attrs, 'data-name')).trim();
  if (name.startsWith('@')) return name; // 에너지·별 아이콘
  const shown = decode(plain(inner)).replace(/\s+/g, ' ').trim() || name;
  const kind = TRIGGER_KIND[cls];
  if (kind) return `{{${kind}|${name}|${shown}}}`;
  // 키워드·버프/디버프: 한 낱말이면 예전처럼 $낱말, 아니면 틀로
  return /^[A-Za-z][A-Za-z']*$/.test(shown) ? `$${shown}` : `{{KW|${name}|${shown}}}`;
}

// 바깥 …-trigger span 을 안쪽 span 까지 짝 맞춰 찾아 바꾼다. 바꾼 조각은 토큰으로 감춰 두었다가 마지막에 돌려놓는다.
function replaceTriggers(s, tokens) {
  let out = '';
  let i = 0;
  const open = /<span\b([^>]*)>/g;
  for (;;) {
    open.lastIndex = i;
    let m;
    while ((m = open.exec(s)) && !/-trigger\b/.test(attr(m[1], 'class')));
    if (!m) return out + s.slice(i);
    out += s.slice(i, m.index);
    const tag = /<span\b[^>]*>|<\/span>/g;
    tag.lastIndex = m.index + m[0].length;
    let depth = 1, innerEnd = s.length, end = s.length, t;
    while ((t = tag.exec(s))) {
      if (t[0] !== '</span>') { depth++; continue; }
      if (--depth === 0) { innerEnd = t.index; end = t.index + t[0].length; break; }
    }
    tokens.push(trigger(m[1], s.slice(m.index + m[0].length, innerEnd)));
    out += `${tokens.length - 1}`;
    i = end;
  }
}

export function cargoText(desc) {
  const tokens = [];
  let s = replaceTriggers(String(desc || ''), tokens);
  // (강화 전;강화 후) → [강화 전|강화 후]. 안의 아이콘·키워드는 아직 토큰이라 괄호·쌍반점이 섞이지 않는다.
  s = s.replace(/\(([^();]*);([^();]*)\)/g, '[$1|$2]');
  s = decode(plain(s));
  s = s.replace(/(\d+)/g, (_, n) => tokens[+n]);
  // 예전 표기로: @SE[|@SE] → [@SE|@SE@SE], X[|+1] → [X|X+1]
  s = s.replace(/((?:@[A-Z]{2})+)\[\|((?:@[A-Z]{2})+)\]/g, (_, a, b) => `[${a}|${a}${b}]`);
  s = s.replace(/\bX\[\|\+(\d+)\]/g, '[X|X+$1]');
  return s.replace(/[ \t]+/g, ' ').replace(/ ?<br\s*\/?> ?/gi, '<br>').trim();
}

const num = v => (v === undefined || v === null || v === '' ? undefined : Number(v));

// Cargo Cards·CardArt 행 → 예전 데이터 모듈의 카드 모양 { Cost, CostPlus, StarCost, Color, Type, Rarity, Image, Text, … }
// 그림은 CardArt 의 전체 카드 그림(강화 전·후, public-beta 그림)을 쓴다.
export function cardsFromCargo(rows, art = []) {
  const artBy = new Map(art.map(a => [a.Name, a]));
  const out = {};
  for (const r of rows) {
    if (!r.Name || out[r.Name]) continue;
    const a = artBy.get(r.Name) || {};
    out[r.Name] = {
      Cost: num(r.Cost),
      CostPlus: num(r.CostPlus),
      StarCost: num(r.StarCost),
      Color: r.Color,
      Type: r.Type,
      Rarity: r.Rarity,
      Image: a.FullCard || r.Image || undefined,
      ImagePlus: a.FullCardPlus || undefined,
      ImageBeta: a.FullCardBeta || undefined,
      ImageBetaPlus: a.FullCardBetaPlus || undefined,
      NoUpgrade: r.NoUpgrade === '1' || r.NoUpgrade === 1 || undefined,
      Multiplayer: r.MultiplayerOnly === '1' || r.MultiplayerOnly === 1 ? 'Yes' : undefined,
      Text: cargoText(r.Description),
    };
  }
  return out;
}
