-- 댓글에 답글(대댓글). YouTube 처럼 3단계까지: 맨 위 댓글(1) → 답글(2) → 답글의 답글(3).
-- 3단계 답글에 다시 답글을 달면 더 깊어지지 않고 같은 3단계에 들어가며, reply_to 에 받는 사람을 적어 화면이 "@이름" 으로 보여 준다.
-- 댓글 수(posts.comments, cups.comments)는 지금처럼 target 의 모든 댓글을 센다 (답글 포함).

ALTER TABLE comments ADD COLUMN parent_id TEXT;   -- NULL = 맨 위 댓글, 아니면 그 스레드의 맨 위 댓글(comments.id)
ALTER TABLE comments ADD COLUMN under_id  TEXT;   -- 3단계 답글이면 그 위의 2단계 답글(comments.id), 아니면 NULL
ALTER TABLE comments ADD COLUMN reply_to  TEXT;   -- 3단계 답글에 단 답글이면 그 답글 작성자(users.id) — "@이름", 아니면 NULL

-- 한 스레드의 답글을 오래된 순으로, 2단계 답글 밑의 답글
CREATE INDEX comments_parent ON comments (parent_id, created);
CREATE INDEX comments_under ON comments (under_id);
