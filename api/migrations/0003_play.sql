-- A vs B 대결. 사람(voter)마다 한 쌍에 표 하나. 다시 내면 덮어쓴다.
-- a, b 는 아이템 id (카테고리 없이). a < b 로 정렬해 저장해서 (x, y) 와 (y, x) 가 같은 쌍이 된다.
CREATE TABLE versus_votes (
  category TEXT    NOT NULL,
  a        TEXT    NOT NULL,
  b        TEXT    NOT NULL,
  voter    TEXT    NOT NULL,   -- 익명 id 또는 'u_' + users.id
  winner   TEXT    NOT NULL,   -- a 또는 b
  ts       INTEGER NOT NULL,
  PRIMARY KEY (category, a, b, voter)
);
-- wins/losses 를 다시 셀 때 아이템별로 찾는다 (a 쪽은 기본 키가 맡는다).
CREATE INDEX versus_votes_b ON versus_votes (category, b);
CREATE INDEX versus_votes_winner ON versus_votes (category, winner);

-- Elo 점수(시작 1500, K = 24). wins/losses 는 versus_votes 에서 센 값.
CREATE TABLE versus_ratings (
  category TEXT    NOT NULL,
  item     TEXT    NOT NULL,
  rating   REAL    NOT NULL DEFAULT 1500,
  wins     INTEGER NOT NULL DEFAULT 0,
  losses   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category, item)
);

-- 모두의 티어표 집계는 묶음별 최신 동기화본부터 정해진 수만 읽는다 (글은 0002 의 posts_template_new).
-- 색인 없이 updated_at 으로 정렬하면 그 묶음의 모든 행(큰 state 포함)을 다 읽게 된다.
CREATE INDEX play_user_tiers_recent ON user_tiers (template, updated_at);
