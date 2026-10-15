import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectImage, parsePng, parseJpeg, parseWebp, sniffType, imageTypeOf, imageId, MIN_SIDE, MAX_SIDE } from '../src/image.js';
import {
  png, pngChunk, jpeg, jpegSeg, exifApp1, xmpApp1, iccApp2, adobeApp14, comment,
  webp, riffChunk, WEBP_FLAGS, readLe32, contains,
} from './images.js';

const enc = s => [...s].map(ch => ch.charCodeAt(0));

test('형식 알아내기', () => {
  assert.equal(sniffType(png()), 'image/png');
  assert.equal(sniffType(jpeg()), 'image/jpeg');
  assert.equal(sniffType(webp()), 'image/webp');
  assert.equal(sniffType(new Uint8Array(enc('GIF89a'))), null);
  assert.equal(imageTypeOf('image/webp; q=1'), 'image/webp');
  assert.equal(imageTypeOf('image/gif'), null);
  assert.equal(imageTypeOf('__proto__'), null);
});

test('형식과 내용이 다르면 image', () => {
  assert.deepEqual(inspectImage(jpeg(), 'image/png'), { ok: false, reason: 'image' });
  assert.deepEqual(inspectImage(png(), 'image/gif'), { ok: false, reason: 'image' });
  assert.deepEqual(inspectImage(new Uint8Array(0), 'image/jpeg'), { ok: false, reason: 'image' });
});

// ---------- PNG ----------

test('PNG: 크기 읽기, 16–1024px', () => {
  const r = inspectImage(png({ w: 300, h: 200 }), 'image/png');
  assert.equal(r.ok, true);
  assert.deepEqual([r.type, r.width, r.height], ['image/png', 300, 200]);
  assert.deepEqual(r.bytes, png({ w: 300, h: 200 })); // 지울 것이 없으면 그대로
  for (const [w, h] of [[MIN_SIDE, MIN_SIDE], [MAX_SIDE, MAX_SIDE], [16, 1024]]) assert.equal(inspectImage(png({ w, h }), 'image/png').ok, true, `${w}x${h}`);
  for (const [w, h] of [[15, 100], [100, 15], [1025, 100], [100, 1025], [0, 0], [0x7fffffff, 20]]) {
    assert.deepEqual(inspectImage(png({ w, h }), 'image/png'), { ok: false, reason: 'dimensions' }, `${w}x${h}`);
  }
});

