// ------------------------------------------------------------
// 관리자 로그인 API (Fullcount-BE openapi.yaml: 관리자)
//
// GET  /api/admin/session  → { authenticated, csrfToken }
// POST /api/admin/login    헤더 X-CSRF-Token, 본문 { username, password }
//                          → 200 { authenticated, csrfToken } (세션 쿠키 발급, CSRF 토큰 새로 발급)
//                          → 401 계정 불일치, 403 CSRF 검증 실패
// POST /api/admin/logout   헤더 X-CSRF-Token → 204 (세션 폐기)
//
// 로그인 상태는 백엔드 세션 쿠키로 유지된다. 프론트는 쿠키를 직접 다루지 않고,
// 응답으로 받은 CSRF 토큰만 기억해 두었다가 POST·PATCH 요청 헤더에 붙인다 (client.js).
// ------------------------------------------------------------
import { getJson, sendJson } from './client.js';
import { setCsrfToken } from '../auth/session.js';

function remember(result) {
  setCsrfToken(result?.csrfToken ?? null);
  return result;
}

// 현재 로그인 상태를 묻고 CSRF 토큰을 받아 둔다 (로그인 전에도 먼저 호출해야 한다)
export async function fetchSession() {
  return remember(await getJson('/api/admin/session'));
}

export async function login(username, password) {
  await fetchSession();
  return remember(await sendJson('POST', '/api/admin/login', { username, password }));
}

export async function logout() {
  await sendJson('POST', '/api/admin/logout', {});
  setCsrfToken(null);
}
