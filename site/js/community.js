// 로그인(구글), 투표·티어표 동기화, 티어표 갤러리, 좋아요/싫어요, 댓글, 항목별 댓글.
// app.js 와 detail.js 가 아래 함수들을 부른다. (account 에이전트가 구현)

// 데이터를 읽은 뒤 한 번: 로그인 상태 복원, 서버와 동기화
export async function init(ctx) {} // eslint-disable-line no-unused-vars
// #/gallery 등 이 모듈의 주소면 화면을 그리고 true
export function route(parts, params, ctx) { return false; } // eslint-disable-line no-unused-vars
// 상단 메뉴에 붙일 링크들 (<a>, 활성이면 class 'active')
export function navLinks(parts) { return []; } // eslint-disable-line no-unused-vars
// 상단 오른쪽 (로그인 버튼 / 프로필)
export function topbar(ctx) { return null; } // eslint-disable-line no-unused-vars
// 홈 화면에 넣을 구역들
export function homeBlocks(mode, ctx) { return []; } // eslint-disable-line no-unused-vars
// 티어 메이커 화면의 버튼들 (예: 갤러리에 공개)
export function tierActions(template, state, ctx) { return null; } // eslint-disable-line no-unused-vars
// 상세 창 아래쪽 (항목별 댓글)
export function detailExtras(item, category, db) { return null; } // eslint-disable-line no-unused-vars
