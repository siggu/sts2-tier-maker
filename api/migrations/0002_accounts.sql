-- 구글 로그인 계정, 세션, 티어표 동기화, 갤러리(공개 티어표), 댓글, 신고.
-- 이메일은 저장하지 않는다. 시각은 모두 ms (Date.now()).

CREATE TABLE users (
  id          TEXT    PRIMARY KEY,          -- 무작위 16바이트 hex
  google_sub  TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,             -- 보이는 이름 (본인이 바꿀 수 있음)
  picture     TEXT,
  created     INTEGER NOT NULL
);

-- 토큰 원문은 저장하지 않고 해시만 둔다 (DB 가 새도 세션을 쓸 수 없게).
CREATE TABLE sessions (
  token_hash  TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL,
  created     INTEGER NOT NULL,
  expires     INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires ON sessions (expires);

CREATE TABLE user_tiers (
  user_id     TEXT    NOT NULL,
  template    TEXT    NOT NULL,
  state       TEXT    NOT NULL,             -- JSON (≤ 24KB)
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, template)
);

CREATE TABLE posts (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL,
  template    TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  state       TEXT    NOT NULL,
  created     INTEGER NOT NULL,
  likes       INTEGER NOT NULL DEFAULT 0,
  dislikes    INTEGER NOT NULL DEFAULT 0,
  comments    INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0
);
-- 목록: 최신순·인기순(likes - dislikes), 템플릿별·전체·작성자별
CREATE INDEX posts_template_new ON posts (template, created);
CREATE INDEX posts_template_top ON posts (template, (likes - dislikes), created);
CREATE INDEX posts_new ON posts (created);
CREATE INDEX posts_top ON posts ((likes - dislikes), created);
CREATE INDEX posts_user ON posts (user_id, created);

CREATE TABLE reactions (
  post_id     TEXT    NOT NULL,
  user_id     TEXT    NOT NULL,
  v           INTEGER NOT NULL,             -- 1 좋아요, -1 싫어요
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE comments (
  id          TEXT    PRIMARY KEY,
  target      TEXT    NOT NULL,             -- 'post:<postId>' 또는 'item:<카테고리/아이템id>'
  user_id     TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  created     INTEGER NOT NULL,
  likes       INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0,
  deleted     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX comments_target ON comments (target, created);
CREATE INDEX comments_user ON comments (user_id, created);

CREATE TABLE comment_likes (
  comment_id  TEXT    NOT NULL,
  user_id     TEXT    NOT NULL,
  PRIMARY KEY (comment_id, user_id)
);

-- 한 사람이 같은 대상을 한 번만 신고할 수 있다. 3건이면 대상이 숨겨진다.
CREATE TABLE reports (
  kind        TEXT    NOT NULL,             -- 'post' | 'comment'
  target_id   TEXT    NOT NULL,
  user_id     TEXT    NOT NULL,
  reason      TEXT,
  created     INTEGER NOT NULL,
  PRIMARY KEY (kind, target_id, user_id)
);