test('PNG: 메타데이터 조각과 IEND 뒤 바이트를 지운다', () => {
  const meta = [
    pngChunk('tEXt', enc('Author\0someone')),
    pngChunk('zTXt', enc('Comment\0\0xx')),
    pngChunk('iTXt', enc('XML:com.adobe.xmp\0\0\0\0\0<xmp/>')),
    pngChunk('eXIf', enc('MM\0*GPS')),
    pngChunk('tIME', [7, 234, 1, 2, 3, 4, 5]),
    pngChunk('prVt', enc('private')), // 모르는 부가 조각
  ];
  const keep = [pngChunk('sRGB', [0]), pngChunk('pHYs', [0, 0, 11, 19, 0, 0, 11, 19, 1])];
  const input = png({ before: [keep[0], ...meta.slice(0, 3), keep[1]], after: meta.slice(3), trailing: enc('PK\x03\x04zip') });
  const r = inspectImage(input, 'image/png');
  assert.equal(r.ok, true);
  assert.deepEqual(r.bytes, png({ before: keep }));
  for (const s of ['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'prVt', 'someone', 'PK']) assert.ok(!contains(r.bytes, s), s);
  assert.ok(contains(r.bytes, 'sRGB') && contains(r.bytes, 'pHYs'));
});

test('PNG: APNG 는 animated', () => {
  const actl = pngChunk('acTL', [0, 0, 0, 2, 0, 0, 0, 0]);
  const fctl = pngChunk('fcTL', Array(26).fill(0));
  assert.deepEqual(inspectImage(png({ before: [actl, fctl] }), 'image/png'), { ok: false, reason: 'animated' });
  assert.equal(parsePng(png({ before: [actl] })).animated, true);
  // 크기도 틀려도 움직이는 그림이 먼저
  assert.deepEqual(inspectImage(png({ w: 2000, before: [actl] }), 'image/png'), { ok: false, reason: 'animated' });
});

test('PNG: 깨진 파일', () => {
  const ok = png();
  assert.equal(parsePng(ok.subarray(0, ok.length - 5)), null); // IEND 가 잘림
  assert.equal(parsePng(ok.subarray(0, 30)), null);
  // 첫 조각이 IHDR 이 아님
  const noIhdr = new Uint8Array([...ok.subarray(0, 8), ...pngChunk('sRGB', [0]), ...ok.subarray(8)]);
  assert.equal(parsePng(noIhdr), null);
  // IDAT 없음
  const noIdat = new Uint8Array([...ok.subarray(0, 8 + 25), ...pngChunk('IEND')]);
  assert.equal(parsePng(noIdat), null);
  // 모르는 필수 조각(대문자로 시작)
  assert.equal(parsePng(png({ before: [pngChunk('ZZZZ', [1])] })), null);
  // 조각 길이가 파일보다 김
  const long = ok.slice();
  long.set([0x7f, 0, 0, 0], 8 + 25);
  assert.equal(parsePng(long), null);
  // 조각 이름이 글자가 아님
  const junk = ok.slice();
  junk.set([0x31, 0x32, 0x33, 0x34], 8 + 25 + 4);
  assert.equal(parsePng(junk), null);
  assert.deepEqual(inspectImage(long, 'image/png'), { ok: false, reason: 'image' });
});

// ---------- JPEG ----------

test('JPEG: 크기 읽기 (기본·점진), 16–1024px', () => {
  const r = inspectImage(jpeg({ w: 512, h: 384 }), 'image/jpeg');
  assert.equal(r.ok, true);
  assert.deepEqual([r.width, r.height], [512, 384]);
  assert.deepEqual(r.bytes, jpeg({ w: 512, h: 384 }));
  const p = inspectImage(jpeg({ w: 40, h: 1024, progressive: true }), 'image/jpeg');
  assert.deepEqual([p.ok, p.width, p.height], [true, 40, 1024]);
  assert.deepEqual(p.bytes, jpeg({ w: 40, h: 1024, progressive: true }));
  assert.deepEqual(inspectImage(jpeg({ w: 1500, h: 100 }), 'image/jpeg'), { ok: false, reason: 'dimensions' });
  assert.deepEqual(inspectImage(jpeg({ w: 100, h: 0 }), 'image/jpeg'), { ok: false, reason: 'dimensions' });
});

test('JPEG: APP1–APP15·COM·EOI 뒤를 지우고 APP0·APP14 는 남긴다', () => {
  const input = jpeg({ app: [exifApp1(), xmpApp1(), iccApp2(), adobeApp14(), comment('made by someone')], trailing: [0xff, 0xd8, ...enc('MPF second image')] });
  const r = inspectImage(input, 'image/jpeg');
  assert.equal(r.ok, true);
  assert.deepEqual(r.bytes, jpeg({ app: [adobeApp14()] }));
  for (const s of ['Exif', 'GPS-SECRET', 'xmpmeta', 'ICC_PROFILE', 'someone', 'MPF']) assert.ok(!contains(r.bytes, s), s);
  assert.ok(contains(r.bytes, 'JFIF') && contains(r.bytes, 'Adobe'));
  // 압축 데이터 사이(점진 JPEG 의 스캔 사이)에 낀 APP 도 지운다
  const between = jpeg({ progressive: true, scan: [1, 2, 3, 0xff, 0x00, ...exifApp1()] });
  const out = parseJpeg(between);
  assert.ok(out && !contains(out.bytes, 'GPS-SECRET'));
  // 채움 바이트(FF FF)가 있어도 읽는다
  const filled = jpeg({ scan: [1, 2, 0xff, 0xff] });
  assert.equal(parseJpeg(filled)?.width, 64);
});

test('JPEG: 깨진 파일', () => {
  const ok = jpeg();
  assert.equal(parseJpeg(ok.subarray(0, ok.length - 2)), null); // EOI 없음
  assert.equal(parseJpeg(ok.subarray(0, 25)), null);
  assert.equal(parseJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])), null); // 그림 없음
  // SOF 없이 SOS
  const noSof = new Uint8Array([0xff, 0xd8, ...jpegSeg(0xda, [1, 1, 0, 0, 63, 0]), 1, 2, 0xff, 0xd9]);
  assert.equal(parseJpeg(noSof), null);
  // 세그먼트 길이가 파일보다 김
  const long = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2, 3]);
  assert.equal(parseJpeg(long), null);
  // 세그먼트 사이에 쓰레기
  const junk = new Uint8Array([0xff, 0xd8, 0x12, ...ok.subarray(2)]);
  assert.equal(parseJpeg(junk), null);
  assert.deepEqual(inspectImage(long, 'image/jpeg'), { ok: false, reason: 'image' });
});

// ---------- WebP ----------

test('WebP: 손실·무손실·확장 크기 읽기', () => {
  for (const kind of ['lossy', 'lossless', 'extended']) {
    const r = inspectImage(webp({ kind, w: 512, h: 300 }), 'image/webp');
    assert.deepEqual([r.ok, r.width, r.height], [true, 512, 300], kind);
    assert.deepEqual(inspectImage(webp({ kind, w: 1025, h: 300 }), 'image/webp'), { ok: false, reason: 'dimensions' }, kind);
    assert.deepEqual(inspectImage(webp({ kind, w: 300, h: 8 }), 'image/webp'), { ok: false, reason: 'dimensions' }, kind);
  }
  assert.deepEqual(inspectImage(webp({ w: 100, h: 90 }), 'image/webp').bytes, webp({ w: 100, h: 90 }));
});

