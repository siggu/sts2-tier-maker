// 1 = 너프 필요(사기), 2 = 적당, 3 = 버프 필요(약함)
export const VOTE_VALUES = { nerf: 1, fair: 2, buff: 3 };
export const MAX_VOTES_PER_REQUEST = 300;

// 브라우저가 만든 익명 voter id. 'u_' 로 시작하는 id 는 로그인 계정 표('u_' + users.id) 자리라
// 익명으로는 받지 않는다 (남의 계정 표를 덮어쓰지 못하게).
export function isAnonVoter(voter) {
  return typeof voter === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(voter) && !voter.startsWith('u_');
}

// keys: ['카테고리/아이템id', ...]
export function makeValidator(keys) {
  const validKeys = new Set(keys);
  const categories = new Set(keys.map(k => k.split('/')[0]));

  // body: { voter: string, votes: [{ item: '카테고리/id', v: 'nerf' | 'fair' | 'buff' | null }] }
  // v 가 null 이면 그 아이템에 대한 내 표를 지운다. 로그인 상태면(voterOptional) voter 는 보지 않는다.
  function validateBody(body, { voterOptional = false } = {}) {
    if (!body || typeof body !== 'object') return 'body';
    if (!voterOptional && !isAnonVoter(body.voter)) return 'voter';
    if (!Array.isArray(body.votes) || body.votes.length === 0 || body.votes.length > MAX_VOTES_PER_REQUEST) return 'votes';
    for (const vote of body.votes) {
      if (!vote || !validKeys.has(vote.item)) return 'item';
      if (vote.v !== null && !Object.hasOwn(VOTE_VALUES, vote.v)) return 'v';
    }
    return null;
  }

  return { validKeys, categories, validateBody };
}
