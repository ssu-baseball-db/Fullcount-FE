// ------------------------------------------------------------
// 메인 화면에서 쓰는 API 모음.
// 백엔드 명세: Fullcount-BE 저장소의 src/main/resources/static/openapi.yaml
// (백엔드 실행 후 http://localhost:8080/swagger-ui/index.html 에서도 볼 수 있다)
// ------------------------------------------------------------
import { SEASONS } from '../constants/seasons.js';
import { LEADER_CATEGORIES } from '../constants/stats.js';
import { fetchSeasonStats, withRanks } from './statsApi.js';

export { fetchStandings } from './statsApi.js';

/**
 * 조회 가능한 시즌 목록 (최신순)
 * 명세에 시즌 목록 API가 없어서 상수(2015~2026)를 그대로 돌려준다.
 */
export function fetchSeasons() {
  return Promise.resolve(SEASONS);
}

/**
 * 부문별 상위 선수 (메인 화면용)
 * 명세에 '순위 전용' API가 없어서 시즌 기록 조회 API를 부문마다 정렬해서 부르고 앞의 limit 명만 쓴다.
 *   타자: GET /api/seasons/{year}/batting-stats?sort=avg&qualified=true
 *   투수: GET /api/seasons/{year}/pitching-stats?sort=era&qualified=true
 *
 * 돌려주는 형식: [{ category: 'avg', players: [{ rank, playerId, playerName, teamName, value }] }, ...]
 */
export async function fetchLeaders(year, type, limit = 5) {
  const requests = LEADER_CATEGORIES[type].map(async ({ key, qualified }) => {
    const rows = await fetchSeasonStats(year, type, { sort: key, qualified: qualified || undefined });
    const top = withRanks(
      rows.filter((r) => r[key] != null).slice(0, limit),
      key
    );
    return {
      category: key,
      players: top.map((r) => ({
        rank: r.rank,
        playerId: r.playerId,
        playerName: r.playerName,
        teamName: r.teamName,
        value: r[key],
      })),
    };
  });

  // 4개 부문을 동시에 요청하고 모두 끝날 때까지 기다린다
  return Promise.all(requests);
}
