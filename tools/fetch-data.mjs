// Slay the Spire Wiki(slaythespire.wiki.gg)의 StS2 데이터 모듈을 읽어
// site/data/sts2.json, site/data/keys.json 과 이미지(site/data/img/...)를 만든다.
//
// 사용: node tools/fetch-data.mjs            (전체)
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

async function get(url, { binary = false, tries = 4 } = {}) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (err) {
      if (i + 1 >= tries) throw err;
      await new Promise(r => setTimeout(r, 1000 * 2 ** i));
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

async function runImageJobs() {
  let done = 0, failed = 0, skipped = 0;
  const queue = imageJobs.slice();
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        if (process.argv.includes('--keep-images')) {
          try { await access(job.out); skipped++; continue; } catch { /* 없으면 받는다 */ }
        }
        const buf = await get(`${WIKI}/wiki/Special:FilePath/${encodeURIComponent(job.file)}`, { binary: true });
        let img = sharp(buf);
        if (job.trim) img = img.trim();
        img = img.resize({ width: job.width, height: job.height, fit: 'inside', withoutEnlargement: true });
        await mkdir(dirname(job.out), { recursive: true });
        await img.webp({ quality: 82, effort: 5 }).toFile(job.out);
        done++;
      } catch (err) {
        failed++;
        job.failed = true;
        console.warn(`! 이미지 실패 ${job.file}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`이미지: ${done}개 저장, ${skipped}개 유지, ${failed}개 실패`);
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
    id: 'cards', name: '카드', tile: 'card', splitOnly: true,
    groups: [...CHARACTERS.map(({ id, name, color }) => ({ id, name, color })), { ...SHARED_GROUP, name: '무색' }],
    items,
  };
}

const RELIC_RARITIES = ['Common', 'Uncommon', 'Rare', 'Shop', 'Event', 'Ancient', 'Starter'];

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
      text: formatText(r.Description),
      img: image(r.Image, 'relics', id, { height: 128, width: 128 }),
    });
  }
  return {
    id: 'relics', name: '유물', tile: 'icon',
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
    id: 'potions', name: '포션', tile: 'icon',
    groups: [...CHARACTERS.map(({ id, name, color }) => ({ id, name, color })), SHARED_GROUP],
    items,
  };
}

const ACTS = { Overgrowth: '1막 · Overgrowth', Underdocks: '1막 · Underdocks', Hive: '2막 · Hive', Glory: '3막 · Glory' };

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

async function enemies(kind) {
  const data = await module(`Module:Enemies/StS2 data/${kind === 'Boss' ? 'Bosses' : 'Elites'}`);
  return encounters(data, kind).map(e => {
    const id = slug(e.name);
    return {
      id, name: e.name,
      group: e.debut ? slug(e.debut) : undefined,
      text: escapeHtml([
        e.debut && ACTS[e.debut],
        e.hp && `HP ${e.hp}`,
        e.members.length > 1 && e.members.map(m => m.name).join(', '),
      ].filter(Boolean).join('\n')),
      img: image(e.first.Image, kind === 'Boss' ? 'bosses' : 'elites', id, { height: 220, width: 260, trim: true }),
    };
  });
}

function actGroups(items) {
  return Object.entries(ACTS)
    .filter(([en]) => items.some(i => i.group === slug(en)))
    .map(([en, name]) => ({ id: slug(en), name }));
}

async function bossCategory() {
  const items = await enemies('Boss');
  return { id: 'bosses', name: '보스', tile: 'creature', groups: actGroups(items), items };
}

async function eliteCategory() {
  const items = await enemies('Elite');
  return { id: 'elites', name: '엘리트', tile: 'creature', groups: actGroups(items), items };
}

const ANCIENTS = ['Neow', 'Orobas', 'Darv', 'Tezcatara', 'Tanx', 'Pael', 'Nonupeipe', 'Vakuu'];

async function charactersAndAncients() {
  const data = await module('Module:Keywords/StS2 data/Characters');
  // 캐릭터는 전신 원화, 고대의 존재는 지도 아이콘을 쓴다.
  const chars = CHARACTERS.map(c => ({
    id: c.id, name: c.name, nameEn: c.en,
    img: image(`StS2_${c.en}.png`, 'characters', c.id, { height: 240, width: 200, trim: true }),
  }));
  const ancients = Object.keys(data)
    .filter(name => ANCIENTS.includes(name))
    .map(name => ({
      id: slug(name), name,
      img: image(`StS2_Map-${name}.png`, 'ancients', slug(name), { height: 160, width: 160 }),
    }));
  return [
    { id: 'characters', name: '캐릭터', tile: 'portrait', items: chars },
    { id: 'ancients', name: '고대의 존재', tile: 'icon', items: ancients },
  ];
}

// ---------------------------------------------------------------- 실행

async function main() {
  const [characters, ancients] = await charactersAndAncients();
  const categories = [
    characters,
    await cards(),
    await relics(),
    await potions(),
    await bossCategory(),
    await eliteCategory(),
    ancients,
  ];

  if (WITH_IMAGES) await runImageJobs();
  else for (const job of imageJobs) job.failed = !(await access(job.out).then(() => true, () => false));

  // 받지 못한 이미지는 경로를 지워서 이름 타일로 보이게 한다.
  const failed = new Set(imageJobs.filter(j => j.failed).map(j => j.out));
  for (const cat of categories) {
    for (const item of cat.items) {
      for (const key of ['img', 'icon']) {
        if (item[key] && failed.has(join(ROOT, 'site', item[key]))) delete item[key];
        if (item[key] === null || item[key] === undefined) delete item[key];
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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1); });
}
