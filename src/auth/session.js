// ------------------------------------------------------------
// 로그인 정보 보관소. 브라우저 탭을 닫으면 지워지는 sessionStorage 에 저장한다.
// 저장하는 값: { token, loginId, role }  (role: 'ADMIN' | 'USER')
//
// 주의: 여기 저장된 role 은 화면에 메뉴를 보여줄지 정하는 용도일 뿐이다.
// 실제 권한 확인은 백엔드가 요청마다 토큰으로 DB를 조회해서 한다.
// ------------------------------------------------------------
const KEY = 'fullcount.session';

export function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    return saved && saved.token ? saved : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // 저장할 수 없는 환경이면 이번 화면에서만 로그인 상태를 유지한다
  }
  memory = session;
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
  memory = null;
}

let memory = loadSession();

// API 요청에 붙일 토큰 (client.js 에서 사용)
export function getToken() {
  return memory?.token ?? null;
}
