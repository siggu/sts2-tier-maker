-- 갤러리 글 종류: 'tier'(티어표) 또는 'balance'(밸런스 투표). 기존 글은 모두 티어표.
ALTER TABLE posts ADD COLUMN kind TEXT NOT NULL DEFAULT 'tier';
CREATE INDEX posts_kind_template_created ON posts (kind, template, created);

-- 월드컵(토너먼트): 항목마다 우승 횟수와 출전 횟수. 우승률 = champ / entries.
CREATE TABLE worldcup_stats (
  category TEXT    NOT NULL,
  item     TEXT    NOT NULL,
  champ    INTEGER NOT NULL DEFAULT 0,
  entries  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category, item)
);
