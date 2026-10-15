// 월드컵 한 판의 대진 검사와 대진 크기를 반영한 수치 (게임 월드컵 /versus/tournament, 사용자 월드컵 /cups/:id/play 공용).
//
// 대진: 출전 n개, P = n 이하의 가장 큰 2의 거듭제곱, k = n − P.
//   k > 0 이면 먼저 예선 k경기(서로 다른 2k개 항목)를 치르고, 나머지 P − k 개는 부전승으로 P강에 오른다.
//   그다음 P강 … 결승. 경기는 모두 n − 1 개이고, 한 판 = 라운드 R = log2(P) + (k > 0 ? 1 : 0) 개.
// matches 는 [이긴 id, 진 id] 를 치른 순서대로: 앞의 k개가 예선, 그 뒤 P/2, P/4, …, 1 경기씩 라운드.
// 화면(site/js/bracket.js)이 이 순서대로 경기를 치르게 한다.
//
// 수치 (항목마다, 판이 끝날 때 서버가 직접 계산한다 — 화면이 보낸 수를 믿지 않는다):
//   expected += 1/n          운으로 기대되는 우승 횟수. 우승 지수 = 우승 ÷ expected (1.0 = 보통).
//   progress += 이긴 라운드 ÷ R   부전승은 예선 라운드를 이긴 것으로 친다. 우승 = 1, 첫 경기에서 지면 0.
//                            평균 진출도 = progress ÷ 판 수(tracked).

export const MIN_ENTRANTS = 2;
export const MAX_ENTRANTS = 512;

// n 개 출전 → { P, prelims: k, byes: P − k, rounds: R }
export function bracketPlan(n) {
  let P = 1;
  while (P * 2 <= n) P *= 2;
  const prelims = n - P;
  return { P, prelims, byes: P - prelims, rounds: Math.log2(P) + (prelims > 0 ? 1 : 0) };
}

// entrants·matches 검사. isItem(id) = 그 월드컵(카테고리)의 항목인가, max = 출전 수 상한.
// 틀리면 { reason, index? } (index = 문제 경기 위치, 0부터), 맞으면 null.
//   entrants   배열이 아니거나 2개 미만·max 초과
//   item       문자열이 아니거나 없는 항목
//   duplicate  같은 항목이 두 번
//   matches    배열이 아니거나 n − 1 개가 아님
//   match      [이긴 id, 진 id] 모양이 아니거나, 출전하지 않은 항목, 같은 항목끼리, 이미 진 항목이 다시 나옴
//   prelim     예선(앞의 n − P 경기)에 같은 항목이 두 번 나옴
//   round      본선 한 라운드에 같은 항목이 두 번 나옴 (= 라운드를 건너뛴 항목이 있음)
//   champion   champion 이 마지막 경기의 승자가 아님
export function checkBracket({ entrants, matches, champion }, isItem, max) {
  if (!Array.isArray(entrants) || entrants.length < MIN_ENTRANTS || entrants.length > max) return { reason: 'entrants' };
  if (!entrants.every(id => typeof id === 'string' && isItem(id))) return { reason: 'item' };
  const n = entrants.length;
  const alive = new Set(entrants);
  if (alive.size !== n) return { reason: 'duplicate' };
  if (!Array.isArray(matches) || matches.length !== n - 1) return { reason: 'matches' };

  const { P, prelims } = bracketPlan(n);
  let i = 0;
  // 한 라운드: count 경기, 그 라운드 안에서 같은 항목은 한 번만
  const round = (count, reason) => {
    const seen = new Set();
    for (const end = i + count; i < end; i++) {
      const m = matches[i];
      if (!Array.isArray(m) || m.length !== 2) return { reason: 'match', index: i };
      const [w, l] = m;
      if (w === l || !alive.has(w) || !alive.has(l)) return { reason: 'match', index: i };
      if (seen.has(w) || seen.has(l)) return { reason, index: i };
      seen.add(w).add(l);
      alive.delete(l);
    }
    return null;
  };
  let bad = round(prelims, 'prelim');
  for (let size = P; !bad && size > 1; size /= 2) bad = round(size / 2, 'round');
  if (bad) return bad;
  if (typeof champion !== 'string' || champion !== matches[n - 2][0]) return { reason: 'champion' };
  return null;
}

// 검사를 통과한 판 → { 항목id: { w: 이긴 경기, l: 진 경기, p: 진출도(0–1) } }, expected = 1/n
export function bracketStats(entrants, matches) {
  const n = entrants.length;
  const { prelims, rounds } = bracketPlan(n);
  const out = Object.fromEntries(entrants.map(id => [id, { w: 0, l: 0, p: 0 }]));
  const inPrelim = new Set(matches.slice(0, prelims).flat());
  for (const [w, l] of matches) { out[w].w++; out[l].l++; }
  for (const id of entrants) {
    const bye = prelims > 0 && !inPrelim.has(id) ? 1 : 0;
    out[id].p = (out[id].w + bye) / rounds;
  }
  return { expected: 1 / n, items: out };
}
