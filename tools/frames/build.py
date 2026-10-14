# 같은 묶음의 카드 원본들을 겹쳐서, 카드마다 같은 부분(테두리·리본·보석·명판)은 틀로 남기고
# 카드마다 다른 부분(그림·이름·설명·비용 숫자)은 지운다. 그림 칸은 투명하게 뚫어서 내보낸다.
# 사용: python3 tools/frames/build.py <받은 폴더> <내보낼 폴더> <글꼴.ttf>
import json, os, sys, hashlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, OUT, FONT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
meta = {}
previews = []

def load_set(folder):
    ims = []
    for f in sorted(os.listdir(folder)):
        im = Image.open(os.path.join(folder, f)).convert('RGBA')
        ims.append(im)
    # 크기가 다르면 가장 흔한 크기로 맞춘다
    sizes = [im.size for im in ims]
    size = max(set(sizes), key=sizes.count)
    return [np.array(im.resize(size, Image.LANCZOS)).astype(np.float32) for im in ims], size

def build(key):
    ims, (W, H) = load_set(os.path.join(SRC, key))
    st = np.stack(ims)
    med = np.median(st, axis=0)
    std = st[..., :3].std(axis=0).mean(axis=2)
    var = (std > 16).astype(np.uint8)
    s = W / 240  # 기준(240×300) 대비 배율
    # 그림 칸: 위쪽 큰 덩어리 (배너 아래부터)
    band = int(46 * s)
    art = var.copy(); art[:band] = 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats(art, 8)
    big = max(range(1, n), key=lambda i: stats[i][4])
    art = (lab == big).astype(np.uint8)
    art = cv2.morphologyEx(art, cv2.MORPH_CLOSE, np.ones((int(9 * s), int(9 * s)), np.uint8))
    art = cv2.dilate(art, np.ones((3, 3), np.uint8))
    art[:band] = 0
    # 지울 곳: 카드마다 다른 곳 + 배너 글자 띠 + 종류 명판 글자
    mask = cv2.dilate(var * 255, np.ones((int(3 * s) | 1, int(3 * s) | 1), np.uint8))
    # 배너 글자는 테두리까지 번진 자국이 남기 쉬워 조금 더 넓게 지운다 (보석 자리는 빼고)
    top = np.zeros_like(var); top[:band, int(56 * s):] = var[:band, int(56 * s):]
    k = int(5 * s) | 1
    mask = np.maximum(mask, cv2.dilate(top * 255, np.ones((k, k), np.uint8)))
    mask[int(154 * s):int(168 * s), int(103 * s):int(137 * s)] = 255
    # 그림 칸도 지울 곳에 넣어야 뭉개진 그림 색이 배너·테두리로 번지지 않는다 (그림 칸은 어차피 뚫린다)
    mask[art > 0] = 255
    rgb = cv2.cvtColor(med[..., :3].astype(np.uint8), cv2.COLOR_RGB2BGR)
    rgb = cv2.inpaint(rgb, mask, int(3 * s) or 3, cv2.INPAINT_TELEA)
    alpha = med[..., 3].astype(np.uint8)
    soft = cv2.GaussianBlur(art.astype(np.float32), (0, 0), 1.2 * s)
    alpha = np.minimum(alpha, ((1 - soft) * 255).astype(np.uint8))
    frame = Image.fromarray(np.dstack([cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB), alpha]))
    frame.save(os.path.join(OUT, f'{key}.png'))
    ys, xs = np.nonzero(art)
    meta[key] = {
        'size': [W, H],
        'art': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        'desc': [int(42 * s), int(176 * s), int(198 * s), int(264 * s)],
        'cards': len(ims),
    }
    return frame, art, (W, H)

