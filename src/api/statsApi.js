// 시즌 기록·순위 API (openapi.yaml: 선수 기록 1.2, 1.3 / 팀 기록 standings)
import { getJson } from './client.js';

/**
 * 1.2 타자 시즌 기록 조회
 * GET /api/seasons/{year}/batting-stats?teamId=&sort=&qualified=
 * sort: avg | obp | slg | ops | homeRuns | runsBattedIn | stolenBases
 * 비율(avg·obp·slg·ops) 정렬은 규정타석 충족 선수만 반환하며, 이때 qualified=false 면 400.
 * 응답: BatterRow[]
 */
export function fetchBattingStats(year, { sort, teamId, qualified } = {}) {
  return getJson(`/api/seasons/${year}/batting-stats`, { sort, teamId, qualified });
}

/**
 * 1.3 투수 시즌 기록 조회
 * GET /api/seasons/{year}/pitching-stats?teamId=&sort=&qualified=
 * sort: wins | era | strikeouts | saves | whip  (ERA·WHIP 는 낮은 순)
 * 응답: PitcherRow[]  (이닝은 outsPitched ÷ 3 으로 표시)
 */
export function fetchPitchingStats(year, { sort, teamId, qualified } = {}) {
  return getJson(`/api/seasons/${year}/pitching-stats`, { sort, teamId, qualified });
}

// 'batting' | 'pitching' 으로 위 두 함수 중 하나를 고른다
export function fetchSeasonStats(year, kind, options) {
  return kind === 'pitching' ? fetchPitchingStats(year, options) : fetchBattingStats(year, options);
}

/**
 * 시즌별 공식 팀 순위
 * GET /api/seasons/{year}/standings
 * 응답: [{ rank, teamId, teamName, wins, losses, draws, winningPct, asOfDate }]
 *
 * 응답의 rank 는 포스트시즌 결과가 반영된 KBO 최종 순위다. (예: 2015년 1위 두산은 정규시즌 3위)
 * 화면은 정규시즌 순위로 보여 주기로 해서, 여기서 승률 순으로 다시 순위를 매긴다.
 */
export async function fetchStandings(year) {
  const rows = await getJson(`/api/seasons/${year}/standings`);
  return toRegularSeasonStandings(rows);
}

// 승률 = 승 ÷ (승 + 패)  (무승부는 빼고 계산하는 KBO 방식)
function winRate(team) {
  const decided = team.wins + team.losses;
  return decided > 0 ? team.wins / decided : 0;
}

/**
 * 공식 최종 순위 → 정규시즌 순위
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
 * 정렬된 기록 목록에 순위를 붙인다. 값이 같으면 같은 순위.
 * 예) [.350, .340, .340, .330] → 1, 2, 2, 4
 */
export function withRanks(rows, key) {
  let rank = 0;
  return rows.map((row, i) => {
    if (!key || i === 0 || row[key] !== rows[i - 1][key]) rank = i + 1;
    return { ...row, rank };
  });
}