test('WebP: EXIF·XMP 조각을 지우고 VP8X 플래그·RIFF 크기를 고친다', () => {
  const exif = riffChunk('EXIF', enc('MM\0*GPS-SECRET'));
  const xmp = riffChunk('XMP ', enc('<x:xmpmeta>author</x:xmpmeta>'));
  const icc = riffChunk('ICCP', enc('icc-profile'));
  const alph = riffChunk('ALPH', [0, 1, 2]);
  const odd = riffChunk('ZZZZ', [1, 2, 3]); // 모르는 조각 (홀수 크기 + 짝수 맞춤)
  const flags = WEBP_FLAGS.icc | WEBP_FLAGS.alpha | WEBP_FLAGS.exif | WEBP_FLAGS.xmp;
  const input = webp({ kind: 'extended', w: 200, h: 100, flags, before: [icc, alph], after: [odd, exif, xmp], trailing: enc('junk after riff') });
  const r = inspectImage(input, 'image/webp');
  assert.equal(r.ok, true);
  assert.deepEqual([r.width, r.height], [200, 100]);
  const expected = webp({ kind: 'extended', w: 200, h: 100, flags: WEBP_FLAGS.icc | WEBP_FLAGS.alpha, before: [icc, alph] });
  assert.deepEqual(r.bytes, expected);
  assert.equal(readLe32(r.bytes, 4), r.bytes.length - 8);
  assert.equal(r.bytes[20], WEBP_FLAGS.icc | WEBP_FLAGS.alpha); // VP8X 플래그 바이트
  for (const s of ['EXIF', 'XMP ', 'GPS-SECRET', 'ZZZZ', 'junk']) assert.ok(!contains(r.bytes, s), s);
  // 단순(VP8) 파일 뒤에 붙은 조각·바이트도 지운다
  const simple = webp({ w: 64, h: 64 });
  const withExif = new Uint8Array([...simple, ...riffChunk('EXIF', enc('GPS-SECRET'))]);
  new DataView(withExif.buffer).setUint32(4, withExif.length - 8, true);
  assert.deepEqual(inspectImage(withExif, 'image/webp').bytes, simple);
});

test('WebP: 애니메이션은 animated', () => {
  assert.deepEqual(inspectImage(webp({ kind: 'extended', flags: WEBP_FLAGS.anim }), 'image/webp'), { ok: false, reason: 'animated' });
  const anim = riffChunk('ANIM', [0, 0, 0, 0, 0, 0]);
  const anmf = riffChunk('ANMF', Array(16).fill(0));
  assert.deepEqual(inspectImage(webp({ kind: 'extended', after: [anim, anmf] }), 'image/webp'), { ok: false, reason: 'animated' });
  // 프레임만 있고 VP8 이 없는 진짜 애니메이션 모양
  const frames = new Uint8Array([...enc('RIFF'), 0, 0, 0, 0, ...enc('WEBP'), ...riffChunk('VP8X', [WEBP_FLAGS.anim, 0, 0, 0, 63, 0, 0, 47, 0, 0]), ...anim, ...anmf]);
  new DataView(frames.buffer).setUint32(4, frames.length - 8, true);
  assert.equal(parseWebp(frames).animated, true);
  assert.deepEqual(inspectImage(frames, 'image/webp'), { ok: false, reason: 'animated' });
});

test('WebP: 깨진 파일', () => {
  const ok = webp();
  assert.equal(parseWebp(ok.subarray(0, ok.length - 3)), null); // RIFF 크기보다 짧음
  const bigRiff = ok.slice();
  new DataView(bigRiff.buffer).setUint32(4, 0xffff, true);
  assert.equal(parseWebp(bigRiff), null);
  // 그림 조각 없음
  const empty = new Uint8Array([...enc('RIFF'), 4, 0, 0, 0, ...enc('WEBP')]);
  assert.equal(parseWebp(empty), null);
  // VP8 시작 코드가 틀림
  const badVp8 = ok.slice();
  badVp8[23] = 0;
  assert.equal(parseWebp(badVp8), null);
  // 무손실 서명이 틀림
  const badL = webp({ kind: 'lossless' });
  badL[20] = 0x00;
  assert.equal(parseWebp(badL), null);
  // VP8X 가 맨 앞이 아님
  const late = new Uint8Array([...enc('RIFF'), 0, 0, 0, 0, ...enc('WEBP'), ...riffChunk('ICCP', [1, 2]), ...riffChunk('VP8X', Array(10).fill(0)), ...webp().subarray(12)]);
  new DataView(late.buffer).setUint32(4, late.length - 8, true);
  assert.equal(parseWebp(late), null);
  assert.deepEqual(inspectImage(bigRiff, 'image/webp'), { ok: false, reason: 'image' });
});

test('정리한 바이트로 id 를 만든다: 메타데이터만 다른 파일은 같은 id', async () => {
  const a = inspectImage(jpeg({ app: [exifApp1()] }), 'image/jpeg').bytes;
  const b = inspectImage(jpeg({ app: [comment('other')] }), 'image/jpeg').bytes;
  assert.equal(await imageId(a), await imageId(b));
  assert.match(await imageId(a), /^[0-9a-f]{32}$/);
  assert.notEqual(await imageId(png({ seed: 1 })), await imageId(png({ seed: 2 })));
});
