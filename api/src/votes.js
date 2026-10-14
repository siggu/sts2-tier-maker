// 1 = 너프 필요(사기), 2 = 적당, 3 = 버프 필요(약함)
export const VOTE_VALUES = { nerf: 1, fair: 2, buff: 3 };
export const MAX_VOTES_PER_REQUEST = 300;

// keys: ['카테고리/아이템id', ...]
export function makeValidator(keys) {
  const validKeys = new Set(keys);
  const categories = new Set(keys.map(k => k.split('/')[0]));

  // body: { voter: string, votes: [{ item: '카테고리/id', v: 'nerf' | 'fair' | 'buff' | null }] }
  // v 가 null 이면 그 아이템에 대한 내 표를 지운다.
  function validateBody(body) {
    if (!body || typeof body !== 'object') return 'body';
    if (typeof body.voter !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(body.voter)) return 'voter';
    if (!Array.isArray(body.votes) || body.votes.length === 0 || body.votes.length > MAX_VOTES_PER_REQUEST) return 'votes';
    for (const vote of body.votes) {
      if (!vote || !validKeys.has(vote.item)) return 'item';
      if (vote.v !== null && !Object.hasOwn(VOTE_VALUES, vote.v)) return 'v';
    }
    return null;
  }

  return { validKeys, categories, validateBody };
}
