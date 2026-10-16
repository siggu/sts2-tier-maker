// untapped.gg 의 카드·유물·포션 상세 페이지에서 안정판 문구와 public-beta 변경 문구를 뽑는다 (임시 점검용)
import { readFileSync, writeFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(new URL('./sts2.json', import.meta.url)));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const out = {};
const jobs = [];
for (const c of d.categories) if (['cards', 'relics', 'potions'].includes(c.id)) for (const it of c.items) jobs.push([c.id, it.id]);
async function one([cat, id]) {
  const url = `https://sts2.untapped.gg/en/${cat}/${id}`;
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (r.status === 404) { out[`${cat}/${id}`] = { status: 404 }; return; }
      if (!r.ok) throw new Error(r.status);
      const h = await r.text();
      const og = h.match(/<meta property="og:description" content="([^"]*)"/)?.[1] || '';
      const asides = [...h.matchAll(/<aside class="BetaChanges[^"]*"[^>]*>([\s\S]*?)<\/aside>/g)].map(m => text(m[1]));
      const title = h.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      out[`${cat}/${id}`] = { status: 200, url: r.url, title: text(title), stable: text(og), beta: asides };
      return;
    } catch (e) { await sleep(2000 * (t + 1)); }
  }
  out[`${cat}/${id}`] = { status: 'error' };
}
let i = 0;
async function worker() { while (i < jobs.length) { const j = jobs[i++]; await one(j); await sleep(300); } }
await Promise.all([worker(), worker(), worker()]);
writeFileSync(new URL('../raw/untapped-items.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(Object.values(out).reduce((a, v) => (a[v.status] = (a[v.status] || 0) + 1, a), {}));
