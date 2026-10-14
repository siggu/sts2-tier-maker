-- 사용자 월드컵(이상형 월드컵): 로그인한 사람이 만든 월드컵, 항목, 좋아요, 올린 이미지.
-- 이미지 참조(cover, img)는 'img:<images.id>' (올린 이미지), 'game:<카테고리>/<아이템id>' (게임 이미지), 또는 NULL.
-- 댓글은 기존 comments 표에 target = 'cup:<cups.id>' 로, 신고는 reports 표에 kind = 'cup' 으로 들어간다.

CREATE TABLE cups (
  id          TEXT    PRIMARY KEY,           -- 무작위 12바이트 hex
  user_id     TEXT    NOT NULL,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  cover       TEXT,
  item_count  INTEGER NOT NULL,
  sample      TEXT    NOT NULL DEFAULT '[]', -- 목록 미리보기용 항목 이미지 참조 최대 4개 (JSON, 이미지 있는 항목 먼저)
  plays       INTEGER NOT NULL DEFAULT 0,
  likes       INTEGER NOT NULL DEFAULT 0,
  comments    INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0,
  created     INTEGER NOT NULL
);
-- 목록: 최신순(created, id), 인기순(likes, plays, created, id), 작성자별
CREATE INDEX cups_new ON cups (created, id);
CREATE INDEX cups_top ON cups (likes, plays, created, id);
CREATE INDEX cups_user ON cups (user_id, created, id);

-- 항목 id 는 서버가 순서대로 'i1'…'iN' 으로 붙인다. 우승률 = champ / entries.
CREATE TABLE cup_items (
  cup_id   TEXT    NOT NULL,
  id       TEXT    NOT NULL,
  pos      INTEGER NOT NULL,                -- 1부터 (화면 순서)
  name     TEXT    NOT NULL,
  img      TEXT,
  champ    INTEGER NOT NULL DEFAULT 0,
  entries  INTEGER NOT NULL DEFAULT 0,
  wins     INTEGER NOT NULL DEFAULT 0,
  losses   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cup_id, id)
);

CREATE TABLE cup_likes (
  cup_id   TEXT    NOT NULL,
  user_id  TEXT    NOT NULL,
  PRIMARY KEY (cup_id, user_id)
);

-- 올린 이미지. id = sha256(bytes) 앞 32자리 hex 라 같은 파일은 한 번만 저장된다.
-- 월드컵을 지워도 이미지는 남긴다 (다른 월드컵이 같은 이미지를 쓸 수 있다).
CREATE TABLE images (
  id       TEXT    PRIMARY KEY,
  user_id  TEXT    NOT NULL,               -- 처음 올린 사람
  type     TEXT    NOT NULL,               -- image/webp | image/jpeg | image/png
  bytes    BLOB    NOT NULL,
  size     INTEGER NOT NULL,
  created  INTEGER NOT NULL
);
CREATE INDEX images_user ON images (user_id, created);
