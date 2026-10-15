-- 프로필 사진. 'face:<캐릭터>' (기본 얼굴 5종: ironclad, silent, regent, necrobinder, defect) | 'img:<images.id>' (올린 사진) | NULL.
-- NULL 이면 사용자 id 로 정한 얼굴 하나를 보여 준다 (auth.js avatarOf). 구글 사진(picture)은 더 이상 밖으로 내보내지 않는다.
ALTER TABLE users ADD COLUMN avatar TEXT;
