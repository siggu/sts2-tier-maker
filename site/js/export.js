// 티어 리스트를 PNG 로 그린다. 이미지는 같은 출처라 캔버스가 오염되지 않는다.

const TILE = {
  card: { w: 96, h: 124 },
  portrait: { w: 96, h: 124 },
  icon: { w: 76, h: 76 },
};
const LABEL_W = 132;
const GAP = 6;
const PAD = 28;
const WIDTH = 1240;

function loadImage(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function wrapLines(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = fitText(ctx, lines[maxLines - 1] + '…', maxW);
  }
  return lines;
}

export async function renderPng(template, state) {
  await document.fonts.ready;
  const size = TILE[template.tile] || TILE.icon;
  const perRow = Math.floor((WIDTH - PAD * 2 - LABEL_W - GAP) / (size.w + GAP));
  const rows = state.tiers.map(t => Math.max(1, Math.ceil(t.items.length / perRow)));
  const rowH = n => n * (size.h + GAP) + GAP;
  const headerH = 96;
  const footerH = 48;
  const height = headerH + rows.reduce((s, n) => s + rowH(n) + 4, 0) + footerH;

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // 배경
  const bg = ctx.createRadialGradient(WIDTH / 2, 0, 50, WIDTH / 2, height / 2, height);
  bg.addColorStop(0, '#2a2230');
  bg.addColorStop(1, '#0d0f14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, height);

  // 제목
  ctx.fillStyle = '#f3dfae';
  ctx.font = '700 34px "Gowun Batang", "Kreon", serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitText(ctx, state.title, WIDTH - PAD * 2), PAD, 50);
  ctx.strokeStyle = 'rgba(217,164,65,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, 82); ctx.lineTo(WIDTH - PAD, 82); ctx.stroke();

  const images = new Map();
  await Promise.all(state.tiers.flatMap(t => t.items).map(async id => {
    images.set(id, await loadImage(template.byId.get(id)?.img));
  }));

  let y = headerH;
  state.tiers.forEach((tier, ti) => {
    const h = rowH(rows[ti]);
    // 행 배경
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    roundRect(ctx, PAD, y, WIDTH - PAD * 2, h, 8); ctx.fill();
    // 라벨
    ctx.fillStyle = tier.color;
    roundRect(ctx, PAD, y, LABEL_W, h, 8); ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.textAlign = 'center';
    ctx.font = `700 ${tier.label.length > 3 ? 20 : 34}px "Kreon", "Gowun Batang", serif`;
    const lines = wrapLines(ctx, tier.label, LABEL_W - 16, 3);
    const lh = tier.label.length > 3 ? 24 : 38;
    lines.forEach((l, i) => ctx.fillText(l, PAD + LABEL_W / 2, y + h / 2 + (i - (lines.length - 1) / 2) * lh));
    ctx.textAlign = 'left';

    tier.items.forEach((id, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = PAD + LABEL_W + GAP + col * (size.w + GAP);
      const iy = y + GAP + row * (size.h + GAP);
      const img = images.get(id);
      if (img) {
        const r = Math.min(size.w / img.width, size.h / img.height);
        const w = img.width * r, hh = img.height * r;
        ctx.drawImage(img, x + (size.w - w) / 2, iy + (size.h - hh) / 2, w, hh);
      } else {
        ctx.fillStyle = '#2b2f38';
        roundRect(ctx, x, iy, size.w, size.h, 6); ctx.fill();
        ctx.fillStyle = '#e9e2cf';
        ctx.font = '600 12px "Kreon", sans-serif';
        ctx.textAlign = 'center';
        const name = template.byId.get(id)?.name || id;
        wrapLines(ctx, name, size.w - 8, 3).forEach((l, li) => ctx.fillText(l, x + size.w / 2, iy + size.h / 2 + (li - 1) * 14));
        ctx.textAlign = 'left';
      }
    });
    y += h + 4;
  });

  ctx.fillStyle = 'rgba(233,226,207,.55)';
  ctx.font = '500 14px "Pretendard Variable", sans-serif';
  ctx.fillText('siggu.github.io/sts2 · Slay the Spire 2 티어 메이커 (비공식)', PAD, height - 24);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
