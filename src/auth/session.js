// ------------------------------------------------------------
// 로그인 정보 보관소.
//
// 로그인 여부는 백엔드 세션 쿠키가 기준이다. 프론트가 보관하는 값은 두 가지뿐이다.
//   - CSRF 토큰: /api/admin/session·login 응답으로 받아 메모리에만 둔다. POST·PATCH 요청 헤더에 붙인다.
//   - 화면 표시용 아이디: 백엔드 세션 응답에 아이디가 없어서 로그인할 때 입력한 값을 sessionStorage 에 둔다.
// 실제 권한 확인은 백엔드가 요청마다 세션과 CSRF 토큰으로 한다.
// ------------------------------------------------------------
const KEY = 'fullcount.adminName';

let csrfToken = null;

export function getCsrfToken() {
  return csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token;
}

export function loadAdminName() {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveAdminName(name) {
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    // 저장할 수 없는 환경이면 표시용 이름만 기본값으로 보인다
  }
}

export function clearAdminName() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
