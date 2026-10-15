-- 올린 이미지 검열: 상태, 신고 수, AI 판정, 관리자 검토, 차단 목록.
-- status: 'ok'(AI 가 괜찮다고 봄·관리자 승인) | 'pending'(AI 판정 없음 — 보이지만 관리자 검토 목록에 뜬다)
--         | 'hidden'(신고 3건·관리자가 숨김) | 'blocked'(관리자가 차단, 같은 파일은 다시 올릴 수 없다)
-- /img/:id 는 ok·pending 만 보낸다. 이미 있는 이미지는 'ok'.
-- 신고는 reports 표에 kind = 'image', target_id = images.id 로 들어간다.

ALTER TABLE images ADD COLUMN status      TEXT    NOT NULL DEFAULT 'ok';
ALTER TABLE images ADD COLUMN reports     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE images ADD COLUMN ai          TEXT;                          -- 모델 판정 짧게 (예: 'llama-3.2-11b-vision-instruct: SAFE', 'timeout')
ALTER TABLE images ADD COLUMN purpose     TEXT    NOT NULL DEFAULT 'cup'; -- 어디에 쓰려고 올렸나 ('cup', 나중에 'avatar')
ALTER TABLE images ADD COLUMN reviewed_by TEXT;                          -- 검토한 관리자 users.id
ALTER TABLE images ADD COLUMN reviewed_at INTEGER;
CREATE INDEX images_status ON images (status, created);

-- 다시 올릴 수 없는 이미지: AI 가 부적절하다고 본 것(바이트는 저장하지 않는다)과 관리자가 차단한 것.
-- hash = images.id 와 같은 값 (정리한 바이트의 sha256 앞 32자리 hex).
CREATE TABLE image_blocklist (
  hash     TEXT    PRIMARY KEY,
  created  INTEGER NOT NULL,
  reason   TEXT
);
