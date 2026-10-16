-- 댓글에 답글(대댓글). 한 단계만: 답글은 언제나 맨 위 댓글 밑에 달린다.
-- 답글에 답글을 달면 같은 맨 위 댓글 밑에 들어가고, reply_to 에 그 답글 작성자를 적어 화면이 "@이름" 으로 보여 준다.
-- 댓글 수(posts.comments, cups.comments)는 지금처럼 target 의 모든 댓글을 센다 (답글 포함).

ALTER TABLE comments ADD COLUMN parent_id TEXT;   -- NULL = 맨 위 댓글, 아니면 그 맨 위 댓글(comments.id)
ALTER TABLE comments ADD COLUMN reply_to  TEXT;   -- 답글의 답글이면 그 답글 작성자(users.id), 아니면 NULL

-- 한 댓글의 답글을 오래된 순으로
CREATE INDEX comments_parent ON comments (parent_id, created);