def font(px): return ImageFont.truetype(FONT, px)
def wrap(d, text, f, maxw):
    out, line = [], ''
    for w in text.split():
        t = (line + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw: line = t
        else:
            if line: out.append(line)
            line = w
    if line: out.append(line)
    return out

TONES = [((200, 70, 60), (90, 25, 20)), ((80, 140, 75), (30, 60, 30)), ((65, 125, 195), (25, 50, 95)), ((150, 95, 190), (60, 35, 90)), ((215, 150, 60), (100, 55, 20))]

def preview(frame, art, size, text, style):
    W, H = size
    h = int(hashlib.md5(text.encode()).hexdigest(), 16)
    c1, c2 = TONES[h % len(TONES)]
    ys, xs = np.nonzero(art)
    ax0, ax1, ay0, ay1 = xs.min(), xs.max(), ys.min(), ys.max()
    acx, acy = (ax0 + ax1) / 2, (ay0 + ay1) / 2
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.clip(np.hypot(xx - acx, yy - acy) / ((ax1 - ax0) * .75), 0, 1)[..., None]
    bg = (np.array(c1) * (1 - r) + np.array(c2) * r).astype(np.uint8)
    canvas = Image.fromarray(np.dstack([bg, np.full((H, W), 255, np.uint8)]))
    d = ImageDraw.Draw(canvas)
    s = W / 240
    if style == 'glyph':
        R = (ay1 - ay0) * .3
        d.polygon([(acx, acy - R * 1.25), (acx + R, acy), (acx, acy + R * 1.25), (acx - R, acy)], fill=(245, 228, 190), outline=(25, 18, 12), width=int(4 * s))
        d.polygon([(acx, acy - R * .6), (acx + R * .48, acy), (acx, acy + R * .6), (acx - R * .48, acy)], fill=(66, 31, 18))
    else:
        for px in range(int(26 * s), int(9 * s), -1):
            f = font(px); L = wrap(d, text, f, (ax1 - ax0) * .86)
            if len(L) * px * 1.25 < (ay1 - ay0) * .8: break
        y = acy - len(L) * px * 1.25 / 2 + px * .62
        for l in L:
            d.text((acx, y), l, font=f, anchor='mm', fill=(255, 244, 220), stroke_width=int(2.5 * s), stroke_fill=(20, 12, 8)); y += px * 1.25
    out = Image.alpha_composite(canvas, frame)
    # 그림 칸 밖은 틀의 투명도를 따른다
    a = np.array(out); a[..., 3] = np.maximum(np.array(frame)[..., 3], (art * 255).astype(np.uint8)); out = Image.fromarray(a)
    if style == 'glyph':
        d = ImageDraw.Draw(out)
        bx0, by0, bx1, by1 = 42 * s, 178 * s, 198 * s, 262 * s
        for px in range(int(22 * s), int(8 * s), -1):
            f = font(px); L = wrap(d, text, f, bx1 - bx0)
            if len(L) * px * 1.3 < by1 - by0: break
        y = (by0 + by1) / 2 - len(L) * px * 1.3 / 2 + px * .65
        for l in L:
            d.text(((bx0 + bx1) / 2, y), l, font=f, anchor='mm', fill=(238, 232, 218), stroke_width=int(1.2 * s), stroke_fill=(20, 16, 12)); y += px * 1.3
    return out

keys = sorted(k for k in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, k)))
built = {}
for k in keys:
    try:
        built[k] = build(k); print(k, meta[k])
    except Exception as e:
        print('실패', k, e)
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)

# 미리보기: 서로 다른 틀 4개 × (상징형, 문구형)
samples = ['상점에서 1골드 모자라서 사기 유물 못 사기', '마지막 1HP 사망', '네오 축복 꽝', 'Elite x3 in a row']
want = ['ironclad-attack-common', 'silent-power-uncommon', 'defect-attack-rare', 'necrobinder-skill-common', 'regent-skill-uncommon', 'colorless-skill-rare']
pick = [k for k in want if k in built][:4] or list(built)[:4]
cells = [[preview(*built[k], t, style) for k, t in zip(pick, samples)] for style in ('glyph', 'text')]
cw = max(c.width for row in cells for c in row); ch = max(c.height for row in cells for c in row)
sheet = Image.new('RGBA', ((cw + 30) * len(pick), (ch + 30) * 2), (13, 15, 20, 255))
for ri, row in enumerate(cells):
    for ci, c in enumerate(row): sheet.alpha_composite(c, (ci * (cw + 30), ri * (ch + 30)))
sheet.save(os.path.join(OUT, 'preview.png'))
# 모든 틀 한눈에
tiles = [Image.open(os.path.join(OUT, f'{k}.png')) for k in built]
tw = tiles[0].width // 2; th = tiles[0].height // 2; cols = 9
grid = Image.new('RGBA', (cols * (tw + 10), ((len(tiles) + cols - 1) // cols) * (th + 10)), (13, 15, 20, 255))
for i, t in enumerate(tiles): grid.alpha_composite(t.resize((tw, th), Image.LANCZOS), ((i % cols) * (tw + 10), (i // cols) * (th + 10)))
grid.save(os.path.join(OUT, 'all-frames.png'))
