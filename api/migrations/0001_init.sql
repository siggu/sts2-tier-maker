-- 사람(voter)마다 아이템 하나에 표 하나. 다시 투표하면 덮어쓴다.
-- v: 1 = 너프 필요(사기), 2 = 적당, 3 = 버프 필요(약함)
CREATE TABLE balance_votes (
  item     TEXT    NOT NULL,   -- '카테고리/아이템id'
  voter    TEXT    NOT NULL,   -- 브라우저에 저장된 익명 id
  ip_hash  TEXT    NOT NULL,
  v        INTEGER NOT NULL,
  ts       INTEGER NOT NULL,
  PRIMARY KEY (item, voter)
);
CREATE INDEX balance_votes_ip ON balance_votes (ip_hash, item);

CREATE TABLE rate_limit (
  ip_hash  TEXT    NOT NULL,
  minute   INTEGER NOT NULL,
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, minute)
);
