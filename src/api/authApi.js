// ------------------------------------------------------------
// 로그인 API (백엔드에 제안한 형식 — openapi.yaml 에는 아직 없음)
//
// POST /api/auth/login   { loginId, password } → { token, loginId, role }   실패 401
// GET  /api/auth/me      (Authorization: Bearer 토큰) → { loginId, role }    토큰이 없거나 만료 401
// POST /api/auth/logout  (Authorization: Bearer 토큰) → 204
//
// 백엔드는 토큰으로 login_session·app_user 테이블을 조회해 role 을 읽고,
// 관리자 API 는 role 이 ADMIN 이 아니면 403 을 돌려준다.
// ------------------------------------------------------------
import { getJson, sendJson } from './client.js';

export function login(loginId, password) {
  return sendJson('POST', '/api/auth/login', { loginId, password });
}

export function fetchMe() {
  return getJson('/api/auth/me');
}

export function logout() {
  return sendJson('POST', '/api/auth/logout', {});
}
