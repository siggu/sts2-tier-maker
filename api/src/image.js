// 올린 이미지 검사·정리 (순수 함수, DB 를 쓰지 않는다).
// - 형식: Content-Type 과 파일 앞부분(매직 바이트)이 맞아야 한다 (PNG·JPEG·WebP).
// - 크기: 가로·세로 모두 16–1024px.
// - 움직이는 그림(APNG, 애니메이션 WebP)은 받지 않는다.
// - 메타데이터(EXIF·XMP·글·시각 등)는 지운다. 그림을 그리는 데 필요한 조각만 남긴다.
// 정리한 바이트로 해시(id)를 만들고 저장한다 (moderation.js).

export const MIN_SIDE = 16;
export const MAX_SIDE = 1024;

const startsWith = (b, sig, at = 0) => b.length >= at + sig.length && sig.every((x, i) => b[at + i] === x);
const ascii = s => [...s].map(ch => ch.charCodeAt(0));
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const IMAGE_TYPES = {
  'image/png': b => startsWith(b, PNG_SIG),
  'image/jpeg': b => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/webp': b => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
};

export function imageTypeOf(contentType) {
  const t = (contentType || '').split(';')[0].trim().toLowerCase();
  return Object.hasOwn(IMAGE_TYPES, t) ? t : null;
}

// 파일 앞부분으로 형식 알아내기 (Content-Type 이 없는 곳에서 쓴다)
export function sniffType(bytes) {
  return Object.keys(IMAGE_TYPES).find(t => IMAGE_TYPES[t](bytes)) || null;
}

// id = sha256(정리한 바이트) 앞 32자리 hex. 같은 그림은 한 번만 저장되고, 차단 목록도 이 값으로 찾는다.
export async function imageId(bytes) {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const u16be = (b, i) => (b[i] << 8) | b[i + 1];
const u32be = (b, i) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
const u16le = (b, i) => b[i] | (b[i + 1] << 8);
const u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32le = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 0x1000000;
const fourcc = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

// ---------- PNG ----------
// 조각(chunk) = 길이(4, BE) + 종류(4) + 내용 + CRC(4). 첫 조각은 IHDR(가로·세로), 끝은 IEND.
// 그리는 데 쓰는 조각만 남긴다: tEXt·zTXt·iTXt·eXIf·tIME 와 모르는 부가 조각은 버린다.
// acTL(APNG) 이 있으면 움직이는 그림. IEND 뒤에 붙은 바이트도 버린다.
const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'cHRM', 'gAMA', 'iCCP', 'sBIT', 'sRGB', 'cICP', 'mDCv', 'cLLi', 'bKGD', 'pHYs']);

// → { width, height, animated, bytes } | null (깨진 파일)
export function parsePng(b) {
  if (!startsWith(b, PNG_SIG)) return null;
  const parts = [b.subarray(0, 8)];
  let pos = 8, width = 0, height = 0, animated = false, idat = false, first = true;
  while (true) {
    if (pos + 12 > b.length) return null; // IEND 전에 끝남
    const len = u32be(b, pos);
    const type = fourcc(b, pos + 4);
    const end = pos + 12 + len;
    if (len > 0x7fffffff || end > b.length || !/^[A-Za-z]{4}$/.test(type)) return null;
    if (first) {
      if (type !== 'IHDR' || len !== 13) return null;
      width = u32be(b, pos + 8);
      height = u32be(b, pos + 12);
      first = false;
    } else if (type === 'IHDR') return null;
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') animated = true;
    if (type === 'IDAT') idat = true;
    // 첫 글자가 대문자면 꼭 필요한 조각: 모르는 것이면 그릴 수 없는 파일
    if (!PNG_KEEP.has(type) && type[0] <= 'Z') return null;
    if (PNG_KEEP.has(type)) parts.push(b.subarray(pos, end));
    pos = end;
    if (type === 'IEND') break;
  }
  if (!idat) return null;
  return { width, height, animated, bytes: concat(parts) };
}

