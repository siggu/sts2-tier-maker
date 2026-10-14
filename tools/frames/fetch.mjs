// 사용자 월드컵 기본 이미지용 카드 틀을 뽑기 위해, 위키에서 카드 원본 이미지를 묶음별로 받는다.
// 묶음 = 캐릭터(무색 포함) × 종류(공격·스킬·파워) × 희귀도. 같은 묶음의 카드는 틀이 같고 그림·글자만 다르다.
// 사용: node tools/frames/fetch.mjs <받을 폴더>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseLuaData } from '../lua.mjs';
import { resolveFiles, slug } from '../fetch-data.mjs';

const OUT = process.argv[2] || 'frames-cache';
const WIKI = 'https://slaythespire.wiki.gg';
const UA = 'sts2-tier-maker/1.0 (https://github.com/siggu/sts2-tier-maker)';
const GROUPS = { Ironclad: 'ironclad', Silent: 'silent', Regent: 'regent', Necrobinder: 'necrobinder', Defect: 'defect', Colorless: 'colorless' };
const PER_SET = 16;

async function get(url, binary = false) {
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
    if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
    await new Promise(r => setTimeout(r, 2000 * 2 ** i));
  }
  throw new Error(`실패 ${url}`);
}

const sets = new Map();
for (const [wikiGroup, id] of Object.entries(GROUPS)) {
  const data = parseLuaData(await get(`${WIKI}/index.php?title=${encodeURIComponent(`Module:Cards/StS2 data/${wikiGroup}`)}&action=raw`));
  for (const [name, c] of Object.entries(data)) {
    if (!c.Image || !c.Type || !['Common', 'Uncommon', 'Rare'].includes(c.Rarity)) continue;
    if (c.Multiplayer && String(c.Multiplayer).toLowerCase() !== 'no') continue;
    const key = `${id}-${String(c.Type).toLowerCase()}-${c.Rarity.toLowerCase()}`;
    if (!sets.has(key)) sets.set(key, []);
    sets.get(key).push({ name, file: c.Image });
  }
}
const picked = [...sets].map(([key, list]) => [key, list.slice(0, PER_SET)]).filter(([, list]) => list.length >= 5);
const resolved = await resolveFiles(picked.flatMap(([, list]) => list.map(x => x.file)));
let n = 0;
for (const [key, list] of picked) {
  const dir = join(OUT, key);
  await mkdir(dir, { recursive: true });
  for (const x of list) {
    const info = resolved.get(x.file);
    if (!info) continue;
    await writeFile(join(dir, `${slug(x.name)}.png`), await get(info.url, true));
    n++;
    await new Promise(r => setTimeout(r, 120));
  }
  console.log(`${key}: ${list.length}`);
}
console.log(`받은 이미지 ${n}개, 묶음 ${picked.length}개`);
