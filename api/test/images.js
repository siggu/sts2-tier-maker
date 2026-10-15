// 시험용 이미지 바이트를 손으로 만든다 (PNG·JPEG·WebP). 픽셀 데이터는 그럴듯한 아무 바이트 —
// image.js 는 압축을 풀지 않고 조각 구조·크기·메타데이터만 보므로 이것으로 충분하다.

const ascii = s => [...s].map(ch => ch.charCodeAt(0));
const be32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = n => [(n >>> 8) & 255, n & 255];
const le32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const le24 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
const le16 = n => [n & 255, (n >>> 8) & 255];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- PNG ----------
export function pngChunk(type, data = []) {
  const body = [...ascii(type), ...data];
  return [...be32(data.length), ...body, ...be32(crc32(body))];
}

// before: IDAT 앞에 넣을 조각들, after: IDAT 뒤(IEND 앞), trailing: IEND 뒤에 붙일 바이트
export function png({ w = 64, h = 48, seed = 0, before = [], after = [], trailing = [] } = {}) {
  const ihdr = [...be32(w), ...be32(h), 8, 6, 0, 0, 0];
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...pngChunk('IHDR', ihdr),
    ...before.flat(),
    ...pngChunk('IDAT', [0x78, 0x9c, 1, 2, 3, seed & 255, 0xff, 0x00]),
    ...after.flat(),
    ...pngChunk('IEND'),
    ...trailing,
  ]);
}

// ---------- JPEG ----------
const seg = (marker, data) => [0xff, marker, ...be16(data.length + 2), ...data];
export const jpegSeg = seg;

// app: 넣을 추가 세그먼트들 (SOF 앞). scan: 압축 데이터 바이트. trailing: EOI 뒤
export function jpeg({ w = 64, h = 48, seed = 0, app = [], scan = null, trailing = [], progressive = false } = {}) {
  const jfif = seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const dqt = seg(0xdb, [0, ...Array.from({ length: 64 }, (_, i) => (i % 16) + 1)]);
  const sof = seg(progressive ? 0xc2 : 0xc0, [8, ...be16(h), ...be16(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  const dht = seg(0xc4, [0, 0, 1, ...Array(15).fill(0), 0]);
  const sos = seg(0xda, [3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0]);
  // 압축 데이터 안의 FF 00(바이트 FF), FF D0(재시작)은 마커가 아니다
  const data = scan ?? [0x12, seed & 255, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0x78];
  const second = progressive ? [...dht, ...seg(0xda, [1, 1, 0, 1, 5, 0]), 0x9a, 0xbc] : [];
  return new Uint8Array([0xff, 0xd8, ...jfif, ...app.flat(), ...dqt, ...sof, ...dht, ...sos, ...data, ...second, 0xff, 0xd9, ...trailing]);
}
export const exifApp1 = () => seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('MM'), 0, 42, 0, 0, 0, 8, ...ascii('GPS-SECRET')]);
export const xmpApp1 = () => seg(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/'), 0, ...ascii('<x:xmpmeta>author</x:xmpmeta>')]);
export const iccApp2 = () => seg(0xe2, [...ascii('ICC_PROFILE'), 0, 1, 1, 9, 9, 9]);
export const adobeApp14 = () => seg(0xee, [...ascii('Adobe'), 0, 100, 0, 0, 0, 0, 1]);
export const comment = text => seg(0xfe, ascii(text));

// ---------- WebP ----------
export function riffChunk(type, data) {
  return [...ascii(type), ...le32(data.length), ...data, ...(data.length & 1 ? [0] : [])];
}
const vp8 = (w, h, seed) => riffChunk('VP8 ', [0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a, ...le16(w), ...le16(h), seed & 255, 1, 2]);
const vp8l = (w, h, seed) => {
  const bits = ((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14) | (1 << 28);
  return riffChunk('VP8L', [0x2f, ...le32(bits >>> 0), seed & 255, 7]);
};

function riff(chunks) {
  const body = [...ascii('WEBP'), ...chunks.flat()];
  return new Uint8Array([...ascii('RIFF'), ...le32(body.length), ...body]);
}

// kind: 'lossy' | 'lossless' | 'extended'. extended 면 flags 와 extra 조각(EXIF 등)을 넣는다.
export function webp({ w = 64, h = 48, seed = 0, kind = 'lossy', flags = 0, before = [], after = [], trailing = [] } = {}) {
  if (kind === 'lossy') return new Uint8Array([...riff([vp8(w, h, seed)]), ...trailing]);
  if (kind === 'lossless') return new Uint8Array([...riff([vp8l(w, h, seed)]), ...trailing]);
  const vp8x = riffChunk('VP8X', [flags, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)]);
  return new Uint8Array([...riff([vp8x, ...before, vp8(w, h, seed), ...after]), ...trailing]);
}
export const WEBP_FLAGS = { icc: 0x20, alpha: 0x10, exif: 0x08, xmp: 0x04, anim: 0x02 };

// 모르는 바이트 순서로 숫자 읽기 (시험에서 쓴다)
export const readLe32 = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24);

// bytes 안에 needle(문자열)이 들어 있는가
export function contains(bytes, needle) {
  const n = ascii(needle);
  outer: for (let i = 0; i + n.length <= bytes.length; i++) {
    for (let j = 0; j < n.length; j++) if (bytes[i + j] !== n[j]) continue outer;
    return true;
  }
  return false;
}
