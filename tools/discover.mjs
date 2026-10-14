// 위키 구조 탐색용 (2단계): StS2 이미지 파일 목록과 샘플 이미지를 out 디렉터리에 저장한다.
// 사용: node tools/discover.mjs <out-dir>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2] || 'raw';
const API = 'https://slaythespire.wiki.gg/api.php';
const UA = 'sts2-tier-maker/0.1 (https://github.com/siggu/sts2-tier-maker)';

async function api(params) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

await mkdir(join(OUT, 'samples'), { recursive: true });

// StS2 로 시작하는 모든 파일
const files = [];
for (const prefix of ['StS2', 'Sts2', 'STS2']) {
  let cont = {};
  for (let i = 0; i < 60; i++) {
    const r = await api({ action: 'query', list: 'allimages', aiprefix: prefix, ailimit: 'max', aiprop: 'size|url|mime', ...cont });
    files.push(...r.query.allimages.map(f => [f.name, f.width, f.height, f.size, f.url].join('\t')));
    if (!r.continue) break;
    cont = r.continue;
  }
}
await writeFile(join(OUT, 'files.tsv'), files.join('\n'));

// 캐릭터 페이지 위키텍스트 (초상화 파일명 확인용)
for (const t of ['Ironclad', 'Silent', 'Regent', 'Necrobinder', 'Defect', 'Neow', 'Ceremonial Beast', 'Slay the Spire 2']) {
  const res = await fetch(`https://slaythespire.wiki.gg/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: { 'User-Agent': UA } });
  if (res.ok) await writeFile(join(OUT, `page_${t.replace(/\W+/g, '_')}.wiki`), await res.text());
}

const samples = [
  'StS2_Ironclad-Bash.png', 'StS2_Regent-Strike.png', 'StS2_BurningBlood.png', 'StS2_Anchor.png', 'StS2_AttackPotion.png',
  'StS2_Ceremonial Beast.png', 'StS2 Icon CeremonialBeastBoss.png', 'StS2_IconIronclad.png', 'StS2_IconNeow.png', 'StS2_Byrdonis.png',
];
const log = [`files=${files.length}`];
for (const name of samples) {
  const res = await fetch(`https://slaythespire.wiki.gg/wiki/Special:FilePath/${encodeURIComponent(name)}`, { headers: { 'User-Agent': UA } });
  log.push(`${res.status} ${name} ${res.headers.get('content-type')}`);
  if (res.ok) await writeFile(join(OUT, 'samples', name.replace(/\s+/g, '_')), Buffer.from(await res.arrayBuffer()));
}
await writeFile(join(OUT, 'log.txt'), log.join('\n'));
console.log(log.join('\n'));
