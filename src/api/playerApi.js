// 선수 API (openapi.yaml: 선수 기록 1.1, 1.4 / 선수 비교 및 분석 4.1)
import { getJson, ApiError } from './client.js';
import { fetchSeasonStats } from './statsApi.js';
import { COMPARE_METRICS, RATE_METRICS, LOWER_IS_BETTER } from '../constants/stats.js';

/**
 * 1.1 선수 검색
 * GET /api/players?name=김&season=&teamId=&position=
 * 응답: PlayerSeason[]  (선수 × 시즌마다 한 줄. 일치하는 선수가 없으면 [])
 */
export function searchPlayers(name, { season, teamId, position } = {}) {
  return getJson('/api/players', { name, season, teamId, position });
}

/**
 * PlayerSeason[] 를 선수 단위로 묶는다. (검색 결과·선수 선택 목록에서 사용)
 * 돌려주는 형식: [{ playerId, playerName, birthDate, type, positions, latest, teams: [{ teamName, from, to }] }]
 */
export function groupBySeasonPlayer(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.playerId)) {
      map.set(row.playerId, { ...row, seasons: [] });
    }
    map.get(row.playerId).seasons.push(row);
  });

  return [...map.values()].map((player) => {
    const seasons = [...player.seasons].sort((a, b) => a.season - b.season);
    const latest = seasons[seasons.length - 1];
    const positions = [...new Set(seasons.map((s) => s.position).filter(Boolean))];

    // 연속된 시즌의 같은 팀은 한 구간으로 묶는다: KIA 2018~2022, LG 2023~2025
    // 같은 구단이라도 표시명이 바뀌면 구간을 나눈다: 넥센 2015~2018, 키움 2019~2022
    const teams = [];
    seasons.forEach((s) => {
      const last = teams[teams.length - 1];
      if (last && last.teamId === s.teamId && last.teamName === s.teamName && last.to === s.season - 1) last.to = s.season;
      else teams.push({ teamId: s.teamId, teamName: s.teamName, from: s.season, to: s.season });
    });

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      birthDate: player.birthDate,
      // 투수 포지션(P)으로 뛴 기록만 있으면 투수, 아니면 타자로 본다
      type: positions.length > 0 && positions.every((p) => p === 'P') ? 'pitcher' : 'batter',
      positions,
      latest,
      teams,
    };
  });
}

/**
 * 1.4 선수 연도별 추이 조회
 * GET /api/players/{playerId}/season-stats?type=batter|pitcher
 * 응답: { player, type, seasons: BatterRow[] | PitcherRow[] (연도 오름차순), career }
 * 해당 유형 기록이 없으면 seasons 는 [], career 는 null. 없는 선수면 404.
 */
export function fetchPlayerSeasonStats(playerId, type) {
  return getJson(`/api/players/${encodeURIComponent(playerId)}/season-stats`, { type });
}

/**
 * 4.1 선수 2인 비교
 * GET /api/players/compare?playerA=&playerB=&type=&season=
 * season 을 비우면 2015년 이후 통산 비교.
 * 응답: { type, season, playerA: { playerId, playerName, hasRecord }, playerB, metrics: [{ key, playerA, playerB, better }] }
 * 400: 잘못된 입력, 같은 선수 선택, 비교 유형 불일치 / 404: 없는 선수
 */
export function comparePlayers({ playerA, playerB, type, season }) {
  return getJson('/api/players/compare', { playerA, playerB, type, season });
}

/**
 * 시즌 비교 레이더 차트의 기준값: 항목별 그 시즌 1위 기록
 * 비교 항목마다 시즌 기록 API를 정렬해서 부르고 맨 앞 선수의 값을 쓴다.
 *   예) GET /api/seasons/2024/batting-stats?sort=homeRuns → 첫 줄의 homeRuns = 그 시즌 최다 홈런
 *   비율 기록(타율·OPS·ERA·WHIP)은 qualified=true 로 규정 충족 선수 중 1위만 본다.
 * 돌려주는 형식: { avg: 0.36, homeRuns: 46, ... }  (기록이 없으면 null)
 */
export async function fetchSeasonBests(season, type) {
  const kind = type === 'pitcher' ? 'pitching' : 'batting';
  const entries = await Promise.all(
    COMPARE_METRICS[type].map(async (key) => {
      const rows = await fetchSeasonStats(season, kind, {
        sort: key,
        qualified: RATE_METRICS.includes(key) ? true : undefined,
      });
      const best = rows.find((row) => row[key] != null);
      return [key, best ? best[key] : null];
    })
  );
  return Object.fromEntries(entries);
}

// 두 값 중 어느 쪽이 나은지: 'A' | 'B' | 'tie' | null(한쪽이라도 기록 없음)
export function betterOf(key, valueA, valueB) {
  if (valueA == null || valueB == null) return null;
  if (valueA === valueB) return 'tie';
  const aWins = LOWER_IS_BETTER.includes(key) ? valueA < valueB : valueA > valueB;
  return aWins ? 'A' : 'B';
}

/**
 * 선수마다 다른 시즌으로 비교 (예: 2025 김도영 vs 2015 이승엽). season 이 null 이면 통산(2015년 이후).
 * - 두 선수의 시즌이 같으면 (둘 다 통산 포함) → 백엔드 비교 API(4.1)를 그대로 쓴다
 * - 시즌이 다르면 → 선수별 연도별 기록 API(1.4)를 두 번 불러, 고른 시즌(또는 통산) 기록을 꺼내 비교한다
 *   (백엔드 비교 API는 시즌을 하나만 받기 때문)
 * 돌려주는 형식: 비교 API 응답과 같고 seasonA, seasonB 가 추가된다.
 */
export async function compareSeasons({ playerA, playerB, type, seasonA, seasonB }) {
  if (seasonA === seasonB) {
    const result = await comparePlayers({ playerA, playerB, type, season: seasonA });
    return { ...result, seasonA, seasonB };
  }

  const [statsA, statsB] = await Promise.all([
    fetchPlayerSeasonStats(playerA, type),
    fetchPlayerSeasonStats(playerB, type),
  ]);
  if (statsA.seasons.length === 0 || statsB.seasons.length === 0) {
    throw new ApiError(400, '같은 기록 유형의 선수를 선택해 주세요.');
  }

  // 시즌을 고르면 그 시즌 한 줄, 통산이면 career (한 선수의 한 시즌 기록은 DB에 한 줄)
  const pick = (stats, season) => (season == null ? stats.career : stats.seasons.find((s) => s.season === season) ?? null);
  const recordA = pick(statsA, seasonA);
  const recordB = pick(statsB, seasonB);

  const metrics = COMPARE_METRICS[type].map((key) => {
    const valueA = recordA?.[key] ?? null;
    const valueB = recordB?.[key] ?? null;
    return { key, playerA: valueA, playerB: valueB, better: betterOf(key, valueA, valueB) };
  });

  const summary = (stats, record) => ({
    playerId: stats.player.playerId,
    playerName: stats.player.playerName,
    hasRecord: record != null,
  });

  return {
    type,
    season: null,
    seasonA,
    seasonB,
    playerA: summary(statsA, recordA),
    playerB: summary(statsB, recordB),
    metrics,
  };
}
