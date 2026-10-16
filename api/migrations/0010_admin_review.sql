-- 관리자 이미지 검토: 상태와 관계없이 최근 순 전체 목록 (admin.js). 사용자별은 0005 의 images_user 를 쓴다.
CREATE INDEX images_created ON images (created);
