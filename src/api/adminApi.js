// ------------------------------------------------------------
// 관리자 API (openapi.yaml: 관리자 5.3, 5.4)
// 관리자 로그인 세션 쿠키와 'X-CSRF-Token' 헤더가 함께 전달된다 (client.js).
// 권한이 없으면 403, 검증 실패면 400 { message: "타수는 타석 이하여야 합니다." } 처럼 이유가 돌아온다.
// ------------------------------------------------------------
import { sendJson } from './client.js';

/**
 * 5.4 선수 등록
 * POST /api/admin/players
 * 본문: { playerId*, playerName*, birthDate, heightCm, weightKg, throwHand(R|L), batHand(R|L|S) }
 * 응답 201: Player / 400 입력 오류 / 409 이미 등록된 선수 ID
 */
export function createPlayer(values) {
  return sendJson('POST', '/api/admin/players', values);
}

/**
 * 5.4 선수 기본 정보 수정 (선수 ID는 바꿀 수 없음)
 * PATCH /api/admin/players/{playerId}
 * 본문: 바꿀 항목만 { birthDate: '2000-01-01' } 처럼 보낸다. null 을 보내면 값을 비운다.
 */
export function updatePlayer(playerId, changes) {
  return sendJson('PATCH', `/api/admin/players/${encodeURIComponent(playerId)}`, changes);
}

/**
 * 5.3 타자·투수 시즌 기록 수정
 * PATCH /api/admin/players/{playerId}/batting-stats/{year}
 * PATCH /api/admin/players/{playerId}/pitching-stats/{year}
 * 본문: 바꿀 누적 기록만 { homeRuns: 22 }. 서버가 기존 기록에 반영한 결과를 검증하고,
 *       실패하면 저장하지 않고 400 과 이유를 돌려준다.
 * 응답 200: 비율(타율·ERA 등)을 다시 계산한 BatterRow / PitcherRow
 */
export function updateSeasonRecord(playerId, type, year, changes) {
  const kind = type === 'pitcher' ? 'pitching-stats' : 'batting-stats';
  return sendJson('PATCH', `/api/admin/players/${encodeURIComponent(playerId)}/${kind}/${year}`, changes);
}

/**
 * SQL 시연 — 시연용 SQLite 복제본에서 SQL 한 문장 실행
 * POST /api/admin/sql-preview   본문 { sql } (UTF-8 기준 8KB 이하)
 * 응답 200: { columns: [...], rows: [[...], ...] (최대 100행), affectedRows: 숫자 | null, truncated: boolean }
 * 요청마다 같은 스냅샷을 메모리에 복제해서 실행하므로 UPDATE 등 변경은 요청이 끝나면 버려진다. (실제 서비스 DB에는 반영 안 됨)
 * 오류: 400 입력 오류, 401·403 권한, 408 시간 초과(2초), 422 문법 오류·허용되지 않는 문장·제약조건 위반,
 *       502·503 SQL 시연 서비스 연결 문제. 모두 { message } 로 이유가 온다.
 */
export function runSqlPreview(sql) {
  return sendJson('POST', '/api/admin/sql-preview', { sql });
}