// ---------- JPEG ----------
// 마커(FF xx) 단위로 읽는다. SOFn 에서 가로·세로, SOS 뒤로는 압축 데이터(FF 00 = 바이트 FF, FF D0–D7 = 재시작)가
// 다음 마커까지 이어진다. APP0(JFIF)·APP14(Adobe, 색 변환) 만 남기고 APP1–APP13·APP15(EXIF·XMP·ICC 등)와
// COM(주석)은 버린다. EOI(FF D9) 뒤에 붙은 바이트(MPF 다른 그림, 덧붙인 파일 등)도 버린다.
const isSof = m => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
const JPEG_KEEP_APP = new Set([0xe0, 0xee]);

// 압축 데이터의 끝(다음 마커의 FF 위치). FF 00(바이트 FF)·FF D0–D7(재시작)은 데이터, FF FF 는 채움.
function scanEnd(b, pos) {
  while (pos < b.length) {
    if (b[pos] !== 0xff) { pos++; continue; }
    const n = b[pos + 1];
    if (n === 0x00 || (n >= 0xd0 && n <= 0xd7)) pos += 2;
    else if (n === 0xff) pos++;
    else return n === undefined ? b.length : pos;
  }
  return b.length;
}

export function parseJpeg(b) {
  if (!startsWith(b, [0xff, 0xd8])) return null;
  const parts = [b.subarray(0, 2)];
  let pos = 2, width = 0, height = 0, sof = false, scanned = false;
  while (pos < b.length) {
    if (b[pos] !== 0xff) return null;
    let m = pos + 1;
    while (m < b.length && b[m] === 0xff) m++; // 채움 바이트
    if (m >= b.length) return null;
    const marker = b[m];
    const at = m - 1; // 'FF xx' 의 FF
    if (marker === 0xd9) { // EOI: 여기까지만
      if (!scanned) return null;
      parts.push(b.subarray(at, m + 1));
      return { width, height, animated: false, bytes: concat(parts) };
    }
    if (marker === 0x00 || marker === 0xd8) return null;
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { // 길이 없는 마커
      parts.push(b.subarray(at, m + 1));
      pos = m + 1;
      continue;
    }
    if (m + 2 >= b.length) return null;
    const len = u16be(b, m + 1);
    const end = m + 1 + len;
    if (len < 2 || end > b.length) return null;
    if (isSof(marker) && !sof) {
      if (len < 7) return null;
      height = u16be(b, m + 4);
      width = u16be(b, m + 6);
      sof = true;
    }
    const drop = (marker >= 0xe0 && marker <= 0xef && !JPEG_KEEP_APP.has(marker)) || marker === 0xfe;
    if (!drop) parts.push(b.subarray(at, end));
    pos = end;
    if (marker === 0xda) { // SOS: 뒤따르는 압축 데이터를 그대로 옮긴다
      if (!sof) return null;
      scanned = true;
      const stop = scanEnd(b, pos);
      parts.push(b.subarray(pos, stop));
      pos = stop;
    }
  }
  return null; // EOI 없이 끝남
}

// ---------- WebP ----------
// RIFF(크기 LE) + 'WEBP' + 조각(fourcc + 크기 LE + 내용 + 짝수 맞춤 1바이트).
// 'VP8 '(손실)·'VP8L'(무손실)·'VP8X'(확장: 플래그 + 캔버스 크기). ANIM·ANMF 나 VP8X 의 애니메이션 플래그 → 움직이는 그림.
// VP8X·ICCP·ALPH·VP8·VP8L 만 남기고 EXIF·'XMP '·모르는 조각은 버린다. VP8X 의 EXIF·XMP 플래그를 끄고 RIFF 크기를 다시 쓴다.
const WEBP_KEEP = new Set(['VP8X', 'ICCP', 'ALPH', 'VP8 ', 'VP8L']);
const VP8X_ANIM = 0x02, VP8X_XMP = 0x04, VP8X_EXIF = 0x08;

