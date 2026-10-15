-- 월드컵 수치에 대진 크기를 반영한다 (게임 월드컵 worldcup_stats, 사용자 월드컵 cup_items 공통).
-- 4강 우승은 64강 우승보다 훨씬 쉬우므로 우승률(champ / entries)만으로는 비교가 치우친다. 한 판(출전 n개)마다 서버가 계산해 더한다:
--   expected      += 1/n                       운으로 기대되는 우승 횟수 → 우승 지수 = tracked_champ / expected (1.0 = 보통)
--   progress      += 이긴 라운드 / 전체 라운드   부전승은 예선 라운드를 이긴 것으로 친다 → 평균 진출도 = progress / tracked
--   tracked       += 1                         이 수치를 세기 시작한 뒤의 출전 횟수
--   tracked_champ += 우승이면 1                 이 수치를 세기 시작한 뒤의 우승 횟수
-- 이 마이그레이션 전의 판에는 expected·progress 가 없으므로 champ·entries(전체 기간)와 섞지 않고 tracked·tracked_champ 로 나눈다.
ALTER TABLE worldcup_stats ADD COLUMN expected REAL NOT NULL DEFAULT 0;
ALTER TABLE worldcup_stats ADD COLUMN progress REAL NOT NULL DEFAULT 0;
ALTER TABLE worldcup_stats ADD COLUMN tracked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE worldcup_stats ADD COLUMN tracked_champ INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cup_items ADD COLUMN expected REAL NOT NULL DEFAULT 0;
ALTER TABLE cup_items ADD COLUMN progress REAL NOT NULL DEFAULT 0;
ALTER TABLE cup_items ADD COLUMN tracked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cup_items ADD COLUMN tracked_champ INTEGER NOT NULL DEFAULT 0;
