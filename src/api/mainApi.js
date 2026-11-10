// ------------------------------------------------------------
// 메인 화면에서 쓰는 API 모음.
// 백엔드 명세: Fullcount-BE 저장소의 src/main/resources/static/openapi.yaml
// (서버 실행 후 http://localhost:8080/swagger-ui/index.html 에서도 볼 수 있다)
// ------------------------------------------------------------
import { USE_MOCK, getJson, fakeDelay } from './client.js';
import { mockStandings, mockSeasonStats } from '../mock/mainMock.js';
import { SEASONS } from '../constants/seasons.js';
import { LEADER_CATEGORIES } from '../constants/stats.js';

/**
 * 조회 가능한 시즌 목록 (최신순)
 * 명세에 시즌 목록 API가 없어서 상수(2015~2026)를 그대로 돌려준다.
 */
export function fetchSeasons() {
  return Promise.resolve(SEASONS);
}

/**
 * 시즌별 공식 팀 순위
 * GET /api/seasons/{year}/standings
 * 응답: [{ rank, teamId, teamName, wins, losses, draws, winningPct, asOfDate }, ...]
 *
 * 응답의 rank 는 포스트시즌 결과가 반영된 KBO 최종 순위다. (예: 2015년 1위 두산은 정규시즌 3위)
 * 화면은 정규시즌 순위로 보여 주기로 해서, 여기서 승률 순으로 다시 순위를 매긴다.
 * 응답에 경기 수·게임차도 없어서 함께 계산해 붙인다.
 */
export async function fetchStandings(year) {
  const rows = USE_MOCK
    ? await fakeDelay(mockStandings(year))
    : await getJson(`/api/seasons/${year}/standings`);

  return toRegularSeasonStandings(rows);
}

// 승률 = 승 ÷ (승 + 패)  (무승부는 빼고 계산하는 KBO 방식)
function winRate(team) {
  const decided = team.wins + team.losses;
  return decided > 0 ? team.wins / decided : 0;
}

/**
 * 공식 최종 순위 → 정규시즌 순위로 바꾼다.
 * - rank        : 정규시즌 승률 순위. 승률이 같으면 공식 순위가 높은 팀을 앞에 둔다.
 * - officialRank: 원래 공식 최종 순위
 * - isChampion  : 공식 최종 순위 1위 = 한국시리즈 우승 팀
 * - games       : 승 + 패 + 무
 * - gamesBehind : 정규시즌 1위와의 게임차 ((1위 승-패) - (우리 승-패)) ÷ 2
 * 백엔드가 나중에 games·gamesBehind 를 직접 보내 주면 그 값을 그대로 쓴다.
 */
function toRegularSeasonStandings(rows) {
  if (!rows || rows.length === 0) return [];
  const best = Math.max(...rows.map((r) => r.wins - r.losses));

  return [...rows]
    .sort((a, b) => winRate(b) - winRate(a) || a.rank - b.rank)
    .map((r, index) => ({
      ...r,
      rank: index + 1,
      officialRank: r.rank,
      isChampion: r.rank === 1,
      games: r.games ?? r.wins + r.losses + r.draws,
      gamesBehind: r.gamesBehind ?? (best - (r.wins - r.losses)) / 2,
    }));
}

/**
 * 부문별 상위 선수 (메인 화면용)
 * 명세에 '순위 전용' API가 없어서 시즌 기록 조회 API를 부문마다 정렬해서 부르고 앞의 limit 명만 쓴다.
 *   타자: GET /api/seasons/{year}/batting-stats?sort=avg&qualified=true
 *   투수: GET /api/seasons/{year}/pitching-stats?sort=era&qualified=true
 * 응답: BatterRow / PitcherRow 배열 (playerId, playerName, teamId, teamName, avg, homeRuns, ...)
 *
 * 돌려주는 형식: [{ category: 'avg', players: [{ rank, playerId, playerName, teamName, value }] }, ...]
 */
export async function fetchLeaders(year, type, limit = 5) {
  const path = type === 'batting' ? 'batting-stats' : 'pitching-stats';

  const requests = LEADER_CATEGORIES[type].map(async ({ key, qualified }) => {
    const params = { sort: key };
    if (qualified) params.qualified = true;

    const rows = USE_MOCK
      ? await fakeDelay(mockSeasonStats(year, type, key))
      : await getJson(`/api/seasons/${year}/${path}`, params);

    return { category: key, players: toLeaderList(rows, key, limit) };
  });

  // 4개 부문을 동시에 요청하고 모두 끝날 때까지 기다린다
  return Promise.all(requests);
}

// 정렬된 기록 목록 → 상위 limit 명. 기록이 같으면 같은 순위로 표시한다.
function toLeaderList(rows, key, limit) {
  const valid = rows.filter((r) => r[key] != null).slice(0, limit);
  let rank = 0;

  return valid.map((r, i) => {
    if (i === 0 || r[key] !== valid[i - 1][key]) rank = i + 1;
    return {
      rank,
      playerId: r.playerId,
      playerName: r.playerName,
      teamName: r.teamName,
      value: r[key],
    };
  });
}
