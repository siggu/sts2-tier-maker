// Slay the Spire Wiki(slaythespire.wiki.gg)의 StS2 데이터 모듈을 읽어
// site/data/sts2.json, site/data/keys.json 과 이미지(site/data/img/...)를 만든다.
//
// 사용: node tools/fetch-data.mjs            (전체, 이미 받은 이미지는 sha1 이 같으면 건너뜀)
//       node tools/fetch-data.mjs --no-images (데이터만)
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parseLuaData } from './lua.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'site', 'data');
const WIKI = 'https://slaythespire.wiki.gg';
const UA = 'sts2-tier-maker/1.0 (https://github.com/siggu/sts2-tier-maker)';
const WITH_IMAGES = !process.argv.includes('--no-images');

const CHARACTERS = [
  { id: 'ironclad', en: 'Ironclad', name: '아이언클래드', color: '#c8463c' },
  { id: 'silent', en: 'Silent', name: '사일런트', color: '#4f9a52' },
  { id: 'regent', en: 'Regent', name: '리젠트', color: '#d08a2e' },
  { id: 'necrobinder', en: 'Necrobinder', name: '네크로바인더', color: '#b05aa8' },
  { id: 'defect', en: 'Defect', name: '디펙트', color: '#4a86c8' },
];
const SHARED_GROUP = { id: 'shared', name: '공용', color: '#9a9a9a' };
const charByEn = new Map(CHARACTERS.map(c => [c.en, c]));

// ---------------------------------------------------------------- 가져오기

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 위키(wiki.gg)는 요청이 몰리면 429 를 준다. Retry-After 를 지키고 점점 길게 기다렸다가 다시 시도한다.
async function get(url, { binary = false, tries = 7 } = {}) {
  for (let i = 0; ; i++) {
    let wait = Math.min(60_000, 2_000 * 2 ** i);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      const retryAfter = Number(res.headers.get('retry-after'));
      if (retryAfter > 0) wait = Math.min(120_000, retryAfter * 1000);
      const err = new Error(`${res.status} ${url}`);
      if (res.status !== 429 && res.status < 500) { err.fatal = true; }
      throw err;
    } catch (err) {
      if (err.fatal || i + 1 >= tries) throw err;
      await sleep(wait + Math.random() * 1000);
    }
  }
}

async function module(title) {
  // 로컬 테스트: WIKI_RAW_DIR 에 discover 결과(modules/*.lua)가 있으면 그걸 읽는다.
  const src = process.env.WIKI_RAW_DIR
    ? await readFile(join(process.env.WIKI_RAW_DIR, title.replace(/[^\w.-]+/g, '_') + '.lua'), 'utf8')
    : await get(`${WIKI}/index.php?title=${encodeURIComponent(title)}&action=raw`);
  return parseLuaData(src);
}

export function slug(name) {
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------- 텍스트

const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 위키 표기 → 툴팁용 HTML
//   [6|9]      → 6 + 강화 수치 강조
//   $Block     → 키워드 강조
//   @IE @CE …  → 에너지/별 아이콘 글자
//   <br>       → 줄바꿈
export function formatText(raw) {
  if (!raw) return '';
  let s = String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{[^{}]*\|([^{}|]*)\}\}/g, '$1')
    .replace(/\{\{([^{}|]*)\}\}/g, '$1')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '');
  s = escapeHtml(s);
  s = s.replace(/\[([^\[\]|]*)\|([^\[\]|]*)\]/g, (_, a, b) => `${a}<span class="up">(${b})</span>`);
  s = s.replace(/\$([A-Z][A-Za-z']*(?:\s(?:of|the)\s[A-Z][A-Za-z']*)?)/g, '<b>$1</b>');
  s = s.replace(/@([A-Z]{2})/g, (_, code) => {
    if (code === 'ST') return '<i class="ic star">★</i>';
    if (code.endsWith('E')) return '<i class="ic energy">⚡</i>';
    return '';
  });
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------------------------------------------------------- 이미지

const imageJobs = [];

// 위키 파일을 받아 webp 로 줄여 저장할 작업을 등록하고, 사이트에서 쓸 경로를 돌려준다.
function image(file, category, id, { height, width, trim = false } = {}) {
  if (!file) return null;
  const rel = `data/img/${category}/${id}.webp`;
  imageJobs.push({ file, out: join(ROOT, 'site', rel), height, width, trim });
  return rel;
}

