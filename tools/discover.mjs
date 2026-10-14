// 위키 구조 탐색용: StS2 관련 모듈/페이지 목록과 원문을 out 디렉터리에 저장한다.
// 사용: node tools/discover.mjs <out-dir>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2] || 'raw';
const API = 'https://slaythespire.wiki.gg/api.php';
const UA = 'sts2-tier-maker/0.1 (https://github.com/siggu/sts2-tier-maker)';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const text = await res.text();
  return { status: res.status, text };
}

async function api(params) {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const { status, text } = await get(`${API}?${qs}`);
  if (status !== 200) throw new Error(`${status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function allPages(ns) {
  const titles = [];
  let cont = {};
  for (let i = 0; i < 40; i++) {
    const r = await api({ action: 'query', list: 'allpages', apnamespace: String(ns), aplimit: 'max', ...cont });
    titles.push(...r.query.allpages.map(p => p.title));
    if (!r.continue) break;
    cont = r.continue;
  }
  return titles;
}

await mkdir(join(OUT, 'modules'), { recursive: true });
const log = [];

const namespaces = await api({ action: 'query', meta: 'siteinfo', siprop: 'namespaces|general' });
await writeFile(join(OUT, 'siteinfo.json'), JSON.stringify(namespaces, null, 1));

const modules = await allPages(828);
await writeFile(join(OUT, 'modules.txt'), modules.join('\n'));
const mainPages = await allPages(0);
await writeFile(join(OUT, 'pages.txt'), mainPages.join('\n'));
const categories = await allPages(14);
await writeFile(join(OUT, 'categories.txt'), categories.join('\n'));
log.push(`modules=${modules.length} pages=${mainPages.length} categories=${categories.length}`);

for (const title of modules.filter(t => /sts2|slay the spire 2/i.test(t))) {
  const { status, text } = await get(`https://slaythespire.wiki.gg/index.php?title=${encodeURIComponent(title)}&action=raw`);
  log.push(`${status} ${title} ${text.length}`);
  await writeFile(join(OUT, 'modules', title.replace(/[^\w.-]+/g, '_') + '.lua'), text);
}

// 대표 페이지 몇 개의 위키텍스트
for (const title of ['Slay the Spire 2', 'Relics List', 'Slay the Spire 2:Cards', 'Cards (Slay the Spire 2)']) {
  const { status, text } = await get(`https://slaythespire.wiki.gg/index.php?title=${encodeURIComponent(title)}&action=raw`);
  log.push(`${status} page ${title} ${text.length}`);
  if (status === 200) await writeFile(join(OUT, 'page_' + title.replace(/[^\w.-]+/g, '_') + '.wiki'), text);
}

await writeFile(join(OUT, 'log.txt'), log.join('\n'));
console.log(log.join('\n'));
