import { writeFileSync, mkdirSync } from 'node:fs';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
mkdirSync(new URL('../raw/pages-untapped/', import.meta.url), { recursive: true });
for (const p of ['cards/juggernaut', 'cards/brightest-flame', 'cards/expect-a-fight', 'cards/guiding-star', 'cards/abundance', 'relics/seal-of-gold']) {
  const r = await fetch(`https://sts2.untapped.gg/en/${p}`, { headers: { 'User-Agent': UA } });
  const h = await r.text();
  // 본문 글자만 남겨 크기를 줄인다
  const text = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  writeFileSync(new URL(`../raw/pages-untapped/${p.replace('/', '_')}.txt`, import.meta.url), text);
  // RSC 속 문구 조각
  const rsc = [...h.matchAll(/\\"children\\":\\"([^"\\]{8,200})\\"/g)].map(m => m[1]);
  writeFileSync(new URL(`../raw/pages-untapped/${p.replace('/', '_')}.rsc.txt`, import.meta.url), [...new Set(rsc)].join('\n'));
  await new Promise(r => setTimeout(r, 800));
}
