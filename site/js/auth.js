// 구글 로그인 상태. (account 에이전트가 구현)
// 다른 모듈은 아래 함수만 쓴다.

// 로그인한 사용자 { id, name, picture, admin } 또는 null
export function currentUser() { return null; }
// fetch 에 붙일 헤더: 로그인 상태면 { Authorization: 'Bearer …' }, 아니면 {}
export function authHeaders() { return {}; }
// 로그인 상태가 바뀔 때 fn(user) 호출. 해제 함수를 돌려준다.
export function onAuthChange(fn) { return () => {}; } // eslint-disable-line no-unused-vars
// 로그인이 필요한 동작 전에: 로그인 창을 띄우고, 로그인하면 true
export async function requireLogin(reason) { return false; } // eslint-disable-line no-unused-vars
// 로그인 기능이 켜져 있는가 (클라이언트 ID 설정 여부)
export function loginEnabled() { return false; }
