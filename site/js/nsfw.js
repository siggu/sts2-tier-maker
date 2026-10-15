// 올리기 전에 브라우저에서 야한 그림을 거른다 (nsfwjs + TensorFlow.js, site/vendor/ 에 들어 있다).
// 처음 부를 때만 스크립트와 모델(MobileNetV2, 224px, 양자화 2.6MB)을 불러온다.
// 불러오지 못하거나 검사 중 오류가 나면 통과시킨다 — 서버(Workers AI)가 다시 검사한다.
// 사용자 월드컵 그림(cups.js)이 쓰고, 나중에 프로필 사진도 같이 쓴다.
//
//   const r = await checkImageSafe(canvasOrImageOrBlob);  // { ok: true } | { ok: false, reason: 'porn' | 'sexy', scores }

const VENDOR = new URL('../vendor/', import.meta.url);
// nsfwjs.min.js (4.4.0) 는 TensorFlow.js 4.22.0 을 안에 품은 browserify 묶음이라 tf.min.js 를 따로 불러오지 않는다.
const NSFW_SCRIPT = new URL('nsfwjs/nsfwjs.min.js', VENDOR).href;
const MODEL_URL = new URL('nsfwjs/mobilenet_v2/model.json', VENDOR).href;
const MODEL_SIZE = 224;
const LOAD_WAIT_MS = 20000; // 이보다 오래 걸리면 이번에는 검사 없이 (불러오기는 뒤에서 계속)

// 막는 기준: 포르노 + 헨타이 ≥ 0.7, 또는 선정적(Sexy) ≥ 0.9
export const NSFW_LIMITS = { porn: 0.7, sexy: 0.9 };

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { s.remove(); reject(new Error(`script ${src}`)); };
    document.head.append(s);
  });
}

let modelPromise = null;

// → 모델 | null (불러오지 못함). 한 번 실패하면 이 페이지에서는 다시 받지 않는다.
function loadModel() {
  modelPromise ||= (async () => {
    if (!window.nsfwjs) await loadScript(NSFW_SCRIPT);
    if (!window.nsfwjs) throw new Error('nsfwjs');
    return window.nsfwjs.load(MODEL_URL, { size: MODEL_SIZE });
  })().catch(err => {
    console.warn('nsfw model', err);
    return null;
  });
  return modelPromise;
}

// 파일 고르기 창을 열 때 미리 불러 둔다
export function preloadImageCheck() {
  loadModel();
}

// Blob·ImageBitmap 은 canvas 로 바꿔 넘긴다 (img·canvas 는 그대로)
async function toDrawable(input) {
  if (input instanceof HTMLCanvasElement || input instanceof HTMLImageElement) return input;
  let src = input;
  if (input instanceof Blob) src = await createImageBitmap(input);
  const w = src.width, h = src.height;
  const scale = Math.min(1, (MODEL_SIZE * 2) / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  if (src !== input) src.close?.();
  return c;
}

// 점수 { Porn, Hentai, Sexy, Drawing, Neutral } → 막을 이유 | null
export function nsfwReason(scores) {
  if ((scores.Porn || 0) + (scores.Hentai || 0) >= NSFW_LIMITS.porn) return 'porn';
  if ((scores.Sexy || 0) >= NSFW_LIMITS.sexy) return 'sexy';
  return null;
}

export async function checkImageSafe(input) {
  try {
    const model = await Promise.race([loadModel(), new Promise(r => setTimeout(() => r(null), LOAD_WAIT_MS))]);
    if (!model) return { ok: true };
    const predictions = await model.classify(await toDrawable(input));
    const scores = Object.fromEntries(predictions.map(p => [p.className, p.probability]));
    const reason = nsfwReason(scores);
    return reason ? { ok: false, reason, scores } : { ok: true };
  } catch (err) {
    console.warn('nsfw check', err);
    return { ok: true };
  }
}
