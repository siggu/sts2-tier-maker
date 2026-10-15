-- 사이트 전체 사용량 (비용·용량 보호). key → n
--   'img_bytes'           지금까지 저장한 이미지 바이트 합 (D1 한 개 용량 한도를 넘지 않게)
--   'img_day:YYYY-MM-DD'  그날 새로 저장한 이미지 수 (UTC)
--   'ai_day:YYYY-MM-DD'   그날 Workers AI 검열을 부른 수 (무료 사용량을 넘지 않게)
CREATE TABLE usage_counters (
  key  TEXT    PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);
INSERT INTO usage_counters (key, n) SELECT 'img_bytes', COALESCE(SUM(size), 0) FROM images;
