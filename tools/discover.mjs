// 위키 구조 탐색용 (3단계): StS2 모듈 원문 + 고대의 존재·막 관련 페이지
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2] || 'raw';
const UA = 'sts2-tier-maker/0.1 (https://github.com/siggu/sts2-tier-maker)';
const raw = async t => {
  const res = await fetch(`https://slaythespire.wiki.gg/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: { 'User-Agent': UA } });
  return res.ok ? res.text() : null;
};
await mkdir(join(OUT, 'modules'), { recursive: true });
await mkdir(join(OUT, 'pages'), { recursive: true });
const res = await fetch('https://slaythespire.wiki.gg/api.php?action=query&list=allpages&apnamespace=828&aplimit=max&format=json', { headers: { 'User-Agent': UA } });
const modules = (await res.json()).query.allpages.map(p => p.title).filter(t => /sts2/i.test(t));
for (const t of modules) { const s = await raw(t); if (s) await writeFile(join(OUT, 'modules', t.replace(/[^\w.-]+/g, '_') + '.lua'), s); }
const pages = ['Neow', 'Orobas', 'Darv', 'Tezcatara', 'Tanx', 'Pael', 'Nonupeipe', 'Vakuu', 'Ancients', 'Ancient', 'Acts', 'Slay the Spire 2:Ancients', 'Slay the Spire 2:Acts', 'Overgrowth', 'Underdocks', 'Hive', 'Glory', 'Slay the Spire 2:Enemies', 'Slay the Spire 2:Relics', 'Slay the Spire 2:Potions'];
const log = [];
for (const t of pages) { const s = await raw(t); log.push(`${s ? s.length : 'missing'} ${t}`); if (s) await writeFile(join(OUT, 'pages', t.replace(/[^\w.-]+/g, '_') + '.wiki'), s); }
const all = await fetch('https://slaythespire.wiki.gg/api.php?action=query&list=allpages&apnamespace=0&aplimit=max&apprefix=Slay the Spire 2&format=json', { headers: { 'User-Agent': UA } });
log.push(...(await all.json()).query.allpages.map(p => 'page: ' + p.title));
await writeFile(join(OUT, 'log.txt'), log.join('\n'));
console.log(log.join('\n'));