// 위키 API 로 파일 50개씩 묶어 실제 이미지 주소(CDN)와 sha1 을 받는다.
// 이미지마다 위키에 요청하면 429 로 막히므로, 위키 요청은 이 묶음 조회만 한다.
export async function resolveFiles(files) {
  const out = new Map();
  const list = [...new Set(files)];
  for (let i = 0; i < list.length; i += 50) {
    const chunk = list.slice(i, i + 50);
    const qs = new URLSearchParams({
      action: 'query', format: 'json', formatversion: '2',
      prop: 'imageinfo', iiprop: 'url|sha1',
      titles: chunk.map(f => `File:${f}`).join('|'),
    });
    const r = JSON.parse(await get(`${WIKI}/api.php?${qs}`));
    const norm = new Map((r.query.normalized || []).map(n => [n.from, n.to]));
    const pages = new Map((r.query.pages || []).map(p => [p.title, p]));
    for (const f of chunk) {
      const title = norm.get(`File:${f}`) || `File:${f}`;
      const info = pages.get(title)?.imageinfo?.[0];
      if (info?.url) out.set(f, { url: info.url, sha1: info.sha1 });
    }
    await sleep(500);
  }
  return out;
}

const MANIFEST = join(DATA, 'img', 'manifest.json');

async function runImageJobs() {
  let manifest = {};
  try { manifest = JSON.parse(await readFile(MANIFEST, 'utf8')); } catch { /* 처음 */ }

  const resolved = await resolveFiles(imageJobs.map(j => j.file));
  let done = 0, failed = 0, skipped = 0;
  const total = imageJobs.length;
  const progress = setInterval(() => console.log(`이미지 진행: ${done + failed + skipped}/${total}`), 15_000);
  const queue = imageJobs.slice();

  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const rel = job.out.slice(join(ROOT, 'site').length + 1);
      const info = resolved.get(job.file);
      try {
        if (!info) throw new Error('위키에 파일 없음');
        // 원본(sha1)과 변환 설정이 그대로이고 파일이 있으면 다시 받지 않는다.
        const sig = `${info.sha1}:${job.width || ''}x${job.height || ''}:${job.trim ? 't' : ''}`;
        if (manifest[rel] === sig && await access(job.out).then(() => true, () => false)) { skipped++; continue; }
        const buf = await get(info.url, { binary: true });
        await sleep(150);
        let img = sharp(buf);
        if (job.trim) img = img.trim();
        img = img.resize({ width: job.width, height: job.height, fit: 'inside', withoutEnlargement: true });
        await mkdir(dirname(job.out), { recursive: true });
        await img.webp({ quality: 82, effort: 5 }).toFile(job.out);
        manifest[rel] = sig;
        done++;
      } catch (err) {
        // 받지 못했어도 예전에 받아 둔 파일이 있으면 그걸 쓴다.
        if (await access(job.out).then(() => true, () => false)) { skipped++; console.warn(`! 이미지 갱신 실패(기존 파일 유지) ${job.file}: ${err.message}`); continue; }
        failed++;
        job.failed = true;
        console.warn(`! 이미지 실패 ${job.file}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker));
  clearInterval(progress);

  await mkdir(dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1));
  console.log(`이미지: ${done}개 저장, ${skipped}개 유지, ${failed}개 실패`);
  return { done, skipped, failed, total };
}

// ---------------------------------------------------------------- 카테고리

const CARD_RARITIES = ['Common', 'Uncommon', 'Rare', 'Ancient', 'Event'];

async function cards() {
  const items = [];
  for (const group of [...CHARACTERS.map(c => c.en), 'Colorless']) {
    const data = await module(`Module:Cards/StS2 data/${group}`);
    for (const [name, c] of Object.entries(data)) {
      if (!CARD_RARITIES.includes(c.Rarity)) continue;
      if (c.Multiplayer && String(c.Multiplayer).toLowerCase() !== 'no') continue;
      const ch = charByEn.get(c.Color);
      const id = slug(name);
      items.push({
        id,
        name: name.replace(/\s*\((Ironclad|Silent|Regent|Necrobinder|Defect)\)$/, ''),
        group: ch ? ch.id : SHARED_GROUP.id,
        rarity: c.Rarity.toLowerCase(),
        type: String(c.Type || '').toLowerCase() || undefined,
        cost: c.Cost ?? undefined,
        text: formatText(c.Text),
        img: image(c.Image, 'cards', id, { height: 300 }),
      });
    }
  }
  return {
    id: 'cards', name: '카드', tile: 'card', groupLabel: '캐릭터',
    // 희귀도는 섞여 있어 의미가 덜하므로 캐릭터 × 종류(공격·스킬·파워)로 나눈다.
    split: { by: ['type'], groupFirst: true },
    groups: [...CHARACTERS.map(({ id, name, color }) => ({ id, name, color })), { ...SHARED_GROUP, name: '무색' }],
    items,
  };
}

async function curses() {
  const data = await module('Module:Cards/StS2 data/Colorless');
  const items = Object.entries(data)
    .filter(([, c]) => c.Rarity === 'Curse' && !c.Multiplayer)
    .map(([name, c]) => {
      const id = slug(name);
      return { id, name, cost: c.Cost ?? undefined, text: formatText(c.Text), img: image(c.Image, 'curses', id, { height: 300 }) };
    });
  return { id: 'curses', name: '저주', tile: 'card', items };
}

const RELIC_RARITIES = ['Starter', 'Common', 'Uncommon', 'Rare', 'Shop', 'Event', 'Ancient'];

async function relics() {
  const data = await module('Module:Relics/StS2 data');
  const items = [];
  for (const [name, r] of Object.entries(data)) {
    if (!RELIC_RARITIES.includes(r.Rarity)) continue;
    const ch = charByEn.get(r.Character);
    const id = slug(name);
    items.push({
      id, name,
      group: ch ? ch.id : SHARED_GROUP.id,
      rarity: r.Rarity.toLowerCase(),
      source: r.AncientSource ? String(r.AncientSource).replace(/\{\{[^|}]*\|([^}]*)\}\}/g, '$1').replace(/[\[\]]/g, '').trim() : undefined,
      text: formatText(r.Description),
      img: image(r.Image, 'relics', id, { height: 128, width: 128 }),
    });
  }
  return {
    id: 'relics', name: '유물', tile: 'icon', groupLabel: '캐릭터',
    // 희귀도별로 나누고, 고대 유물처럼 너무 많은 묶음은 그 유물을 주는 고대의 존재별로 다시 나눈다.
    split: { by: ['rarity'], overflow: 'source', sharedGroup: SHARED_GROUP.id },
    groups: [...CHARACTERS.map(({ id, name, color }) => ({ id, name, color })), SHARED_GROUP],
    items,
  };
}

async function potions() {
  const data = await module('Module:Potions/StS2 data');
  const items = [];
  for (const [name, p] of Object.entries(data)) {
    if (!['Common', 'Uncommon', 'Rare'].includes(p.Rarity)) continue;
    const ch = charByEn.get(p.Character);
    const id = slug(name);
    items.push({
      id, name,
      group: ch ? ch.id : SHARED_GROUP.id,
      rarity: p.Rarity.toLowerCase(),
      text: formatText(p.Text),
      img: image(p.Image, 'potions', id, { height: 128, width: 128 }),
    });
  }
  return {
    id: 'potions', name: '포션', tile: 'icon', groupLabel: '캐릭터',
    split: { by: ['rarity'], sharedGroup: SHARED_GROUP.id },
    groups: [...CHARACTERS.map(({ id, name, color }) => ({ id, name, color })), SHARED_GROUP],
    items,
  };
}

// 1막은 Overgrowth 와 Underdocks 중 하나가 무작위로 나온다.
const AREAS = [
  { en: 'Overgrowth', id: 'overgrowth', name: '1막 · Overgrowth', color: '#6f9a4a' },
  { en: 'Underdocks', id: 'underdocks', name: '1막 · Underdocks', color: '#4a7f9a' },
  { en: 'Hive', id: 'hive', name: '2막 · Hive', color: '#c99a3a' },
  { en: 'Glory', id: 'glory', name: '3막 · Glory', color: '#a06ad0' },
];
const areaByEn = new Map(AREAS.map(a => [a.en, a]));

// 같은 전투에 함께 나오는 적(예: The Kin = Kin Follower + Kin Priest)은 하나로 묶는다.
function encounters(data, type) {
  const byEncounter = new Map();
  for (const [name, e] of Object.entries(data)) {
    if (e.Type !== type) continue;
    const encounter = (e.Link ? e.Link.split('#')[0] : name).replace(/_/g, ' ');
    if (!byEncounter.has(encounter)) byEncounter.set(encounter, []);
    byEncounter.get(encounter).push({ name, ...e });
  }
  return [...byEncounter].map(([name, members]) => {
    const first = members.find(m => m.Image) || members[0];
    const debut = String(first.Debut || '').match(/\|([^}]+)\}\}/)?.[1];
    const hp = members.map(m => m.BaseHP).filter(Boolean).join(' / ');
    return { name, members, first, debut, hp };
  });
}

function enemyItems(data, type, folder, fallbackArea) {
  return encounters(data, type).map(e => {
    const id = slug(e.name);
    const area = areaByEn.get(e.debut) || fallbackArea;
    return {
      id, name: e.name,
      group: area?.id,
      text: escapeHtml([
        area?.name,
        e.hp && `HP ${e.hp}`,
        e.members.length > 1 && e.members.map(m => m.name).join(', '),
      ].filter(Boolean).join('\n')),
      img: image(e.first.Image, folder, id, { height: 220, width: 260, trim: true }),
    };
  });
}

const areaGroups = items => AREAS.filter(a => items.some(i => i.group === a.id)).map(({ id, name, color }) => ({ id, name, color }));

async function bossCategory() {
  const items = enemyItems(await module('Module:Enemies/StS2 data/Bosses'), 'Boss', 'bosses');
  return { id: 'bosses', name: '보스', tile: 'creature', groupLabel: '막', enemy: true, groups: areaGroups(items), items };
}

async function eliteCategory() {
  const items = enemyItems(await module('Module:Enemies/StS2 data/Elites'), 'Elite', 'elites');
  return { id: 'elites', name: '엘리트', tile: 'creature', groupLabel: '막', enemy: true, groups: areaGroups(items), items };
}

async function monsterCategory() {
  const items = [];
  for (const area of AREAS) {
    items.push(...enemyItems(await module(`Module:Enemies/StS2 data/${area.en}`), 'Normal', 'monsters', area));
  }
  return { id: 'monsters', name: '일반 적', tile: 'creature', groupLabel: '막', enemy: true, groups: areaGroups(items), items };
}

async function enchantmentCategory() {
  const data = await module('Module:Keywords/StS2 data/Enchantments');
  const items = Object.entries(data).map(([name, e]) => {
    const id = slug(name);
    return { id, name, text: formatText(e.Text), img: image(e.Image, 'enchantments', id, { height: 128, width: 128 }) };
  });
  return { id: 'enchantments', name: '인챈트', tile: 'icon', items };
}

const formatPlain = raw => String(raw || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\{\{[^{}]*\|([^{}|]*)\}\}/g, '$1').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim();

const ANCIENTS = ['Neow', 'Orobas', 'Darv', 'Tezcatara', 'Tanx', 'Pael', 'Nonupeipe', 'Vakuu'];
const ANCIENT_ACTS = [
  { id: 'act1', name: '1막', color: '#6f9a4a' },
  { id: 'act2', name: '2막', color: '#c99a3a' },
  { id: 'act3', name: '3막', color: '#a06ad0' },
];

// 위키 문서의 '== Act 2 ==' 같은 구역 아래 나오는 이름으로 각 고대의 존재가 몇 막에 나오는지 알아낸다.
// 'Act 2/3' 처럼 적힌 경우(Darv)는 두 막 모두에 넣는다.
async function ancientActs() {
  const acts = new Map();
  let src = '';
  try {
    src = process.env.WIKI_RAW_DIR
      ? await readFile(join(process.env.WIKI_RAW_DIR, '..', 'pages', 'Slay_the_Spire_2_Ancients.wiki'), 'utf8')
      : await get(`${WIKI}/index.php?title=${encodeURIComponent('Slay the Spire 2:Ancients')}&action=raw`);
  } catch { return acts; }
  let current = [];
  for (const line of src.split('\n')) {
    const head = line.match(/^==\s*(.+?)\s*==\s*$/);
    if (head) {
      const n = head[1].match(/Act\s*(\d)/);
      current = n ? [Number(n[1])] : [];
      continue;
    }
    const multi = line.match(/Act\s*(\d)\s*\/\s*(\d)/);
    const name = line.match(/elite-name">\{\{2\|([^}|]+)\}\}/)?.[1];
    if (name) acts.set(name, current.slice());
    if (multi) {
      const last = [...acts.keys()].pop();
      if (last) acts.set(last, [Number(multi[1]), Number(multi[2])]);
    }
    if (/^==\s*Effective/.test(line)) break;
  }
  return acts;
}

async function charactersAndAncients() {
  const data = await module('Module:Keywords/StS2 data/Characters');
  // 캐릭터는 전신 원화, 고대의 존재는 지도 아이콘을 쓴다.
  const chars = CHARACTERS.map(c => ({
    id: c.id, name: c.name, nameEn: c.en,
    img: image(`StS2_${c.en}.png`, 'characters', c.id, { height: 240, width: 200, trim: true }),
  }));
  const acts = await ancientActs();
  const ancients = Object.keys(data)
    .filter(name => ANCIENTS.includes(name))
    .map(name => {
      const a = (acts.get(name) || []).map(n => ANCIENT_ACTS[n - 1]).filter(Boolean);
      return {
        id: slug(name), name,
        group: a[0]?.id,
        groups: a.length > 1 ? a.map(x => x.id) : undefined,
        text: a.length ? escapeHtml(`등장: ${a.map(x => x.name).join(', ')}`) : undefined,
        img: image(`StS2_Map-${name}.png`, 'ancients', slug(name), { height: 160, width: 160 }),
      };
    });
  return [
    { id: 'characters', name: '캐릭터', tile: 'portrait', items: chars },
    { id: 'ancients', name: '고대의 존재', tile: 'icon', groupLabel: '막', groups: ANCIENT_ACTS, items: ancients },
  ];
}

// ---------------------------------------------------------------- 실행

async function main() {
  const [characters, ancients] = await charactersAndAncients();
  const categories = [
    characters,
    await cards(),
    await curses(),
    await relics(),
    await potions(),
    await enchantmentCategory(),
    ancients,
    await monsterCategory(),
    await eliteCategory(),
    await bossCategory(),
  ];

  let imageStats = null;
  if (WITH_IMAGES) imageStats = await runImageJobs();
  else for (const job of imageJobs) job.failed = !(await access(job.out).then(() => true, () => false));

  // 받지 못한 이미지는 경로를 지워서 이름 타일로 보이게 한다.
  const failed = new Set(imageJobs.filter(j => j.failed).map(j => j.out));
  for (const cat of categories) {
    for (const item of cat.items) {
      for (const key of ['img', 'icon']) {
        if (item[key] && failed.has(join(ROOT, 'site', item[key]))) delete item[key];
        if (item[key] === null || item[key] === undefined) delete item[key];
      }
      for (const key of Object.keys(item)) {
        if (item[key] === undefined) delete item[key];
      }
    }
    cat.items.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }

  let previous = null;
  try { previous = JSON.parse(await readFile(join(DATA, 'sts2.json'), 'utf8')); } catch { /* 처음 */ }

  const out = {
    source: `${WIKI}/`,
    fetchedAt: new Date().toISOString(),
    categories,
  };

  // 내용이 그대로면 수집 시각도 그대로 둬서 불필요한 커밋을 막는다.
  const same = previous && JSON.stringify(previous.categories) === JSON.stringify(categories);
  if (same) out.fetchedAt = previous.fetchedAt;

  await mkdir(DATA, { recursive: true });
  await writeFile(join(DATA, 'sts2.json'), JSON.stringify(out));
  const keys = categories.flatMap(c => c.items.map(i => `${c.id}/${i.id}`)).sort();
  await writeFile(join(DATA, 'keys.json'), JSON.stringify(keys));

  for (const c of categories) console.log(`${c.name}: ${c.items.length}개`);
  console.log(same ? '데이터 변경 없음' : '데이터 갱신됨');
  // 이미지가 일부 빠져도 데이터는 저장하되(이름 타일로 표시됨), 워크플로에서 알 수 있게 표시한다.
  if (imageStats?.failed && process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `image_failed=${imageStats.failed}\n`, { flag: 'a' });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1); });
}