export function parseWebp(b) {
  if (!(startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8))) return null;
  const riffEnd = 8 + u32le(b, 4);
  if (riffEnd < 12 || riffEnd > b.length) return null;
  const chunks = [];
  let pos = 12, width = 0, height = 0, animated = false, kind = null, image = false;
  while (pos + 8 <= riffEnd) {
    const type = fourcc(b, pos);
    const size = u32le(b, pos + 4);
    const data = pos + 8;
    if (data + size > riffEnd) return null;
    const d = b.subarray(data, data + size);
    if (!kind) kind = type;
    if (type === 'VP8X') {
      if (size < 10 || pos !== 12) return null; // VP8X 는 맨 앞에만
      if (d[0] & VP8X_ANIM) animated = true;
      width = u24le(d, 4) + 1;
      height = u24le(d, 7) + 1;
    } else if (type === 'VP8 ') {
      // 프레임 태그 3바이트 + 시작 코드 9D 01 2A + 가로(14비트)·세로(14비트)
      if (size < 10 || !startsWith(d, [0x9d, 0x01, 0x2a], 3)) return null;
      if (kind === 'VP8 ') { width = u16le(d, 6) & 0x3fff; height = u16le(d, 8) & 0x3fff; }
      image = true;
    } else if (type === 'VP8L') {
      if (size < 5 || d[0] !== 0x2f) return null;
      if (kind === 'VP8L') {
        const bits = u32le(d, 1);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      image = true;
    } else if (type === 'ANIM' || type === 'ANMF') {
      animated = true;
    }
    if (WEBP_KEEP.has(type)) chunks.push({ type, data: d });
    pos = data + size + (size & 1);
  }
  if (!image && !animated) return null;
  if (kind !== 'VP8X' && kind !== 'VP8 ' && kind !== 'VP8L') return null;

  const parts = [];
  let total = 4;
  for (const { type, data } of chunks) {
    const head = new Uint8Array(8);
    head.set(ascii(type));
    new DataView(head.buffer).setUint32(4, data.length, true);
    let body = data;
    if (type === 'VP8X') {
      body = data.slice();
      body[0] &= ~(VP8X_EXIF | VP8X_XMP) & 0xff;
    }
    parts.push(head, body);
    if (data.length & 1) parts.push(new Uint8Array(1));
    total += 8 + data.length + (data.length & 1);
  }
  const head = new Uint8Array(12);
  head.set(ascii('RIFF'));
  new DataView(head.buffer).setUint32(4, total, true);
  head.set(ascii('WEBP'), 8);
  return { width, height, animated, bytes: concat([head, ...parts]) };
}

const PARSERS = { 'image/png': parsePng, 'image/jpeg': parseJpeg, 'image/webp': parseWebp };

// 올린 이미지 검사 + 정리.
// → { ok: true, type, width, height, bytes(정리한 것) } | { ok: false, reason }
// reason: 'image'(형식이 틀렸거나 깨짐) | 'animated'(움직이는 그림) | 'dimensions'(가로·세로가 16–1024px 밖)
export function inspectImage(bytes, type) {
  if (!Object.hasOwn(PARSERS, type) || !IMAGE_TYPES[type](bytes)) return { ok: false, reason: 'image' };
  let info = null;
  try { info = PARSERS[type](bytes); } catch { info = null; }
  if (!info) return { ok: false, reason: 'image' };
  if (info.animated) return { ok: false, reason: 'animated' };
  const { width, height } = info;
  if (width < MIN_SIDE || height < MIN_SIDE || width > MAX_SIDE || height > MAX_SIDE) return { ok: false, reason: 'dimensions' };
  return { ok: true, type, width, height, bytes: info.bytes };
}
