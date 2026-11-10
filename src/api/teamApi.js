// 팀 API (openapi.yaml: 팀 기록 2.1, 2.2, 2.3)
import { getJson } from './client.js';

/**
 * 2.1 팀 시즌 성적 조회
 * GET /api/seasons/{year}/team-stats?sort=
 * sort: wins | losses | runs | homeRuns | stolenBases | avg | ops | runsAllowed | era | whip
 * 응답: TeamStats[] (10개 구단) — 원천 값이 없으면 해당 지표는 null
 */
export function fetchTeamStats(year, sort) {
  return getJson(`/api/seasons/${year}/team-stats`, { sort });
}

/**
 * 2.2 팀 타격 / 2.3 팀 투구 통계 조회
 * GET /api/seasons/{year}/teams/{teamId}/batting-stats?sort=
 * GET /api/seasons/{year}/teams/{teamId}/pitching-stats?sort=
 * 응답: { players: BatterRow[] | PitcherRow[], totals: 팀 합계 | null }
 * 없는 구단이면 404.
 */
export function fetchTeamPlayers(year, teamId, kind, sort) {
  const path = kind === 'pitching' ? 'pitching-stats' : 'batting-stats';
  return getJson(`/api/seasons/${year}/teams/${encodeURIComponent(teamId)}/${path}`, { sort });
}
